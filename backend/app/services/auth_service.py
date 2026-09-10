import logging
from typing import Tuple
try:
    import httpx
except ImportError:
    httpx = None

try:
    from jose import JWTError
except ImportError:
    class JWTError(Exception):
        pass

from app.core.config import settings
from app.exceptions import (
    BadRequestException,
    ForbiddenException,
    NotFoundException,
    UnauthorizedException,
    ValidationException,
)
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import (
    GoogleAuthRequest,
    InstagramAuthRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    UpdateProfileRequest,
)

logger = logging.getLogger("app.services.auth")

_email_otp_store: dict = {}


class AuthService:
    def __init__(self) -> None:
        self.user_repo = UserRepository()

    async def check_email(self, email: str) -> dict:
        """Checks if an email exists in the system and if it has a password."""
        clean_email = email.strip().lower()
        user = await self.user_repo.get_by_email(clean_email)
        if not user:
            return {
                "exists": False,
                "has_password": False,
                "auth_provider": None,
            }
        return {
            "exists": True,
            "has_password": user.password_hash is not None,
            "auth_provider": getattr(user, "auth_provider", "local") or "local",
        }

    async def register(self, data: RegisterRequest) -> Tuple[User, str, str]:
        """Registers a new user, hashes their password, and issues JWT tokens."""
        clean_email = data.email.strip().lower()

        # 0. Check OTP verification
        if not settings.is_test:
            global _email_otp_store
            record = _email_otp_store.get(clean_email)
            if not record or not record.get("verified"):
                raise ValidationException(
                    message="Email has not been verified via OTP. Please verify your email first."
                )

        # 1. Check if email already exists
        existing_email = await self.user_repo.get_by_email(clean_email)
        if existing_email:
            # If user registered via Google (no password_hash), upgrade account by setting password
            if existing_email.password_hash is None:
                if data.phone and data.phone != existing_email.phone:
                    existing_phone = await self.user_repo.get_by_phone(data.phone)
                    if existing_phone and str(existing_phone.id) != str(existing_email.id):
                        raise ValidationException(
                            message=f"An account with phone number '{data.phone}' already exists."
                        )
                
                password_hash = hash_password(data.password)
                full_name = data.full_name or existing_email.full_name or clean_email.split("@")[0].capitalize()
                update_data = {
                    "password_hash": password_hash,
                    "full_name": full_name,
                    "phone": data.phone or existing_email.phone,
                    "is_active": True,
                    "status": "active",
                }
                user = await self.user_repo.update(existing_email, update_data)
                logger.info(f"Upgraded Google user with password credentials: {user.email}")
                
                # Delete OTP record after use
                if clean_email in _email_otp_store:
                    del _email_otp_store[clean_email]
                
                payload = {"sub": str(user.id), "role": user.role}
                access_token = create_access_token(payload)
                refresh_token = create_refresh_token(payload)
                return user, access_token, refresh_token

            raise ValidationException(
                message=f"An account with email '{data.email}' already exists. Please login or use 'Forgot Password' to reset your password."
            )

        # 2. Assert phone is unique
        if data.phone:
            existing_phone = await self.user_repo.get_by_phone(data.phone)
            if existing_phone:
                raise ValidationException(
                    message=f"An account with phone number '{data.phone}' already exists."
                )

        # 3. Create user dictionary
        password_hash = hash_password(data.password)
        full_name = data.full_name or clean_email.split("@")[0].capitalize()
        user_data = {
            "full_name": full_name,
            "email": clean_email,
            "phone": data.phone,
            "password_hash": password_hash,
            "role": "CUSTOMER",  # Default role is Customer
            "is_verified": True, # set to true because OTP verified it
            "is_active": True,
            "status": "active",
        }

        # 4. Insert into DB
        user = await self.user_repo.create(user_data)
        logger.info(f"Successfully registered new user: {user.email} (ID: {user.id})")
        
        # Delete OTP record after use
        if clean_email in _email_otp_store:
            del _email_otp_store[clean_email]

        # 5. Issue access/refresh tokens
        payload = {"sub": str(user.id), "role": user.role}
        access_token = create_access_token(payload)
        refresh_token = create_refresh_token(payload)

        return user, access_token, refresh_token

    async def login(self, data: LoginRequest) -> Tuple[User, str, str]:
        """Authenticates user credentials, validates account status, and issues tokens."""
        clean_email = data.email.strip().lower()
        # 1. Fetch user by email
        user = await self.user_repo.get_by_email(clean_email)
        if not user:
            logger.warning(f"Authentication failed: User not found for email '{clean_email}'")
            raise UnauthorizedException(message="Invalid email or password.")

        # 2. If user registered via Google without a password, provide clear instruction
        if user.password_hash is None:
            logger.warning(f"Authentication failed: User '{clean_email}' has Google account without password")
            raise UnauthorizedException(
                message="This account was registered using Google Sign-In. Please sign in with Google or use 'Forgot Password' to set a password."
            )

        # 3. Verify hashed password
        if not verify_password(data.password, user.password_hash):
            logger.warning(f"Authentication failed: Incorrect password for email '{clean_email}'")
            raise UnauthorizedException(message="Invalid email or password.")

        # 4. Verify user is verified and active
        if not getattr(user, "is_verified", True) and user.role != "ADMIN" and getattr(user, "auth_provider", "local") == "local":
            logger.warning(f"Authentication failed: Email unverified for '{clean_email}'")
            raise UnauthorizedException(
                message="Please verify your email before logging in."
            )

        if not user.is_active or user.status != "active":
            logger.warning(f"Authentication failed: Account deactivated for email '{clean_email}'")
            raise UnauthorizedException(
                message="Your account has been deactivated. Please contact support."
            )


        logger.info(f"User logged in successfully: {user.email}")

        # 5. Issue new tokens
        payload = {"sub": str(user.id), "role": user.role}
        access_token = create_access_token(payload)
        refresh_token = create_refresh_token(payload)

        return user, access_token, refresh_token

    async def google_login(self, data: GoogleAuthRequest) -> Tuple[User, str, str]:
        """Authenticates or auto-registers a user via Google OAuth, and issues JWT tokens."""
        clean_email = data.email.strip().lower()
        user = await self.user_repo.get_by_email(clean_email)

        if user:
            # Existing user - verify active status
            if not user.is_active or user.status != "active":
                raise UnauthorizedException(
                    message="Your account has been deactivated. Please contact support."
                )

            # Optionally update user's avatar or google_id if missing
            update_data = {}
            if not user.avatar_url and data.avatar_url:
                update_data["avatar_url"] = data.avatar_url
            if not getattr(user, "google_id", None) and data.google_id:
                update_data["google_id"] = data.google_id
            if update_data:
                user = await self.user_repo.update(user, update_data)

            logger.info(f"Existing user logged in via Google: {user.email}")
        else:
            # Auto-register new Google user
            full_name = (
                data.full_name.strip()
                if data.full_name and data.full_name.strip()
                else clean_email.split("@")[0].capitalize()
            )
            user_data = {
                "full_name": full_name,
                "email": clean_email,
                "phone": None,
                "password_hash": None,
                "role": "CUSTOMER",
                "is_verified": True,
                "is_active": True,
                "auth_provider": "google",
                "google_id": data.google_id,
                "status": "active",
                "avatar_url": data.avatar_url,
            }
            user = await self.user_repo.create(user_data)
            logger.info(f"New user registered via Google: {user.email} (ID: {user.id})")

        # Issue access/refresh tokens
        payload = {"sub": str(user.id), "role": user.role}
        access_token = create_access_token(payload)
        refresh_token = create_refresh_token(payload)

        return user, access_token, refresh_token

    async def instagram_login(self, data: InstagramAuthRequest) -> Tuple[User, str, str]:
        """Authenticates or auto-registers a user via Meta Instagram OAuth code exchange, issuing JWT tokens."""
        client_id = settings.INSTAGRAM_CLIENT_ID or "2262885951230627"
        client_secret = settings.INSTAGRAM_CLIENT_SECRET or ""

        # 1. Validate redirect_uri securely
        target_redirect_uri = (
            data.redirect_uri
            or settings.INSTAGRAM_REDIRECT_URI
            or "https://cloudcrackerfinalyearproject-1.onrender.com"
        )

        allowed_list = list(settings.ALLOWED_ORIGINS or []) + [
            settings.INSTAGRAM_REDIRECT_URI,
            "https://cloudcrackerfinalyearproject-1.onrender.com",
            "https://cloudcrackerfinalyearproject.onrender.com",
            "http://localhost:3000",
            "http://localhost:8081",
            "http://localhost:5173",
        ]
        is_valid_uri = False
        for allowed in allowed_list:
            if allowed and (
                target_redirect_uri.startswith(allowed)
                or allowed.rstrip('/') in target_redirect_uri
            ):
                is_valid_uri = True
                break

        if not is_valid_uri and settings.ENVIRONMENT != "development":
            raise BadRequestException("Invalid or untrusted redirect_uri provided.")

        clean_user = None
        avatar_url = data.avatar_url
        instagram_id = data.instagram_id

        # 2. Production Code Exchange with Meta Instagram API
        if data.code:
            try:
                async with httpx.AsyncClient(timeout=10.0) as http_client:
                    token_res = await http_client.post(
                        "https://api.instagram.com/oauth/access_token",
                        data={
                            "client_id": client_id,
                            "client_secret": client_secret,
                            "grant_type": "authorization_code",
                            "redirect_uri": target_redirect_uri,
                            "code": data.code,
                        },
                    )

                    if token_res.status_code != 200:
                        err_body = (
                            token_res.json()
                            if token_res.headers.get("content-type", "").startswith(
                                "application/json"
                            )
                            else {}
                        )
                        err_msg = (
                            err_body.get("error_message")
                            or err_body.get("message")
                            or "Failed to exchange Instagram authorization code with Meta."
                        )
                        logger.error(
                            f"Meta Instagram OAuth token exchange error ({token_res.status_code}): {token_res.text}"
                        )
                        raise UnauthorizedException(
                            message=f"Instagram authentication failed: {err_msg}"
                        )

                    token_data = token_res.json()
                    user_id = token_data.get("user_id")
                    meta_access_token = token_data.get("access_token")

                    if meta_access_token and user_id:
                        profile_res = await http_client.get(
                            f"https://graph.instagram.com/me?fields=id,username,account_type&access_token={meta_access_token}"
                        )
                        if profile_res.status_code == 200:
                            profile_data = profile_res.json()
                            clean_user = profile_data.get("username")
                            instagram_id = str(profile_data.get("id", user_id))
                        else:
                            logger.error(
                                f"Meta Instagram profile fetch error: {profile_res.text}"
                            )
                            raise UnauthorizedException(
                                message="Failed to fetch verified Instagram profile data."
                            )
                    else:
                        raise UnauthorizedException(
                            message="Invalid token response received from Instagram."
                        )
            except UnauthorizedException:
                raise
            except Exception as e:
                logger.error(f"Meta Instagram OAuth exception: {e}")
                raise UnauthorizedException(
                    message="Meta Instagram authentication network or API error. Please try again."
                )

        # 3. Handle Development/Mock Fallback
        elif data.username and (settings.ENVIRONMENT == "development" or settings.DEBUG):
            clean_user = data.username.strip().lstrip("@").lower()
        else:
            raise BadRequestException("Authorization code is required for Instagram authentication.")

        if not clean_user:
            raise BadRequestException("Could not retrieve a valid Instagram username.")

        fake_email = f"{clean_user}@instagram.com"
        user = await self.user_repo.get_by_email(fake_email)

        if user:
            if not user.is_active or user.status != "active":
                raise UnauthorizedException(
                    message="Your account has been deactivated. Please contact support."
                )

            update_data = {}
            if not user.avatar_url and avatar_url:
                update_data["avatar_url"] = avatar_url
            if update_data:
                user = await self.user_repo.update(user, update_data)

            logger.info(f"Existing user logged in via Meta Instagram OAuth: {user.email}")
        else:
            full_name = (
                data.full_name.strip()
                if data.full_name and data.full_name.strip()
                else clean_user.capitalize()
            )
            user_data = {
                "full_name": full_name,
                "email": fake_email,
                "phone": None,
                "password_hash": None,
                "role": "CUSTOMER",
                "is_verified": True,
                "is_active": True,
                "auth_provider": "instagram",
                "status": "active",
                "avatar_url": avatar_url
                or f"https://ui-avatars.com/api/?name={clean_user}&background=E1306C&color=fff",
            }
            user = await self.user_repo.create(user_data)
            logger.info(f"New user registered via Meta Instagram OAuth: {user.email} (ID: {user.id})")

        payload = {"sub": str(user.id), "role": user.role}
        access_token = create_access_token(payload)
        refresh_token = create_refresh_token(payload)

        return user, access_token, refresh_token

    async def refresh_tokens(self, refresh_token_str: str) -> Tuple[User, str, str]:
        """Validates refresh token, implements token rotation, and issues new tokens."""
        try:
            # 1. Decode token
            payload = decode_token(refresh_token_str)
            token_type = payload.get("type")

            # 2. Assert token type is 'refresh'
            if token_type != "refresh":
                raise UnauthorizedException(message="Invalid token type.")

            user_id = payload.get("sub")
            if not user_id:
                raise UnauthorizedException(message="Invalid token claims.")

        except JWTError as e:
            logger.warning(f"Failed to decode refresh token: {e}")
            raise UnauthorizedException(message="Refresh token is expired or invalid.")

        # 3. Fetch user
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise UnauthorizedException(message="User not found.")

        # 4. Check active status
        if not user.is_active or user.status != "active":
            raise UnauthorizedException(message="User account is deactivated.")

        # 5. Issue new access and refresh tokens (Rotation)
        new_payload = {"sub": str(user.id), "role": user.role}
        new_access_token = create_access_token(new_payload)
        new_refresh_token = create_refresh_token(new_payload)

        logger.info(f"Successfully rotated tokens for user: {user.email}")
        return user, new_access_token, new_refresh_token

    async def forgot_password(self, email: str) -> str:
        """Stubs password recovery flow by verifying email existence and mock dispatching instructions."""
        clean_email = email.strip().lower()
        user = await self.user_repo.get_by_email(clean_email)
        if not user:
            # For production security, we can return generic success to prevent email enumeration,
            # but user requirements ask to check. So we raise NotFound if not exists.
            raise NotFoundException(
                message=f"No account associated with email '{email}'."
            )

        logger.info(f"Password reset request received for: {email} (Mock email sent)")
        return f"Password reset link has been dispatched to {email}."

    async def reset_password(self, data: ResetPasswordRequest) -> Tuple[User, str, str]:
        """Resets user password, validates account status, hashes new password, and issues JWT tokens."""
        clean_email = data.email.strip().lower()
        
        # 0. Check OTP verification
        if not settings.is_test:
            global _email_otp_store
            record = _email_otp_store.get(clean_email)
            if not record or not record.get("verified"):
                raise ValidationException(
                    message="Email has not been verified via OTP. Please verify your email first."
                )
            
        user = await self.user_repo.get_by_email(clean_email)
        if not user:
            raise NotFoundException(
                message=f"No account associated with email '{data.email}'."
            )

        if not user.is_active or user.status != "active":
            raise UnauthorizedException(
                message="Your account has been deactivated. Please contact support."
            )

        new_password_hash = hash_password(data.password)
        update_data = {
            "password_hash": new_password_hash,
            "is_active": True,
            "status": "active",
        }
        user = await self.user_repo.update(user, update_data)
        logger.info(f"Successfully reset password for user: {user.email}")
        
        # Delete OTP record after use
        if clean_email in _email_otp_store:
            del _email_otp_store[clean_email]

        # Issue access/refresh tokens
        payload = {"sub": str(user.id), "role": user.role}
        access_token = create_access_token(payload)
        refresh_token = create_refresh_token(payload)

        return user, access_token, refresh_token

    async def update_profile(self, user: User, data: UpdateProfileRequest) -> User:
        """Updates user profile information."""
        update_data = {}
        if data.full_name is not None:
            update_data["full_name"] = data.full_name
        if data.phone is not None:
            # Check phone uniqueness if changed
            if data.phone != user.phone:
                existing_phone = await self.user_repo.get_by_phone(data.phone)
                if existing_phone:
                    raise ValidationException(
                        message=f"An account with phone number '{data.phone}' already exists."
                    )
            update_data["phone"] = data.phone
        if data.avatar_base64 is not None:
            # Storing the base64 string directly as requested
            update_data["avatar_url"] = data.avatar_base64
            
        if not update_data:
            return user
            
        return await self.user_repo.update(user, update_data)

    async def send_email_otp(self, email: str, is_reset: bool = False) -> dict:
        clean_email = email.strip().lower()
        existing = await self.user_repo.get_by_email(clean_email)
        
        if is_reset:
            if not existing:
                raise NotFoundException(message=f"No account associated with email '{email}'.")
            if existing.password_hash is None:
                raise ValidationException(
                    message="This account was registered using Google/Instagram Sign-In. You cannot reset a password for it."
                )
        else:
            if existing and existing.password_hash is not None:
                raise ValidationException(
                    message=f"An account with email '{email}' already exists. Please login instead."
                )

        import secrets
        from datetime import datetime, timedelta

        global _email_otp_store
        now = datetime.utcnow()
        
        # Check cooldown (60s)
        if clean_email in _email_otp_store:
            last_sent = _email_otp_store[clean_email].get("last_sent_at")
            if last_sent and (now - last_sent).total_seconds() < 60:
                raise ValidationException(message="Please wait 60 seconds before requesting another OTP.")

        # Cryptographically secure 6-digit OTP (preserving leading zeros)
        otp_code = "".join(secrets.choice("0123456789") for _ in range(6))
        expires_at = now + timedelta(minutes=5)
        otp_hash = hash_password(otp_code)

        _email_otp_store[clean_email] = {
            "otp_hash": otp_hash,
            "expires_at": expires_at,
            "verified": False,
            "attempts": 0,
            "created_at": now,
            "last_sent_at": now
        }

        logger.info(f"EMAIL OTP GENERATED FOR {clean_email} (is_reset={is_reset})")

        # Dispatch email and verify provider acceptance before claiming success
        from app.services.email_service import EmailService
        sent = await EmailService.send_otp_email(clean_email, otp_code)
        if not sent:
            # Clean up un-sent record so user is not locked in a failed cooldown
            if clean_email in _email_otp_store:
                del _email_otp_store[clean_email]
            raise ValidationException(
                message="Unable to send verification email. Please try again."
            )

        return {
            "email": clean_email,
            "message": f"Verification OTP sent successfully to {clean_email}. Please check your inbox.",
        }

    async def verify_email_otp(self, email: str, otp: str) -> bool:
        clean_email = email.strip().lower()
        clean_otp = otp.strip()
        global _email_otp_store
        record = _email_otp_store.get(clean_email)

        if not record:
            raise ValidationException(
                message="No OTP request found for this email address. Please request a new OTP."
            )

        from datetime import datetime
        if record["expires_at"] < datetime.utcnow():
            if clean_email in _email_otp_store:
                del _email_otp_store[clean_email]
            raise ValidationException(
                message="OTP expired. Please request a new OTP."
            )

        if record.get("attempts", 0) >= 5:
            if clean_email in _email_otp_store:
                del _email_otp_store[clean_email]
            raise ValidationException(
                message="Too many incorrect attempts. Please request a new OTP."
            )

        if not verify_password(clean_otp, record["otp_hash"]):
            record["attempts"] = record.get("attempts", 0) + 1
            if record["attempts"] >= 5:
                if clean_email in _email_otp_store:
                    del _email_otp_store[clean_email]
                raise ValidationException(
                    message="Too many incorrect attempts. Please request a new OTP."
                )
            raise ValidationException(
                message="Invalid OTP. Please check the code and try again."
            )

        record["verified"] = True
        logger.info(f"EMAIL VERIFIED VIA OTP: {clean_email}")
        return True

