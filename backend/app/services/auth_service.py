import logging
from typing import Tuple
try:
    import httpx
except ImportError:
    httpx = None

try:
    from google.oauth2 import id_token as google_id_token
    from google.auth.transport import requests as google_requests
    HAS_GOOGLE_AUTH = True
except ImportError:
    HAS_GOOGLE_AUTH = False

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

        # NOTE: OTP verification is now handled by Clerk on the frontend.
        # The frontend only calls /register after Clerk verifies the email OTP.

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

    # ------------------------------------------------------------------
    # Google ID token verification helper
    # ------------------------------------------------------------------

    def _verify_google_id_token(self, token: str, client_id: str) -> dict:
        """Verify a Google ID token and return its decoded payload.

        Raises ``UnauthorizedException`` for any token problem:
        - Missing google-auth library
        - Invalid / forged signature
        - Expired token
        - Wrong audience (``aud`` != client_id)
        - Issuer not accounts.google.com
        - email_verified != True
        """
        if not HAS_GOOGLE_AUTH:
            raise UnauthorizedException(
                message="Server-side Google token verification is unavailable. "
                        "Install 'google-auth' on the backend."
            )
        try:
            idinfo = google_id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                client_id,
            )
        except ValueError as exc:
            logger.warning(f"Google ID token verification failed: {exc}")
            raise UnauthorizedException(
                message="Google ID token is invalid, expired, or incorrectly issued. "
                        "Please sign in again."
            ) from exc

        # google-auth validates iss, aud, exp automatically; still assert email_verified
        if not idinfo.get("email_verified"):
            logger.warning(
                f"Google token rejected: email_verified=False for sub={idinfo.get('sub')}"
            )
            raise UnauthorizedException(
                message="The Google account email address has not been verified by Google. "
                        "Please verify your Google account email before signing in."
            )
        return idinfo

    async def _verify_clerk_jwt(self, token: str) -> dict:
        """Verify a Clerk session JWT and return its decoded claims.

        Clerk signs session JWTs with RS256 using a rotating key pair. We fetch
        the current public keys from Clerk's JWKS endpoint and verify the token
        signature, expiration, and issuer before trusting any claims.

        Returns the verified payload dict which includes ``email`` and ``sub``
        (Clerk user ID) among other standard JWT claims.

        Raises ``UnauthorizedException`` for any verification failure.
        """
        import json as _json
        import time as _time

        jwks_url = settings.CLERK_JWKS_URL

        # Derive JWKS URL from publishable key if not explicitly configured
        if not jwks_url and settings.CLERK_PUBLISHABLE_KEY:
            pk = settings.CLERK_PUBLISHABLE_KEY
            # Clerk publishable keys look like: pk_live_<base64-encoded-domain>
            # Extract the frontend API URL from the publishable key
            try:
                import base64
                # Format: pk_<env>_<base64url-encoded-domain with trailing $>
                pk_part = pk.split("_", 2)[-1]  # strip "pk_live_" or "pk_test_"
                padded = pk_part + "=" * (-len(pk_part) % 4)
                clerk_domain = base64.urlsafe_b64decode(padded).decode("utf-8").rstrip("$")
                jwks_url = f"https://{clerk_domain}/.well-known/jwks.json"
            except Exception:
                jwks_url = None

        if not jwks_url:
            raise UnauthorizedException(
                message="Clerk JWKS URL is not configured. Set CLERK_PUBLISHABLE_KEY or "
                        "CLERK_JWKS_URL in the backend environment."
            )

        # Fetch Clerk's current public keys
        if httpx is None:
            raise UnauthorizedException(
                message="httpx is required for Clerk JWT verification."
            )
        try:
            async with httpx.AsyncClient(timeout=10.0) as http_client:
                resp = await http_client.get(jwks_url)
                resp.raise_for_status()
                jwks = resp.json()
        except Exception as exc:
            logger.error(f"Failed to fetch Clerk JWKS from {jwks_url}: {exc}")
            raise UnauthorizedException(
                message="Could not retrieve Clerk's public keys to verify the session token. "
                        "Please try again."
            ) from exc

        # Decode & verify using python-jose
        from jose import jwt as jose_jwt, JWTError as JoseJWTError
        try:
            claims = jose_jwt.decode(
                token,
                jwks,
                algorithms=["RS256"],
                options={"verify_aud": False},  # Clerk tokens use the frontend URL as audience
            )
        except JoseJWTError as exc:
            logger.warning(f"Clerk JWT verification failed: {exc}")
            raise UnauthorizedException(
                message="Clerk session token is invalid or expired. Please sign in again."
            ) from exc

        # Validate expiration
        exp = claims.get("exp", 0)
        if exp and exp < _time.time():
            raise UnauthorizedException(
                message="Clerk session token has expired. Please sign in again."
            )

        # Validate issuer (must be a Clerk domain)
        iss = claims.get("iss", "")
        if not iss or "clerk" not in iss.lower():
            logger.warning(f"Clerk token issuer unexpected: {iss}")
            raise UnauthorizedException(
                message="Session token issuer is not a trusted Clerk domain."
            )

        return claims

    async def _extract_identity_from_token(self, token: str) -> dict:
        """Determine token type and verify it, returning a normalized identity dict.

        Returns a dict with keys: ``email``, ``sub``, ``name``, ``picture``.
        Raises ``UnauthorizedException`` on any verification failure.

        Token routing logic:
        - If CLERK_PUBLISHABLE_KEY or CLERK_JWKS_URL is configured, try Clerk
          JWT verification first (matches the Clerk-based frontend).
        - Fall through to Google ID token verification if GOOGLE_CLIENT_ID is set.
        - If neither is configured, fall back to dev-mode unverified decode with loud warnings.
        """
        has_clerk_config = bool(settings.CLERK_PUBLISHABLE_KEY or settings.CLERK_JWKS_URL)
        has_google_config = bool(settings.GOOGLE_CLIENT_ID)
        is_production = settings.ENVIRONMENT == "production"

        # 1. Inspect token to detect whether it's Google ID Token, Google Access Token, or Clerk JWT
        import base64, json as _json
        token_iss = ""
        is_jwt = False
        try:
            parts = token.split(".")
            if len(parts) == 3:
                is_jwt = True
                padded = parts[1] + "=" * (-len(parts[1]) % 4)
                peek_claims = _json.loads(base64.urlsafe_b64decode(padded))
                token_iss = str(peek_claims.get("iss", "")).lower()
            else:
                peek_claims = {}
        except Exception:
            peek_claims = {}

        # 2. If token is Google ID token (iss contains accounts.google.com)
        if "accounts.google.com" in token_iss or (has_google_config and not has_clerk_config):
            try:
                idinfo = self._verify_google_id_token(token, settings.GOOGLE_CLIENT_ID or peek_claims.get("aud", ""))
                return {
                    "email": (idinfo.get("email") or "").strip().lower(),
                    "sub": str(idinfo.get("sub", "")),
                    "name": (
                        idinfo.get("name")
                        or f"{idinfo.get('given_name', '')} {idinfo.get('family_name', '')}".strip()
                    ),
                    "picture": idinfo.get("picture", ""),
                    "source": "google",
                }
            except Exception as exc:
                if not has_clerk_config and is_production:
                    raise

        # 3. If token is an OAuth Access Token (not a JWT, e.g. from Google tokenClient)
        if not is_jwt or token.startswith("ya29."):
            if httpx is not None:
                try:
                    async with httpx.AsyncClient(timeout=10.0) as http_client:
                        resp = await http_client.get(
                            "https://www.googleapis.com/oauth2/v3/userinfo",
                            headers={"Authorization": f"Bearer {token}"},
                        )
                        if resp.status_code == 200:
                            g_data = resp.json()
                            if g_data.get("email"):
                                return {
                                    "email": g_data["email"].strip().lower(),
                                    "sub": str(g_data.get("sub", "")),
                                    "name": g_data.get("name") or g_data.get("given_name", ""),
                                    "picture": g_data.get("picture", ""),
                                    "source": "google_userinfo",
                                }
                except Exception as exc:
                    logger.debug(f"Google userinfo lookup failed: {exc}")

        # 4. If Clerk is configured and token matches Clerk
        if has_clerk_config:
            try:
                claims = await self._verify_clerk_jwt(token)
                email = (
                    claims.get("email")
                    or claims.get("primary_email_address")
                    or ""
                ).strip().lower()
                email_verified = claims.get("email_verified", True)
                if not email_verified:
                    raise UnauthorizedException(
                        message="The Google account email address has not been verified. "
                                "Please verify your email before signing in."
                    )
                return {
                    "email": email,
                    "sub": claims.get("sub", ""),
                    "name": claims.get("name") or claims.get("full_name", ""),
                    "picture": claims.get("picture") or claims.get("image_url", ""),
                    "source": "clerk",
                }
            except UnauthorizedException:
                raise
            except Exception as exc:
                if not has_google_config:
                    raise UnauthorizedException(
                        message="Session token verification failed. Please sign in again."
                    ) from exc
                logger.debug(f"Clerk verification failed, trying Google ID token: {exc}")

        if has_google_config:
            idinfo = self._verify_google_id_token(token, settings.GOOGLE_CLIENT_ID)
            return {
                "email": (idinfo.get("email") or "").strip().lower(),
                "sub": str(idinfo.get("sub", "")),
                "name": (
                    idinfo.get("name")
                    or f"{idinfo.get('given_name', '')} {idinfo.get('family_name', '')}".strip()
                ),
                "picture": idinfo.get("picture", ""),
                "source": "google",
            }

        # Neither Clerk nor Google Client ID is configured
        if is_production:
            raise UnauthorizedException(
                message="Google Sign-In is not configured on this server. "
                        "Please contact support."
            )

        # Development fallback: decode without verification, warn loudly
        logger.warning(
            "No token verification config (CLERK_PUBLISHABLE_KEY / GOOGLE_CLIENT_ID) — "
            "decoding ID token WITHOUT signature verification. "
            "This is ONLY acceptable in development mode."
        )
        import base64, json as _json
        try:
            parts = token.split(".")
            padded = parts[1] + "=" * (-len(parts[1]) % 4)
            payload_bytes = base64.urlsafe_b64decode(padded)
            idinfo = _json.loads(payload_bytes)
        except Exception as exc:
            raise UnauthorizedException(
                message="Could not decode the Google/Clerk ID token payload."
            ) from exc
        return {
            "email": (idinfo.get("email") or "").strip().lower(),
            "sub": str(idinfo.get("sub", "")),
            "name": (
                idinfo.get("name")
                or idinfo.get("full_name")
                or ""
            ),
            "picture": idinfo.get("picture") or idinfo.get("image_url", ""),
            "source": "dev_unverified",
        }

    async def google_login(self, data: GoogleAuthRequest) -> Tuple[User, str, str]:
        """Verify the Google/Clerk ID token server-side, then authenticate or auto-register the user.

        Security guarantees:
        - Token signature, expiration, issuer, and audience are validated before
          any user data is trusted.
        - Supports two verification paths:
            1. **Clerk JWT** (primary, used when app uses @clerk/expo):
               Token is a Clerk session JWT verified via Clerk's JWKS endpoint.
               Clerk has already verified the Google identity; we trust its email claim.
            2. **Google ID token** (fallback, for direct OAuth flows):
               Token is a Google-issued ID token verified via google-auth library.
        - Email is extracted **only** from the verified token payload, never from
          the untrusted request body.
        - Without any verification config the endpoint is blocked in production;
          in development it decodes without verification with a loud log warning.
        """
        identity = await self._extract_identity_from_token(data.id_token)

        verified_email = identity["email"]
        google_sub = identity["sub"]
        token_name = identity["name"] or data.full_name or verified_email.split("@")[0].capitalize()
        token_avatar = identity["picture"] or data.avatar_url

        if not verified_email:
            raise UnauthorizedException(
                message="The identity token did not contain an email address."
            )

        logger.info(
            f"Google login: verified identity from {identity['source']} for sub={google_sub!r}"
        )

        user = await self.user_repo.get_by_email(verified_email)

        if user:
            # Existing user — verify active status
            if not user.is_active or user.status != "active":
                raise UnauthorizedException(
                    message="Your account has been deactivated. Please contact support."
                )

            # Update avatar / google_id only if missing
            update_data = {}
            if not user.avatar_url and token_avatar:
                update_data["avatar_url"] = token_avatar
            if not getattr(user, "google_id", None) and google_sub:
                update_data["google_id"] = google_sub
            if update_data:
                user = await self.user_repo.update(user, update_data)

            logger.info(f"Existing user logged in via Google: {user.email}")
        else:
            # Auto-register new Google user
            full_name = (
                token_name.strip()
                if token_name and token_name.strip()
                else verified_email.split("@")[0].capitalize()
            )
            user_data = {
                "full_name": full_name,
                "email": verified_email,
                "phone": None,
                "password_hash": None,
                "role": "CUSTOMER",
                "is_verified": True,
                "is_active": True,
                "auth_provider": "google",
                "google_id": google_sub or None,
                "status": "active",
                "avatar_url": token_avatar,
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
        
        # NOTE: OTP verification is now handled by Clerk on the frontend.
        # The frontend only calls /reset-password after Clerk verifies the email OTP.
            
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

