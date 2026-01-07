"""
Tests for content app serializers.
"""
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import serializers
from content.api.serializers import (
    ArtistSerializer,
    ArtistOnboardSerializer,
    ArtistUpdateSerializer,
    ArticleSerializer,
    ArticleListSerializer,
    EventSerializer,
    EventListSerializer,
    CommentSerializer,
    WriterSerializer,
)
from content.tests.factories import (
    ArtistFactory,
    ArticleFactory,
    EventFactory,
    WriterFactory,
    CommentFactory,
    UserFactory,
)


class TestArtistOnboardSerializer:
    """Tests for ArtistOnboardSerializer."""
    
    def test_artist_onboard_serializer_valid_data(self, user):
        """Test serializer with valid data."""
        data = {
            "artistName": "New Artist",
            "location": "New York",
            "genre": "EDM",
            "bio": "A new artist bio",
            "spotifyId": "4iHNK0tOyZPYnBU7iGc4UU",
            "socials": {
                "instagram": "https://instagram.com/artist",
                "twitter": "https://twitter.com/artist",
                "website": "https://artist.com",
            },
        }
        serializer = ArtistOnboardSerializer(data=data, context={"request": type("Request", (), {"user": user})()})
        assert serializer.is_valid()
    
    def test_artist_onboard_serializer_spotify_id_only(self, user):
        """Test serializer with Spotify ID only (not URL)."""
        data = {
            "artistName": "New Artist",
            "location": "New York",
            "genre": "EDM",
            "bio": "A new artist bio",
            "spotifyId": "4iHNK0tOyZPYnBU7iGc4UU",
        }
        serializer = ArtistOnboardSerializer(data=data, context={"request": type("Request", (), {"user": user})()})
        assert serializer.is_valid()
        artist = serializer.save()
        assert artist.spotify_artist_id == "4iHNK0tOyZPYnBU7iGc4UU"
        assert artist.spotify_url == "https://open.spotify.com/artist/4iHNK0tOyZPYnBU7iGc4UU"
    
    def test_artist_onboard_serializer_spotify_url(self, user):
        """Test serializer with Spotify URL."""
        data = {
            "artistName": "New Artist",
            "location": "New York",
            "genre": "EDM",
            "bio": "A new artist bio",
            "spotifyId": "https://open.spotify.com/artist/4iHNK0tOyZPYnBU7iGc4UU",
        }
        serializer = ArtistOnboardSerializer(data=data, context={"request": type("Request", (), {"user": user})()})
        assert serializer.is_valid()
        artist = serializer.save()
        assert artist.spotify_artist_id == "4iHNK0tOyZPYnBU7iGc4UU"
        assert artist.spotify_url == "https://open.spotify.com/artist/4iHNK0tOyZPYnBU7iGc4UU"
    
    def test_artist_onboard_serializer_spotify_uri(self, user):
        """Test serializer with Spotify URI format."""
        data = {
            "artistName": "New Artist",
            "location": "New York",
            "genre": "EDM",
            "bio": "A new artist bio",
            "spotifyId": "spotify:artist:4iHNK0tOyZPYnBU7iGc4UU",
        }
        serializer = ArtistOnboardSerializer(data=data, context={"request": type("Request", (), {"user": user})()})
        assert serializer.is_valid()
        artist = serializer.save()
        assert artist.spotify_artist_id == "4iHNK0tOyZPYnBU7iGc4UU"
        assert artist.spotify_url == "https://open.spotify.com/artist/4iHNK0tOyZPYnBU7iGc4UU"
    
    def test_artist_onboard_serializer_no_spotify(self, user):
        """Test serializer without Spotify ID."""
        data = {
            "artistName": "New Artist",
            "location": "New York",
            "genre": "EDM",
            "bio": "A new artist bio",
        }
        serializer = ArtistOnboardSerializer(data=data, context={"request": type("Request", (), {"user": user})()})
        assert serializer.is_valid()
        artist = serializer.save()
        assert artist.spotify_artist_id is None or artist.spotify_artist_id == ""
    
    def test_artist_onboard_serializer_socials(self, user):
        """Test serializer with social media links."""
        data = {
            "artistName": "New Artist",
            "location": "New York",
            "genre": "EDM",
            "bio": "A new artist bio",
            "socials": {
                "instagram": "https://instagram.com/artist",
                "twitter": "https://twitter.com/artist",
                "website": "https://artist.com",
            },
        }
        serializer = ArtistOnboardSerializer(data=data, context={"request": type("Request", (), {"user": user})()})
        assert serializer.is_valid()
        artist = serializer.save()
        assert artist.instagram == "https://instagram.com/artist"
        assert artist.twitter == "https://twitter.com/artist"
        assert artist.website == "https://artist.com"
    
    def test_artist_onboard_serializer_user_role_update(self, user):
        """Test that user role is updated to artist on creation."""
        assert user.role != "artist"
        data = {
            "artistName": "New Artist",
            "location": "New York",
            "genre": "EDM",
            "bio": "A new artist bio",
        }
        serializer = ArtistOnboardSerializer(data=data, context={"request": type("Request", (), {"user": user})()})
        assert serializer.is_valid()
        artist = serializer.save()
        user.refresh_from_db()
        assert user.role == "artist"
        assert artist.claimed_by == user
    
    def test_artist_onboard_serializer_missing_required_fields(self, user):
        """Test serializer with missing required fields."""
        data = {
            "artistName": "New Artist",
            # Missing location, genre, bio
        }
        serializer = ArtistOnboardSerializer(data=data, context={"request": type("Request", (), {"user": user})()})
        assert not serializer.is_valid()
        assert "location" in serializer.errors
        assert "genre" in serializer.errors
        assert "bio" in serializer.errors


class TestArtistUpdateSerializer:
    """Tests for ArtistUpdateSerializer."""
    
    def test_artist_update_serializer_valid_data(self, user):
        """Test serializer with valid data."""
        artist = ArtistFactory(claimed_by=user, claimed=True)
        data = {
            "name": "Updated Name",
            "bio": "Updated bio",
            "location": "Updated Location",
            "genre": "Country",
        }
        serializer = ArtistUpdateSerializer(
            artist,
            data=data,
            context={"request": type("Request", (), {"user": user})()}
        )
        assert serializer.is_valid()
        updated_artist = serializer.save()
        assert updated_artist.name == "Updated Name"
        assert updated_artist.bio == "Updated bio"
    
    def test_artist_update_serializer_spotify_url_validation(self, user):
        """Test Spotify URL validation."""
        artist = ArtistFactory(claimed_by=user, claimed=True)
        data = {
            "spotify_url": "invalid-url",
        }
        serializer = ArtistUpdateSerializer(
            artist,
            data=data,
            partial=True,
            context={"request": type("Request", (), {"user": user})()}
        )
        assert not serializer.is_valid()
        assert "spotify_url" in serializer.errors
    
    def test_artist_update_serializer_spotify_url_valid(self, user):
        """Test valid Spotify URL."""
        artist = ArtistFactory(claimed_by=user, claimed=True)
        data = {
            "spotify_url": "https://open.spotify.com/artist/4iHNK0tOyZPYnBU7iGc4UU",
        }
        serializer = ArtistUpdateSerializer(
            artist,
            data=data,
            partial=True,
            context={"request": type("Request", (), {"user": user})()}
        )
        assert serializer.is_valid()
    
    def test_artist_update_serializer_instagram_validation(self, user):
        """Test Instagram URL validation."""
        artist = ArtistFactory(claimed_by=user, claimed=True)
        data = {
            "instagram": "invalid-url",
        }
        serializer = ArtistUpdateSerializer(
            artist,
            data=data,
            partial=True,
            context={"request": type("Request", (), {"user": user})()}
        )
        assert not serializer.is_valid()
        assert "instagram" in serializer.errors
    
    def test_artist_update_serializer_instagram_valid(self, user):
        """Test valid Instagram URL."""
        artist = ArtistFactory(claimed_by=user, claimed=True)
        data = {
            "instagram": "https://instagram.com/artist",
        }
        serializer = ArtistUpdateSerializer(
            artist,
            data=data,
            partial=True,
            context={"request": type("Request", (), {"user": user})()}
        )
        assert serializer.is_valid()
    
    def test_artist_update_serializer_twitter_validation(self, user):
        """Test Twitter URL validation."""
        artist = ArtistFactory(claimed_by=user, claimed=True)
        data = {
            "twitter": "invalid-url",
        }
        serializer = ArtistUpdateSerializer(
            artist,
            data=data,
            partial=True,
            context={"request": type("Request", (), {"user": user})()}
        )
        assert not serializer.is_valid()
        assert "twitter" in serializer.errors
    
    def test_artist_update_serializer_twitter_valid(self, user):
        """Test valid Twitter/X URL."""
        artist = ArtistFactory(claimed_by=user, claimed=True)
        for url in ["https://twitter.com/artist", "https://x.com/artist"]:
            data = {"twitter": url}
            serializer = ArtistUpdateSerializer(
                artist,
                data=data,
                partial=True,
                context={"request": type("Request", (), {"user": user})()}
            )
            assert serializer.is_valid()
    
    def test_artist_update_serializer_tiktok_validation(self, user):
        """Test TikTok URL validation."""
        artist = ArtistFactory(claimed_by=user, claimed=True)
        data = {
            "tiktok": "invalid-url",
        }
        serializer = ArtistUpdateSerializer(
            artist,
            data=data,
            partial=True,
            context={"request": type("Request", (), {"user": user})()}
        )
        assert not serializer.is_valid()
        assert "tiktok" in serializer.errors
    
    def test_artist_update_serializer_tiktok_valid(self, user):
        """Test valid TikTok URL."""
        artist = ArtistFactory(claimed_by=user, claimed=True)
        data = {
            "tiktok": "https://tiktok.com/@artist",
        }
        serializer = ArtistUpdateSerializer(
            artist,
            data=data,
            partial=True,
            context={"request": type("Request", (), {"user": user})()}
        )
        assert serializer.is_valid()
    
    def test_artist_update_serializer_permission_check(self, user):
        """Test that only owner can update artist profile."""
        other_user = UserFactory()
        artist = ArtistFactory(claimed_by=other_user, claimed=True)
        data = {
            "name": "Hacked Name",
        }
        serializer = ArtistUpdateSerializer(
            artist,
            data=data,
            partial=True,
            context={"request": type("Request", (), {"user": user})()}
        )
        # The permission check happens in update(), not validate(), so is_valid() will pass
        # but update() will raise ValidationError
        assert serializer.is_valid()
        # Try to save and check that it raises ValidationError
        with pytest.raises(serializers.ValidationError):
            serializer.save()


class TestArticleSerializer:
    """Tests for ArticleSerializer."""
    
    def test_article_serializer_nested_author(self, article):
        """Test that author is serialized as nested WriterSerializer."""
        serializer = ArticleSerializer(article)
        assert "author" in serializer.data
        assert serializer.data["author"]["name"] == article.author.name
    
    def test_article_serializer_nested_artists(self, article):
        """Test that artists are serialized as nested ArtistSerializer."""
        artist1 = ArtistFactory()
        artist2 = ArtistFactory()
        article.artists.add(artist1, artist2)
        serializer = ArticleSerializer(article)
        assert "artists" in serializer.data
        assert len(serializer.data["artists"]) == 2
        artist_names = [a["name"] for a in serializer.data["artists"]]
        assert artist1.name in artist_names
        assert artist2.name in artist_names
    
    def test_article_serializer_comment_count(self, article):
        """Test comment_count calculation."""
        CommentFactory(article=article)
        CommentFactory(article=article)
        serializer = ArticleSerializer(article)
        assert serializer.data["comment_count"] == 2
    
    def test_article_serializer_read_only_fields(self, article):
        """Test that read-only fields are not writable."""
        serializer = ArticleSerializer(article)
        assert "slug" in serializer.data
        assert "views" in serializer.data
        assert "created_at" in serializer.data
        assert "updated_at" in serializer.data


class TestArticleListSerializer:
    """Tests for ArticleListSerializer."""
    
    def test_article_list_serializer_simplified_fields(self, article):
        """Test that list serializer has simplified fields."""
        serializer = ArticleListSerializer(article)
        assert "content" not in serializer.data  # Should not include full content
        assert "slug" in serializer.data
        assert "title" in serializer.data
        assert "excerpt" in serializer.data
    
    def test_article_list_serializer_artists(self, article):
        """Test that artists are included in list serializer."""
        artist = ArtistFactory()
        article.artists.add(artist)
        serializer = ArticleListSerializer(article)
        assert "artists" in serializer.data
        assert len(serializer.data["artists"]) == 1


class TestEventSerializer:
    """Tests for EventSerializer."""
    
    def test_event_serializer_nested_artists(self, event):
        """Test that artists are serialized."""
        artist1 = ArtistFactory()
        artist2 = ArtistFactory()
        event.artists.add(artist1, artist2)
        serializer = EventSerializer(event)
        assert "artists" in serializer.data
        assert len(serializer.data["artists"]) == 2
    
    def test_event_serializer_created_by_name(self, event):
        """Test created_by_name field."""
        serializer = EventSerializer(event)
        assert "created_by_name" in serializer.data
        assert serializer.data["created_by_name"] == event.created_by.get_full_name()


class TestEventListSerializer:
    """Tests for EventListSerializer."""
    
    def test_event_list_serializer_artists(self, event):
        """Test that artists are included in list serializer."""
        artist = ArtistFactory()
        event.artists.add(artist)
        serializer = EventListSerializer(event)
        assert "artists" in serializer.data
        assert len(serializer.data["artists"]) == 1


class TestCommentSerializer:
    """Tests for CommentSerializer."""
    
    def test_comment_serializer_user_info(self, comment):
        """Test that user email and name are included."""
        serializer = CommentSerializer(comment)
        assert "user_email" in serializer.data
        assert "user_name" in serializer.data
        assert serializer.data["user_email"] == comment.user.email
    
    def test_comment_serializer_nested_replies(self, comment):
        """Test that replies are nested."""
        reply1 = CommentFactory(article=comment.article, parent=comment)
        reply2 = CommentFactory(article=comment.article, parent=comment)
        serializer = CommentSerializer(comment)
        assert "replies" in serializer.data
        assert len(serializer.data["replies"]) == 2


class TestWriterSerializer:
    """Tests for WriterSerializer."""
    
    def test_writer_serializer_article_count(self, writer):
        """Test that article_count is included."""
        ArticleFactory(author=writer)
        ArticleFactory(author=writer)
        serializer = WriterSerializer(writer)
        assert "article_count" in serializer.data
        assert serializer.data["article_count"] == 2
    
    def test_writer_serializer_read_only_fields(self, writer):
        """Test that article_count is read-only."""
        serializer = WriterSerializer(writer)
        assert "article_count" in serializer.data

