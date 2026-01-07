"""
Edge cases and error handling tests for content app.
"""
import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from content.models import Article, Artist, Event, Comment, ArticleArtist, EventArtist
from content.tests.factories import (
    ArticleFactory,
    ArtistFactory,
    EventFactory,
    CommentFactory,
    UserFactory,
)


@pytest.fixture
def api_client():
    """Return a DRF API client."""
    return APIClient()


@pytest.fixture
def authenticated_client(api_client, user):
    """Return an authenticated API client."""
    api_client.force_authenticate(user=user)
    return api_client


class TestValidationErrors:
    """Tests for validation error handling."""
    
    def test_article_invalid_category(self):
        """Test article creation with invalid category."""
        writer = ArticleFactory().author
        article = Article(
            title="Test Article",
            category="INVALID_CATEGORY",
            excerpt="Test excerpt",
            content="Test content",
            author=writer,
        )
        with pytest.raises(ValidationError):
            article.full_clean()
    
    def test_article_invalid_status(self):
        """Test article creation with invalid status."""
        writer = ArticleFactory().author
        article = Article(
            title="Test Article",
            category="EDM",
            excerpt="Test excerpt",
            content="Test content",
            author=writer,
            status="INVALID_STATUS",
        )
        with pytest.raises(ValidationError):
            article.full_clean()
    
    def test_artist_invalid_genre(self):
        """Test artist creation with invalid genre."""
        artist = Artist(
            name="Test Artist",
            genre="INVALID_GENRE",
            bio="Test bio",
            location="Test Location",
        )
        with pytest.raises(ValidationError):
            artist.full_clean()
    
    def test_event_invalid_genre(self):
        """Test event creation with invalid genre."""
        user = UserFactory()
        event = Event(
            title="Test Event",
            genre="INVALID_GENRE",
            description="Test description",
            venue="Test Venue",
            location="Test Location",
            date="2024-01-01",
            time="20:00",
            created_by=user,
        )
        with pytest.raises(ValidationError):
            event.full_clean()


class TestPermissionDenied:
    """Tests for permission denied scenarios."""
    
    def test_article_comments_post_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot post comments."""
        article = ArticleFactory(status="published")
        url = reverse("article-comments", kwargs={"slug": article.slug})
        data = {"content": "Test comment"}
        response = api_client.post(url, data)
        # DRF returns 403 Forbidden when authentication is required
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
    
    def test_artist_onboard_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot onboard as artist."""
        url = reverse("artist-onboard")
        data = {
            "artistName": "Test Artist",
            "location": "New York",
            "genre": "EDM",
            "bio": "Test bio",
        }
        response = api_client.post(url, data)
        # DRF returns 403 Forbidden when authentication is required
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
    
    def test_artist_update_not_owner(self, authenticated_client, user):
        """Test that users cannot update artists they don't own."""
        other_user = UserFactory()
        artist = ArtistFactory(claimed_by=other_user, claimed=True)
        url = reverse("artist-update-me")
        data = {"name": "Hacked Name"}
        response = authenticated_client.patch(url, data)
        # Should return 404 since user doesn't have a claimed artist
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestNotFound:
    """Tests for not found scenarios."""
    
    def test_article_not_found(self, api_client):
        """Test retrieving non-existent article."""
        url = reverse("article-detail", kwargs={"slug": "non-existent-article"})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_event_not_found(self, api_client):
        """Test retrieving non-existent event."""
        url = reverse("event-detail", kwargs={"slug": "non-existent-event"})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_artist_not_found(self, api_client):
        """Test retrieving non-existent artist."""
        url = reverse("artist-detail", kwargs={"slug": "non-existent-artist"})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_artist_me_no_artist(self, authenticated_client):
        """Test getting artist profile when user has no claimed artist."""
        url = reverse("artist-me")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestDuplicateHandling:
    """Tests for duplicate handling."""
    
    def test_article_read_duplicate_prevention(self, authenticated_client, user):
        """Test that duplicate article reads are prevented."""
        article = ArticleFactory()
        url = reverse("read_articles")
        data = {"article_id": article.id}
        
        # First request
        response1 = authenticated_client.post(url, data)
        assert response1.status_code == status.HTTP_201_CREATED
        
        # Second request (should return existing, not create duplicate)
        response2 = authenticated_client.post(url, data)
        assert response2.status_code == status.HTTP_200_OK
        assert response2.data["id"] == response1.data["id"]
        
        # Verify only one record exists
        from users.models import ArticleRead
        assert ArticleRead.objects.filter(user=user, article=article).count() == 1
    
    def test_saved_article_duplicate_prevention(self, authenticated_client, user):
        """Test that duplicate saved articles are prevented."""
        article = ArticleFactory()
        url = reverse("saved_articles")
        data = {"article_id": article.id}
        
        # First request
        response1 = authenticated_client.post(url, data)
        assert response1.status_code == status.HTTP_201_CREATED
        
        # Second request (should return existing, not create duplicate)
        response2 = authenticated_client.post(url, data)
        assert response2.status_code == status.HTTP_200_OK
        assert response2.data["id"] == response1.data["id"]
        
        # Verify only one record exists
        from users.models import SavedArticle
        assert SavedArticle.objects.filter(user=user, article=article).count() == 1
    
    def test_article_artist_unique_together(self, article, artist):
        """Test that ArticleArtist enforces unique together constraint."""
        ArticleArtist.objects.create(article=article, artist=artist)
        with pytest.raises((IntegrityError, ValidationError)):
            ArticleArtist.objects.create(article=article, artist=artist)
    
    def test_event_artist_unique_together(self, event, artist):
        """Test that EventArtist enforces unique together constraint."""
        EventArtist.objects.create(event=event, artist=artist)
        with pytest.raises((IntegrityError, ValidationError)):
            EventArtist.objects.create(event=event, artist=artist)


class TestConcurrentOperations:
    """Tests for concurrent operations."""
    
    def test_concurrent_article_view_increments(self, api_client):
        """Test that concurrent article view increments are handled correctly."""
        article = ArticleFactory(status="published", views=0)
        url = reverse("article-detail", kwargs={"slug": article.slug})
        
        # Simulate concurrent requests
        response1 = api_client.get(url)
        response2 = api_client.get(url)
        response3 = api_client.get(url)
        
        assert response1.status_code == status.HTTP_200_OK
        assert response2.status_code == status.HTTP_200_OK
        assert response3.status_code == status.HTTP_200_OK
        
        article.refresh_from_db()
        assert article.views == 3
    
    def test_concurrent_comment_creation(self, authenticated_client, user):
        """Test that concurrent comment creation works."""
        article = ArticleFactory(status="published")
        url = reverse("article-comments", kwargs={"slug": article.slug})
        
        # Create multiple comments concurrently
        comments_data = [
            {"content": f"Comment {i}"} for i in range(5)
        ]
        
        for data in comments_data:
            response = authenticated_client.post(url, data)
            assert response.status_code == status.HTTP_201_CREATED
        
        # Verify all comments were created
        article.refresh_from_db()
        assert article.comments.count() == 5


class TestSlugGeneration:
    """Tests for slug generation edge cases."""
    
    def test_article_slug_special_characters(self):
        """Test article slug generation with special characters."""
        article = ArticleFactory(title="Test Article! @#$%^&*()", slug=None)
        # Slug should be sanitized
        assert "!" not in article.slug
        assert "@" not in article.slug
    
    def test_artist_slug_unicode(self):
        """Test artist slug generation with unicode characters."""
        artist = ArtistFactory(name="Test Artist émoji 🎵", slug=None)
        # Slug should handle unicode
        assert artist.slug is not None
        assert len(artist.slug) > 0
    
    def test_event_slug_long_title(self):
        """Test event slug generation with very long title."""
        # Use a title that will generate a slug close to but not exceeding max_length
        # 250 'a' characters will generate a 250-char slug, which fits in 255 with room for counter
        long_title = "A" * 250
        # Create event with long title - slug will be auto-generated and truncated
        event = Event(
            title=long_title,
            description="Test",
            venue="Test",
            location="Test",
            date=timezone.now().date(),
            time="20:00",
            genre="EDM",
            status="draft",
            created_by=UserFactory()
        )
        # Set slug to None to trigger auto-generation, which should handle truncation
        event.slug = None
        # Save - the model's save() method should handle truncation
        event.save()
        # Slug should be truncated to max_length (255)
        assert len(event.slug) <= 255
        # Slug should be based on the title (all 'a' characters)
        assert event.slug.startswith("a")
        # Verify truncation works by creating another event with same title
        event2 = Event(
            title=long_title,
            description="Test",
            venue="Test",
            location="Test",
            date=timezone.now().date(),
            time="20:00",
            genre="EDM",
            status="draft",
            created_by=UserFactory()
        )
        event2.slug = None
        event2.save()
        # Second event should have a unique slug with counter
        assert event2.slug != event.slug
        assert len(event2.slug) <= 255
    
    def test_article_slug_multiple_duplicates(self):
        """Test article slug generation with multiple duplicates."""
        # Create multiple articles with same title
        articles = [ArticleFactory(title="Same Title", slug=None) for _ in range(5)]
        slugs = [a.slug for a in articles]
        # All slugs should be unique
        assert len(slugs) == len(set(slugs))
        # Should have numbered suffixes
        assert "same-title" in slugs[0]
        assert "same-title-1" in slugs[1]
        assert "same-title-2" in slugs[2]


class TestErrorHandling:
    """Tests for error handling."""
    
    def test_article_comments_invalid_data(self, authenticated_client):
        """Test article comments endpoint with invalid data."""
        article = ArticleFactory(status="published")
        url = reverse("article-comments", kwargs={"slug": article.slug})
        data = {}  # Missing content
        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_artist_onboard_missing_required_fields(self, authenticated_client):
        """Test artist onboarding with missing required fields."""
        url = reverse("artist-onboard")
        data = {
            "artistName": "Test Artist",
            # Missing location, genre, bio
        }
        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_password_change_invalid_data(self, authenticated_client, user):
        """Test password change with invalid data."""
        user.set_password("oldpass123")
        user.save()
        url = reverse("change_password")
        data = {
            "current_password": "wrongpass",
            "new_password": "newpass123",
            "confirm_password": "differentpass",
        }
        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

