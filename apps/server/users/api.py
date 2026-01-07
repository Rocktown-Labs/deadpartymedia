from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth import get_user_model
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.shortcuts import get_object_or_404
from django.db.models import Count
from rest_framework.pagination import PageNumberPagination
import logging
import sentry_sdk
from users.models import ArticleRead, SavedArticle
from users.serializers import (
    ArticleReadSerializer,
    SavedArticleSerializer,
    UserCommentSerializer,
    DashboardStatsSerializer,
    UserUpdateSerializer,
    PasswordChangeSerializer,
)
from content.models import Article, Comment

User = get_user_model()
logger = logging.getLogger(__name__)


class StandardResultsSetPagination(PageNumberPagination):
    """Standard pagination for user activity endpoints."""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


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
            return Response({"error": "Email, password, and name are required"}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).exists():
            logger.warning(f"Registration attempt with existing email: {email}")
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

        # Authenticate to get the backend, then login
        authenticated_user = authenticate(request, username=email, password=password)
        if authenticated_user:
            login(request, authenticated_user)
        
        logger.info(f"User registered successfully: {user.id} ({email}) with role {role}")
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
            return Response({"error": "Email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(request, username=email, password=password)

        if user is None:
            logger.warning(f"Failed login attempt for email: {email}")
            return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

        # login() works with authenticated user from authenticate()
        login(request, user)
        
        logger.info(f"User logged in successfully: {user.id} ({email}), role: {user.role}")
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
        raise


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])  # Allow logout even if not authenticated
def logout_view(request):
    """Logout a user."""
    try:
        user_id = request.user.id if request.user.is_authenticated else None
        if request.user.is_authenticated:
            logout(request)
            logger.info(f"User logged out: {user_id}")
        return Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error during user logout: {e}", exc_info=True)
        sentry_sdk.capture_exception(e)
        # Even if there's an error, try to logout and return success
        try:
            if request.user.is_authenticated:
                logout(request)
        except:
            pass
        return Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)


@api_view(["GET", "PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def current_user(request):
    """Get or update current authenticated user."""
    try:
        user = request.user
        # Set Sentry user context for all authenticated requests
        sentry_sdk.set_user({"id": user.id, "email": user.email, "role": user.role})
        
        if request.method == "GET":
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
        
        elif request.method in ["PUT", "PATCH"]:
            # Update user profile
            serializer = UserUpdateSerializer(user, data=request.data, partial=request.method == "PATCH")
            if serializer.is_valid():
                serializer.save()
                user.refresh_from_db()
                logger.info(f"User profile updated: {user.id}")
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
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        logger.error(f"Error in current_user endpoint: {e}", exc_info=True)
        sentry_sdk.capture_exception(e)
        raise


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Change user password."""
    try:
        serializer = PasswordChangeSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data["new_password"])
            user.save()
            logger.info(f"Password changed for user: {user.id}")
            return Response({"message": "Password changed successfully."}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Error changing password: {e}", exc_info=True)
        sentry_sdk.capture_exception(e)
        raise


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def read_articles(request):
    """Get articles user has read or mark an article as read."""
    try:
        if request.method == "GET":
            # Get paginated list of read articles
            paginator = StandardResultsSetPagination()
            read_articles = ArticleRead.objects.filter(user=request.user).select_related("article", "article__author").prefetch_related("article__artists").order_by("-read_at")
            page = paginator.paginate_queryset(read_articles, request)
            serializer = ArticleReadSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        
        elif request.method == "POST":
            # Mark article as read
            article_id = request.data.get("article_id")
            if not article_id:
                return Response({"error": "article_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
            article = get_object_or_404(Article, id=article_id)
            # Use get_or_create to avoid duplicates
            article_read, created = ArticleRead.objects.get_or_create(
                user=request.user,
                article=article
            )
            serializer = ArticleReadSerializer(article_read)
            return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error in read_articles endpoint: {e}", exc_info=True)
        sentry_sdk.capture_exception(e)
        raise


@api_view(["GET", "POST", "DELETE"])
@permission_classes([IsAuthenticated])
def saved_articles(request, saved_id=None):
    """Get, save, or unsave articles."""
    try:
        if request.method == "GET":
            # Get paginated list of saved articles
            paginator = StandardResultsSetPagination()
            saved_articles = SavedArticle.objects.filter(user=request.user).select_related("article", "article__author").prefetch_related("article__artists").order_by("-saved_at")
            page = paginator.paginate_queryset(saved_articles, request)
            serializer = SavedArticleSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        
        elif request.method == "POST":
            # Save an article
            article_id = request.data.get("article_id")
            if not article_id:
                return Response({"error": "article_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
            article = get_object_or_404(Article, id=article_id)
            # Use get_or_create to avoid duplicates
            saved_article, created = SavedArticle.objects.get_or_create(
                user=request.user,
                article=article
            )
            serializer = SavedArticleSerializer(saved_article)
            return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
        
        elif request.method == "DELETE":
            # Unsave an article
            if not saved_id:
                return Response({"error": "saved_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
            saved_article = get_object_or_404(SavedArticle, id=saved_id, user=request.user)
            saved_article.delete()
            return Response({"message": "Article unsaved successfully"}, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error in saved_articles endpoint: {e}", exc_info=True)
        sentry_sdk.capture_exception(e)
        raise


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def user_comments(request):
    """Get user's comments with replies."""
    try:
        paginator = StandardResultsSetPagination()
        comments = Comment.objects.filter(user=request.user, parent=None).select_related("article", "user").prefetch_related("replies", "replies__user").order_by("-created_at")
        page = paginator.paginate_queryset(comments, request)
        serializer = UserCommentSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
    except Exception as e:
        logger.error(f"Error in user_comments endpoint: {e}", exc_info=True)
        sentry_sdk.capture_exception(e)
        raise


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Get dashboard statistics."""
    try:
        articles_read_count = ArticleRead.objects.filter(user=request.user).count()
        articles_saved_count = SavedArticle.objects.filter(user=request.user).count()
        comments_count = Comment.objects.filter(user=request.user).count()
        
        stats = {
            "articles_read_count": articles_read_count,
            "articles_saved_count": articles_saved_count,
            "comments_count": comments_count,
        }
        
        serializer = DashboardStatsSerializer(stats)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error in dashboard_stats endpoint: {e}", exc_info=True)
        sentry_sdk.capture_exception(e)
        raise

