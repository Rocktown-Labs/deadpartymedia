from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count
from django.conf import settings
import logging
import sentry_sdk
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
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
    ArtistUpdateSerializer,
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
        try:
            response = super().list(request, *args, **kwargs)
            # Track article list views
            category = request.query_params.get("category")
            logger.info(f"Article list viewed: category={category or 'all'}")
            return response
        except Exception as e:
            logger.error(f"Error listing articles: {e}", exc_info=True)
            sentry_sdk.capture_exception(e)
            raise

    def retrieve(self, request, *args, **kwargs):
        """Override retrieve to track article views."""
        try:
            instance = self.get_object()
            instance.views += 1
            instance.save(update_fields=["views"])
            logger.info(f"Article viewed: {instance.slug} (views: {instance.views}, category: {instance.category})")
            return super().retrieve(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Error retrieving article: {e}", exc_info=True)
            sentry_sdk.capture_exception(e)
            raise

    @action(detail=True, methods=["get", "post"])
    def comments(self, request, slug=None):
        """Get or create comments for an article."""
        try:
            article = self.get_object()

            if request.method == "GET":
                comments = article.comments.filter(parent=None).select_related("user").prefetch_related("replies")
                serializer = CommentSerializer(comments, many=True)
                logger.info(f"Article comments viewed: article_slug={slug}")
                return Response(serializer.data)

            elif request.method == "POST":
                if not request.user.is_authenticated:
                    logger.warning(f"Unauthenticated comment attempt on article {slug}")
                    return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

                serializer = CommentSerializer(data=request.data)
                if serializer.is_valid():
                    comment = serializer.save(article=article, user=request.user)
                    logger.info(f"Comment created by user {request.user.id} on article {slug}")
                    return Response(serializer.data, status=status.HTTP_201_CREATED)
                
                logger.warning(f"Invalid comment data from user {request.user.id} on article {slug}: {serializer.errors}")
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
        try:
            artist = self.get_object()
            articles = artist.get_articles().filter(status="published").select_related("author")
            serializer = ArticleListSerializer(articles, many=True)
            logger.info(f"Artist articles viewed: artist_slug={slug}")
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error getting articles for artist {slug}: {e}", exc_info=True)
            sentry_sdk.capture_exception(e)
            raise

    @action(detail=True, methods=["get"])
    def events(self, request, slug=None):
        """Get events for an artist."""
        try:
            artist = self.get_object()
            events = artist.get_events().filter(status="published")
            serializer = EventListSerializer(events, many=True)
            logger.info(f"Artist events viewed: artist_slug={slug}")
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error getting events for artist {slug}: {e}", exc_info=True)
            sentry_sdk.capture_exception(e)
            raise

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def onboard(self, request):
        """Create artist profile from onboarding data."""
        try:
            # Handle FormData for file uploads
            data = request.data.dict() if hasattr(request.data, "dict") else request.data
            serializer = ArtistOnboardSerializer(data=data, context={"request": request})
            if serializer.is_valid():
                artist = serializer.save()
                logger.info(f"Artist profile created via onboarding by user {request.user.id}: {artist.slug}, genre: {artist.genre}")
                sentry_sdk.set_user({"id": request.user.id, "email": request.user.email})
                return Response(ArtistSerializer(artist).data, status=status.HTTP_201_CREATED)
            
            logger.warning(f"Invalid artist onboarding data from user {request.user.id}: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error in artist onboarding for user {request.user.id}: {e}", exc_info=True)
            sentry_sdk.capture_exception(e)
            sentry_sdk.set_context("artist_onboard", {
                "user_id": request.user.id,
                "user_email": request.user.email,
            })
            raise

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def me(self, request):
        """Get current user's claimed artist profile."""
        try:
            artist = Artist.objects.filter(claimed_by=request.user, claimed=True).first()
            if not artist:
                return Response({"detail": "No claimed artist profile found."}, status=status.HTTP_404_NOT_FOUND)
            serializer = ArtistSerializer(artist)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error getting current user's artist: {e}", exc_info=True)
            sentry_sdk.capture_exception(e)
            raise

    @action(detail=False, methods=["put", "patch"], permission_classes=[IsAuthenticated])
    def update_me(self, request):
        """Update current user's claimed artist profile."""
        try:
            artist = Artist.objects.filter(claimed_by=request.user, claimed=True).first()
            if not artist:
                return Response({"detail": "No claimed artist profile found."}, status=status.HTTP_404_NOT_FOUND)
            
            # Handle FormData for file uploads
            data = request.data.dict() if hasattr(request.data, "dict") else request.data
            serializer = ArtistUpdateSerializer(artist, data=data, partial=request.method == "PATCH", context={"request": request})
            if serializer.is_valid():
                updated_artist = serializer.save()
                logger.info(f"Artist profile updated: {updated_artist.slug} by user {request.user.id}")
                return Response(ArtistSerializer(updated_artist).data, status=status.HTTP_200_OK)
            
            logger.warning(f"Invalid artist update data from user {request.user.id}: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error updating artist profile for user {request.user.id}: {e}", exc_info=True)
            sentry_sdk.capture_exception(e)
            raise

    @action(detail=False, methods=["get"], permission_classes=[AllowAny])
    def search_spotify(self, request):
        """Search for artists on Spotify."""
        try:
            query = request.query_params.get("q", "").strip()
            
            if not query or len(query) < 2:
                return Response([], status=status.HTTP_200_OK)
            
            # Check if Spotify credentials are configured
            if not settings.SPOTIFY_CLIENT_ID or not settings.SPOTIFY_CLIENT_SECRET:
                logger.warning("Spotify API credentials not configured")
                return Response(
                    {"error": "Spotify API not configured"},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )
            
            # Initialize Spotify client with Client Credentials flow
            client_credentials_manager = SpotifyClientCredentials(
                client_id=settings.SPOTIFY_CLIENT_ID,
                client_secret=settings.SPOTIFY_CLIENT_SECRET
            )
            sp = spotipy.Spotify(client_credentials_manager=client_credentials_manager)
            
            # Search for artists
            results = sp.search(q=query, type="artist", limit=10)
            
            # Extract and format artist data
            artists = []
            for artist in results.get("artists", {}).get("items", []):
                artists.append({
                    "id": artist.get("id"),
                    "name": artist.get("name"),
                    "images": artist.get("images", []),
                    "external_urls": artist.get("external_urls", {}),
                    "genres": artist.get("genres", []),
                })
            
            logger.info(f"Spotify search completed: query={query}, results={len(artists)}")
            return Response(artists, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error searching Spotify: {e}", exc_info=True)
            sentry_sdk.capture_exception(e)
            sentry_sdk.set_context("spotify_search", {
                "query": request.query_params.get("q", ""),
            })
            return Response(
                {"error": "Failed to search Spotify. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class WriterViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for Writer model."""

    queryset = Writer.objects.all()
    serializer_class = WriterSerializer


class CategoryViewSet(viewsets.ViewSet):
    """ViewSet for categories."""

    def list(self, request):
        """List all categories with article counts."""
        try:
            categories = (
                Article.objects.filter(status="published")
                .values("category")
                .annotate(count=Count("id"))
                .order_by("category")
            )
            logger.info("Categories list viewed")
            return Response(categories)
        except Exception as e:
            logger.error(f"Error listing categories: {e}", exc_info=True)
            sentry_sdk.capture_exception(e)
            raise

