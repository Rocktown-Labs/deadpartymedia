from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count
import logging
import sentry_sdk
from sentry_sdk import metrics
from content.models import Article, Event, Artist, Writer, Comment
from .serializers import (
    ArticleSerializer,
    ArticleListSerializer,
    EventSerializer,
    EventListSerializer,
    ArtistSerializer,
    WriterSerializer,
    CommentSerializer,
    ArtistOnboardSerializer,
)

logger = logging.getLogger(__name__)


class ArticleViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for Article model."""

    queryset = Article.objects.filter(status="published").select_related("author").prefetch_related("artists")
    serializer_class = ArticleListSerializer
    lookup_field = "slug"

    def get_serializer_class(self):
        """Use detailed serializer for retrieve action."""
        if self.action == "retrieve":
            return ArticleSerializer
        return ArticleListSerializer

    def get_queryset(self):
        """Filter articles by category, search, artist, or writer."""
        queryset = super().get_queryset()
        category = self.request.query_params.get("category")
        search = self.request.query_params.get("search")
        artist = self.request.query_params.get("artist")
        writer = self.request.query_params.get("writer")

        if category:
            queryset = queryset.filter(category=category)

        if search:
            queryset = queryset.filter(Q(title__icontains=search) | Q(excerpt__icontains=search))

        if artist:
            queryset = queryset.filter(artists__slug=artist).distinct()

        if writer:
            queryset = queryset.filter(author__id=writer)

        return queryset.order_by("-published_at", "-created_at")

    def list(self, request, *args, **kwargs):
        """Override list to return all articles (not just published) for admin."""
        # For now, return published only. Admin will use Django admin interface.
        return super().list(request, *args, **kwargs)

    @action(detail=True, methods=["get", "post"])
    def comments(self, request, slug=None):
        """Get or create comments for an article."""
        try:
            article = self.get_object()

            if request.method == "GET":
                comments = article.comments.filter(parent=None).select_related("user").prefetch_related("replies")
                serializer = CommentSerializer(comments, many=True)
                metrics.increment("api.article.comments.viewed", tags={"article_slug": slug})
                return Response(serializer.data)

            elif request.method == "POST":
                if not request.user.is_authenticated:
                    logger.warning(f"Unauthenticated comment attempt on article {slug}")
                    metrics.increment("api.article.comments.unauthorized")
                    return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

                serializer = CommentSerializer(data=request.data)
                if serializer.is_valid():
                    comment = serializer.save(article=article, user=request.user)
                    logger.info(f"Comment created by user {request.user.id} on article {slug}")
                    metrics.increment("api.article.comments.created", tags={"article_slug": slug, "user_id": request.user.id})
                    return Response(serializer.data, status=status.HTTP_201_CREATED)
                
                logger.warning(f"Invalid comment data from user {request.user.id} on article {slug}: {serializer.errors}")
                metrics.increment("api.article.comments.validation_failed", tags={"article_slug": slug})
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error in article comments endpoint for article {slug}: {e}", exc_info=True)
            sentry_sdk.capture_exception(e)
            sentry_sdk.set_context("article_comments", {
                "article_slug": slug,
                "method": request.method,
                "user_id": request.user.id if request.user.is_authenticated else None,
            })
            raise


class EventViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for Event model."""

    queryset = Event.objects.filter(status="published").prefetch_related("artists")
    serializer_class = EventListSerializer
    lookup_field = "slug"

    def get_serializer_class(self):
        """Use detailed serializer for retrieve action."""
        if self.action == "retrieve":
            return EventSerializer
        return EventListSerializer

    def get_queryset(self):
        """Filter events by genre and date."""
        queryset = super().get_queryset()
        genre = self.request.query_params.get("genre")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")

        if genre:
            queryset = queryset.filter(genre=genre)

        if date_from:
            queryset = queryset.filter(date__gte=date_from)

        if date_to:
            queryset = queryset.filter(date__lte=date_to)

        return queryset.order_by("date", "-created_at")


class ArtistViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for Artist model."""

    queryset = Artist.objects.all()
    serializer_class = ArtistSerializer
    lookup_field = "slug"

    def get_queryset(self):
        """Filter artists by genre."""
        queryset = super().get_queryset()
        genre = self.request.query_params.get("genre")

        if genre:
            queryset = queryset.filter(genre=genre)

        return queryset.order_by("name")

    @action(detail=True, methods=["get"])
    def articles(self, request, slug=None):
        """Get articles for an artist."""
        artist = self.get_object()
        articles = artist.get_articles().filter(status="published").select_related("author")
        serializer = ArticleListSerializer(articles, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def events(self, request, slug=None):
        """Get events for an artist."""
        artist = self.get_object()
        events = artist.get_events().filter(status="published")
        serializer = EventListSerializer(events, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def onboard(self, request):
        """Create artist profile from onboarding data."""
        try:
            # Handle FormData for file uploads
            data = request.data.dict() if hasattr(request.data, "dict") else request.data
            serializer = ArtistOnboardSerializer(data=data, context={"request": request})
            if serializer.is_valid():
                artist = serializer.save()
                logger.info(f"Artist profile created via onboarding by user {request.user.id}: {artist.slug}")
                metrics.increment("api.artist.onboarded", tags={"user_id": request.user.id, "genre": artist.genre})
                sentry_sdk.set_user({"id": request.user.id, "email": request.user.email})
                return Response(ArtistSerializer(artist).data, status=status.HTTP_201_CREATED)
            
            logger.warning(f"Invalid artist onboarding data from user {request.user.id}: {serializer.errors}")
            metrics.increment("api.artist.onboard.validation_failed", tags={"user_id": request.user.id})
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error in artist onboarding for user {request.user.id}: {e}", exc_info=True)
            sentry_sdk.capture_exception(e)
            sentry_sdk.set_context("artist_onboard", {
                "user_id": request.user.id,
                "user_email": request.user.email,
            })
            raise


class WriterViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for Writer model."""

    queryset = Writer.objects.all()
    serializer_class = WriterSerializer


class CategoryViewSet(viewsets.ViewSet):
    """ViewSet for categories."""

    def list(self, request):
        """List all categories with article counts."""
        categories = (
            Article.objects.filter(status="published")
            .values("category")
            .annotate(count=Count("id"))
            .order_by("category")
        )
        return Response(categories)

