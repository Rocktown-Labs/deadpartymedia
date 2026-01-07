from rest_framework import serializers
from django.contrib.auth import get_user_model
import logging
import sentry_sdk
from content.models import Article, Event, Artist, Writer, Comment

User = get_user_model()
logger = logging.getLogger(__name__)


class WriterSerializer(serializers.ModelSerializer):
    """Serializer for Writer model."""

    class Meta:
        model = Writer
        fields = ["id", "name", "bio", "image", "role", "twitter", "instagram", "article_count"]
        read_only_fields = ["article_count"]


class ArtistSerializer(serializers.ModelSerializer):
    """Serializer for Artist model."""

    article_count = serializers.ReadOnlyField()
    event_count = serializers.ReadOnlyField()

    class Meta:
        model = Artist
        fields = [
            "id",
            "slug",
            "name",
            "bio",
            "image",
            "location",
            "genre",
            "spotify_url",
            "spotify_artist_id",
            "instagram",
            "twitter",
            "tiktok",
            "website",
            "claimed",
            "article_count",
            "event_count",
            "profile_views",
            "created_at",
        ]
        read_only_fields = ["slug", "article_count", "event_count", "profile_views", "created_at"]


class CommentSerializer(serializers.ModelSerializer):
    """Serializer for Comment model."""

    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    replies = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ["id", "user_email", "user_name", "content", "parent", "replies", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at"]

    def get_replies(self, obj):
        """Get nested replies."""
        replies = obj.replies.all()
        return CommentSerializer(replies, many=True).data


class ArticleSerializer(serializers.ModelSerializer):
    """Serializer for Article model."""

    author = WriterSerializer(read_only=True)
    artists = ArtistSerializer(many=True, read_only=True)
    comment_count = serializers.SerializerMethodField()

    class Meta:
        model = Article
        fields = [
            "id",
            "slug",
            "title",
            "category",
            "excerpt",
            "content",
            "cover_image",
            "author",
            "artists",
            "status",
            "published_at",
            "views",
            "comment_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["slug", "views", "created_at", "updated_at"]

    def get_comment_count(self, obj):
        """Return the number of comments."""
        return obj.comments.count()


class ArticleListSerializer(serializers.ModelSerializer):
    """Simplified serializer for article lists."""

    author = WriterSerializer(read_only=True)
    artists = serializers.SerializerMethodField()

    class Meta:
        model = Article
        fields = [
            "id",
            "slug",
            "title",
            "category",
            "excerpt",
            "cover_image",
            "author",
            "artists",
            "published_at",
            "views",
            "created_at",
        ]

    def get_artists(self, obj):
        """Get related artists."""
        return ArtistSerializer(obj.artists.all(), many=True).data


class EventSerializer(serializers.ModelSerializer):
    """Serializer for Event model."""

    artists = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)

    class Meta:
        model = Event
        fields = [
            "id",
            "slug",
            "title",
            "description",
            "image",
            "venue",
            "location",
            "date",
            "time",
            "ticket_link",
            "price",
            "genre",
            "status",
            "artists",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["slug", "created_at", "updated_at"]

    def get_artists(self, obj):
        """Get related artists."""
        return ArtistSerializer(obj.artists.all(), many=True).data


class EventListSerializer(serializers.ModelSerializer):
    """Simplified serializer for event lists."""

    artists = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            "id",
            "slug",
            "title",
            "description",
            "image",
            "venue",
            "location",
            "date",
            "time",
            "ticket_link",
            "price",
            "genre",
            "artists",
            "created_at",
        ]

    def get_artists(self, obj):
        """Get related artists."""
        return ArtistSerializer(obj.artists.all(), many=True).data


class ArtistOnboardSerializer(serializers.Serializer):
    """Serializer for artist onboarding."""

    artistName = serializers.CharField(max_length=255)
    location = serializers.CharField(max_length=255)
    genre = serializers.ChoiceField(choices=Artist.GENRE_CHOICES)
    bio = serializers.CharField()
    spotifyId = serializers.CharField(max_length=255, required=False, allow_blank=True)
    socials = serializers.DictField(required=False)
    profileImage = serializers.ImageField(required=False, allow_null=True)

    def create(self, validated_data):
        """Create artist profile from onboarding data."""
        try:
            import re
            
            user = self.context["request"].user
            socials = validated_data.get("socials", {})
            
            # Handle spotifyId - could be an ID or a full URL
            spotify_id = validated_data.get("spotifyId", "").strip()
            spotify_url = None
            
            if spotify_id:
                # Check if it's already just an ID (alphanumeric, no slashes or dots)
                if re.match(r"^[a-zA-Z0-9]+$", spotify_id):
                    spotify_artist_id = spotify_id
                    spotify_url = f"https://open.spotify.com/artist/{spotify_id}"
                else:
                    # Try to extract ID from URL patterns:
                    # https://open.spotify.com/artist/4iHNK0tOyZPYnBU7iGc4UU
                    # spotify:artist:4iHNK0tOyZPYnBU7iGc4UU
                    url_match = re.search(r"artist[/:]([a-zA-Z0-9]+)", spotify_id)
                    if url_match:
                        spotify_artist_id = url_match.group(1)
                        spotify_url = f"https://open.spotify.com/artist/{spotify_artist_id}"
                    else:
                        # If we can't parse it, store as-is and let user fix later
                        spotify_artist_id = spotify_id
                        spotify_url = spotify_id if spotify_id.startswith("http") else None
            else:
                spotify_artist_id = None

            artist = Artist.objects.create(
                name=validated_data["artistName"],
                location=validated_data["location"],
                genre=validated_data["genre"],
                bio=validated_data["bio"],
                spotify_artist_id=spotify_artist_id,
                spotify_url=spotify_url,
                instagram=socials.get("instagram", ""),
                twitter=socials.get("twitter", ""),
                website=socials.get("website", ""),
                image=validated_data.get("profileImage"),
                claimed=True,
                claimed_by=user,
            )

            # Update user role if needed
            if user.role != "artist":
                user.role = "artist"
                user.save()
                logger.info(f"User {user.id} role updated to artist")

            logger.info(f"Artist profile created: {artist.slug} by user {user.id}")
            return artist
        except Exception as e:
            logger.error(f"Error creating artist profile: {e}", exc_info=True)
            sentry_sdk.capture_exception(e)
            raise


class ArtistUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating artist profile."""

    class Meta:
        model = Artist
        fields = [
            "name",
            "bio",
            "image",
            "location",
            "genre",
            "spotify_url",
            "spotify_artist_id",
            "instagram",
            "twitter",
            "tiktok",
            "website",
        ]
        extra_kwargs = {
            "name": {"required": True},
            "bio": {"required": True},
            "location": {"required": True},
            "genre": {"required": True},
        }

    def validate_spotify_url(self, value):
        """Validate Spotify URL format."""
        if value and not value.startswith("https://open.spotify.com/"):
            raise serializers.ValidationError("Spotify URL must be a valid Spotify artist URL.")
        return value

    def validate_instagram(self, value):
        """Validate Instagram URL format."""
        if value and "instagram.com" not in value:
            raise serializers.ValidationError("Instagram URL must be a valid Instagram URL.")
        return value

    def validate_twitter(self, value):
        """Validate Twitter URL format."""
        if value and "twitter.com" not in value and "x.com" not in value:
            raise serializers.ValidationError("Twitter URL must be a valid Twitter/X URL.")
        return value

    def validate_tiktok(self, value):
        """Validate TikTok URL format."""
        if value and "tiktok.com" not in value:
            raise serializers.ValidationError("TikTok URL must be a valid TikTok URL.")
        return value

    def update(self, instance, validated_data):
        """Update artist profile."""
        try:
            # Only allow update if user owns the artist profile
            user = self.context["request"].user
            if instance.claimed_by != user:
                raise serializers.ValidationError("You do not have permission to update this artist profile.")
            
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()
            logger.info(f"Artist profile updated: {instance.slug} by user {user.id}")
            return instance
        except Exception as e:
            logger.error(f"Error updating artist profile: {e}", exc_info=True)
            sentry_sdk.capture_exception(e)
            raise

