from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

User = get_user_model()


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    """Register a new user."""
    email = request.data.get("email")
    password = request.data.get("password")
    name = request.data.get("name")
    user_type = request.data.get("userType", "fan")

    if not email or not password or not name:
        return Response({"error": "Email, password, and name are required"}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(email=email).exists():
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


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    """Login a user."""
    email = request.data.get("email")
    password = request.data.get("password")

    if not email or not password:
        return Response({"error": "Email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(request, username=email, password=password)

    if user is None:
        return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

    login(request, user)

    return Response(
        {
            "id": user.id,
            "email": user.email,
            "name": user.get_full_name(),
            "role": user.role,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Logout a user."""
    logout(request)
    return Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def current_user(request):
    """Get current authenticated user."""
    user = request.user
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

