from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth import get_user_model
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import logging
import sentry_sdk
from sentry_sdk import metrics

User = get_user_model()
logger = logging.getLogger(__name__)


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    """Register a new user."""
    try:
        email = request.data.get("email")
        password = request.data.get("password")
        name = request.data.get("name")
        user_type = request.data.get("userType", "fan")

        if not email or not password or not name:
            logger.warning("Registration attempt with missing fields", extra={"email": email})
            metrics.increment("auth.register.validation_failed")
            return Response({"error": "Email, password, and name are required"}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).exists():
            logger.warning(f"Registration attempt with existing email: {email}")
            metrics.increment("auth.register.duplicate_email")
            return Response({"error": "User with this email already exists"}, status=status.HTTP_400_BAD_REQUEST)

        # Map userType to role
        role_map = {"fan": "fan", "artist": "artist"}
        role = role_map.get(user_type, "fan")

        user = User.objects.create_user(
            email=email,
            password=password,
            username=email,  # Use email as username
            first_name=name.split()[0] if name.split() else name,
            last_name=" ".join(name.split()[1:]) if len(name.split()) > 1 else "",
            role=role,
        )

        login(request, user)
        
        logger.info(f"User registered successfully: {user.id} ({email}) with role {role}")
        metrics.increment("auth.register.success", tags={"role": role})
        sentry_sdk.set_user({"id": user.id, "email": user.email, "role": role})

        return Response(
            {
                "id": user.id,
                "email": user.email,
                "name": user.get_full_name(),
                "role": user.role,
                "userType": user_type,
            },
            status=status.HTTP_201_CREATED,
        )
    except Exception as e:
        logger.error(f"Error during user registration: {e}", exc_info=True)
        sentry_sdk.capture_exception(e)
        sentry_sdk.set_context("user_registration", {
            "email": email if 'email' in locals() else None,
            "user_type": user_type if 'user_type' in locals() else None,
        })
        metrics.increment("auth.register.error")
        raise


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    """Login a user."""
    try:
        email = request.data.get("email")
        password = request.data.get("password")

        if not email or not password:
            logger.warning("Login attempt with missing credentials")
            metrics.increment("auth.login.validation_failed")
            return Response({"error": "Email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(request, username=email, password=password)

        if user is None:
            logger.warning(f"Failed login attempt for email: {email}")
            metrics.increment("auth.login.failed")
            return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

        login(request, user)
        
        logger.info(f"User logged in successfully: {user.id} ({email})")
        metrics.increment("auth.login.success", tags={"user_id": user.id, "role": user.role})
        sentry_sdk.set_user({"id": user.id, "email": user.email, "role": user.role})

        return Response(
            {
                "id": user.id,
                "email": user.email,
                "name": user.get_full_name(),
                "role": user.role,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as e:
        logger.error(f"Error during user login: {e}", exc_info=True)
        sentry_sdk.capture_exception(e)
        sentry_sdk.set_context("user_login", {
            "email": email if 'email' in locals() else None,
        })
        metrics.increment("auth.login.error")
        raise


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Logout a user."""
    try:
        user_id = request.user.id
        logout(request)
        logger.info(f"User logged out: {user_id}")
        metrics.increment("auth.logout.success", tags={"user_id": user_id})
        return Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error during user logout: {e}", exc_info=True)
        sentry_sdk.capture_exception(e)
        raise


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def current_user(request):
    """Get current authenticated user."""
    try:
        user = request.user
        # Set Sentry user context for all authenticated requests
        sentry_sdk.set_user({"id": user.id, "email": user.email, "role": user.role})
        return Response(
            {
                "id": user.id,
                "email": user.email,
                "name": user.get_full_name(),
                "role": user.role,
                "avatar": user.avatar.url if user.avatar else None,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as e:
        logger.error(f"Error getting current user: {e}", exc_info=True)
        sentry_sdk.capture_exception(e)
        raise

