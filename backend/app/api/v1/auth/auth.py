from fastapi import APIRouter, Depends, status

from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import (
    AuthResponseData,
    ForgotPasswordRequest,
    GoogleAuthRequest,
    InstagramAuthRequest,
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    ResetPasswordRequest,
    SendEmailOtpRequest,
    VerifyEmailOtpRequest,
    UpdateProfileRequest,
    UserResponse,
)
from app.schemas.common import ApiResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/send-email-otp",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Send OTP code to email for verification",
    description="Generates a 6-digit OTP code, stores it with expiration, and sends it to the user email for registration verification.",
)
async def send_email_otp(
    data: SendEmailOtpRequest, auth_service: AuthService = Depends()
) -> ApiResponse:
    result = await auth_service.send_email_otp(data.email)
    return ApiResponse(
        success=True,
        message=result["message"],
        data=result,
    )


@router.post(
    "/verify-email-otp",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify OTP code received via email",
    description="Validates provided 6-digit OTP code against stored expiration and active OTP record.",
)
async def verify_email_otp(
    data: VerifyEmailOtpRequest, auth_service: AuthService = Depends()
) -> ApiResponse:
    verified = await auth_service.verify_email_otp(data.email, data.otp)
    return ApiResponse(
        success=True,
        message="Email verified successfully!",
        data={"verified": verified},
    )


@router.post(
    "/register",
    response_model=ApiResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new customer account",
    description="Accepts full name, email, 10-15 digit phone number, and password (min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char). Auto-creates customer account in MongoDB and returns JWT tokens.",
)
async def register(
    data: RegisterRequest, auth_service: AuthService = Depends()
) -> ApiResponse:
    user, access_token, refresh_token = await auth_service.register(data)
    response_data = AuthResponseData(
        user=UserResponse.convert_id(user),
        access_token=access_token,
        refresh_token=refresh_token,
    )
    return ApiResponse(
        success=True,
        message="Registration Successful",
        data=response_data,
    )


@router.post(
    "/login",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate existing user",
    description="Validates user credentials against MongoDB user collection and returns JWT access and refresh tokens.",
)
async def login(
    data: LoginRequest, auth_service: AuthService = Depends()
) -> ApiResponse:
    user, access_token, refresh_token = await auth_service.login(data)
    response_data = AuthResponseData(
        user=UserResponse.convert_id(user),
        access_token=access_token,
        refresh_token=refresh_token,
    )
    return ApiResponse(
        success=True, message="Login Successful", data=response_data
    )


@router.post(
    "/google",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Google OAuth login / auto-registration",
    description="Accepts verified Google profile data (email, full name, avatar, google_id), finds or auto-registers the user, and issues JWT access and refresh tokens.",
)
async def google_login(
    data: GoogleAuthRequest, auth_service: AuthService = Depends()
) -> ApiResponse:
    user, access_token, refresh_token = await auth_service.google_login(data)
    response_data = AuthResponseData(
        user=UserResponse.convert_id(user),
        access_token=access_token,
        refresh_token=refresh_token,
    )
    return ApiResponse(
        success=True,
        message="Google Login Successful",
        data=response_data,
    )


@router.post(
    "/instagram",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Instagram login / auto-registration",
    description="Accepts Instagram profile details (username, full name, avatar), finds or auto-registers the user, and issues JWT access and refresh tokens.",
)
async def instagram_login(
    data: InstagramAuthRequest, auth_service: AuthService = Depends()
) -> ApiResponse:
    user, access_token, refresh_token = await auth_service.instagram_login(data)
    response_data = AuthResponseData(
        user=UserResponse.convert_id(user),
        access_token=access_token,
        refresh_token=refresh_token,
    )
    return ApiResponse(
        success=True,
        message="Instagram Login Successful",
        data=response_data,
    )


@router.post(
    "/forgot-password",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Initiate password recovery",
    description="Accepts the user's email address, verifies it exists in the database, and returns a confirmation message.",
)
async def forgot_password(
    data: ForgotPasswordRequest, auth_service: AuthService = Depends()
) -> ApiResponse:
    message = await auth_service.forgot_password(data.email)
    return ApiResponse(success=True, message=message, data={})


@router.post(
    "/reset-password",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Reset user password",
    description="Accepts user email, validates new password strength and match, updates the password in MongoDB, and returns fresh access/refresh JWT tokens.",
)
async def reset_password(
    data: ResetPasswordRequest, auth_service: AuthService = Depends()
) -> ApiResponse:
    user, access_token, refresh_token = await auth_service.reset_password(data)
    response_data = AuthResponseData(
        user=UserResponse.convert_id(user),
        access_token=access_token,
        refresh_token=refresh_token,
    )
    return ApiResponse(
        success=True,
        message="Password Reset Successful",
        data=response_data,
    )


@router.post(
    "/refresh",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Rotate JWT token pair",
    description="Validates a provided refresh token and performs token rotation, returning a new access token and fresh refresh token pair.",
)
async def refresh(
    data: RefreshTokenRequest, auth_service: AuthService = Depends()
) -> ApiResponse:
    user, access_token, refresh_token = await auth_service.refresh_tokens(
        data.refresh_token
    )
    response_data = AuthResponseData(
        user=UserResponse.convert_id(user),
        access_token=access_token,
        refresh_token=refresh_token,
    )
    return ApiResponse(
        success=True, message="Tokens rotated successfully.", data=response_data
    )


@router.get(
    "/me",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve current user profile",
    description="Extracts the user identification details from the validated authorization Bearer access token.",
)
async def get_me(current_user: User = Depends(get_current_user)) -> ApiResponse:
    user_response = UserResponse.convert_id(current_user)
    return ApiResponse(
        success=True,
        message="Profile retrieved successfully.",
        data=user_response,
    )


@router.put(
    "/me",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Update current user profile",
    description="Updates the authenticated user's profile details including avatar.",
)
async def update_me(
    data: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(),
) -> ApiResponse:
    updated_user = await auth_service.update_profile(current_user, data)
    user_response = UserResponse.convert_id(updated_user)
    return ApiResponse(
        success=True,
        message="Profile updated successfully.",
        data=user_response,
    )


@router.post(
    "/logout",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Stub user logout",
    description="Returns a generic success message. Client applications should wipe user JWT tokens from storage locally.",
)
async def logout() -> ApiResponse:
    return ApiResponse(success=True, message="Logout Successful", data={})
