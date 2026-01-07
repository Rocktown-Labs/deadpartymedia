"""
Tests for content app API endpoints.
"""
import pytest
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.test import APIClient
from content.models import Article, Event, Artist, Writer, Comment
from content.tests.factories import (
    ArticleFactory,
    EventFactory,
    ArtistFactory,
    WriterFactory,
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


class TestArticleViewSet:
    """Tests for ArticleViewSet."""
    
    def test_list_articles_unauthenticated(self, api_client):
        """Test that unauthenticated users can list articles."""
        ArticleFactory(status="published")
        ArticleFactory(status="published")
        url = reverse("article-list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 2
    
    def test_list_articles_only_published(self, api_client):
        """Test that only published articles are returned."""
        ArticleFactory(status="published")
        ArticleFactory(status="draft")
        ArticleFactory(status="archived")
        url = reverse("article-list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        # Status is not in list serializer, check by retrieving detail
        article_slug = response.data["results"][0]["slug"]
        detail_url = reverse("article-detail", kwargs={"slug": article_slug})
        detail_response = api_client.get(detail_url)
        assert detail_response.data["status"] == "published"
    
    def test_list_articles_filter_by_category(self, api_client):
        """Test filtering articles by category."""
        ArticleFactory(status="published", category="EDM")
        ArticleFactory(status="published", category="COUNTRY")
        url = reverse("article-list")
        response = api_client.get(url, {"category": "EDM"})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["category"] == "EDM"
    
    def test_list_articles_search(self, api_client):
        """Test searching articles by title and excerpt."""
        ArticleFactory(status="published", title="EDM Festival Review")
        ArticleFactory(status="published", title="Country Music News")
        url = reverse("article-list")
        response = api_client.get(url, {"search": "EDM"})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert "EDM" in response.data["results"][0]["title"]
    
    def test_list_articles_filter_by_artist(self, api_client):
        """Test filtering articles by artist slug."""
        artist = ArtistFactory()
        article1 = ArticleFactory(status="published")
        article2 = ArticleFactory(status="published")
        article1.artists.add(artist)
        url = reverse("article-list")
        response = api_client.get(url, {"artist": artist.slug})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["id"] == article1.id
    
    def test_list_articles_filter_by_writer(self, api_client):
        """Test filtering articles by writer ID."""
        writer = WriterFactory()
        article1 = ArticleFactory(status="published", author=writer)
        article2 = ArticleFactory(status="published")
        url = reverse("article-list")
        response = api_client.get(url, {"writer": writer.id})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["id"] == article1.id
    
    def test_retrieve_article_unauthenticated(self, api_client):
        """Test that unauthenticated users can retrieve articles."""
        article = ArticleFactory(status="published")
        url = reverse("article-detail", kwargs={"slug": article.slug})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["slug"] == article.slug
        assert response.data["title"] == article.title
    
    def test_retrieve_article_increments_views(self, api_client):
        """Test that retrieving an article increments view count."""
        article = ArticleFactory(status="published", views=10)
        url = reverse("article-detail", kwargs={"slug": article.slug})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        article.refresh_from_db()
        assert article.views == 11
    
    def test_retrieve_article_not_found(self, api_client):
        """Test retrieving non-existent article."""
        url = reverse("article-detail", kwargs={"slug": "non-existent"})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_article_pagination(self, api_client):
        """Test article list pagination."""
        # Create more than PAGE_SIZE articles
        for _ in range(25):
            ArticleFactory(status="published")
        url = reverse("article-list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data
        assert "count" in response.data
        assert "next" in response.data
        assert len(response.data["results"]) == 20  # PAGE_SIZE
    
    def test_article_comments_get(self, api_client):
        """Test getting comments for an article."""
        article = ArticleFactory(status="published")
        comment1 = CommentFactory(article=article, parent=None)
        comment2 = CommentFactory(article=article, parent=None)
        reply = CommentFactory(article=article, parent=comment1)
        url = reverse("article-comments", kwargs={"slug": article.slug})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2  # Only top-level comments
        # Check that replies are nested
        comment_with_replies = next(c for c in response.data if c["id"] == comment1.id)
        assert len(comment_with_replies["replies"]) == 1
    
    def test_article_comments_post_authenticated(self, authenticated_client, user):
        """Test posting a comment when authenticated."""
        article = ArticleFactory(status="published")
        url = reverse("article-comments", kwargs={"slug": article.slug})
        data = {"content": "Great article!"}
        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["content"] == "Great article!"
        assert Comment.objects.filter(article=article, user=user).exists()
    
    def test_article_comments_post_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot post comments."""
        article = ArticleFactory(status="published")
        url = reverse("article-comments", kwargs={"slug": article.slug})
        data = {"content": "Great article!"}
        response = api_client.post(url, data)
        # DRF returns 403 Forbidden when authentication is required
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
    
    def test_article_comments_post_invalid_data(self, authenticated_client):
        """Test posting comment with invalid data."""
        article = ArticleFactory(status="published")
        url = reverse("article-comments", kwargs={"slug": article.slug})
        data = {}  # Missing content
        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestEventViewSet:
    """Tests for EventViewSet."""
    
    def test_list_events_unauthenticated(self, api_client):
        """Test that unauthenticated users can list events."""
        EventFactory(status="published")
        EventFactory(status="published")
        url = reverse("event-list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 2
    
    def test_list_events_only_published(self, api_client):
        """Test that only published events are returned."""
        EventFactory(status="published")
        EventFactory(status="draft")
        EventFactory(status="past")
        url = reverse("event-list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        # Status is not in list serializer, check by retrieving detail
        event_slug = response.data["results"][0]["slug"]
        detail_url = reverse("event-detail", kwargs={"slug": event_slug})
        detail_response = api_client.get(detail_url)
        assert detail_response.data["status"] == "published"
    
    def test_list_events_filter_by_genre(self, api_client):
        """Test filtering events by genre."""
        EventFactory(status="published", genre="EDM")
        EventFactory(status="published", genre="COUNTRY")
        url = reverse("event-list")
        response = api_client.get(url, {"genre": "EDM"})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["genre"] == "EDM"
    
    def test_list_events_filter_by_date_from(self, api_client):
        """Test filtering events by date_from."""
        future_date = timezone.now().date() + timedelta(days=30)
        past_date = timezone.now().date() - timedelta(days=30)
        EventFactory(status="published", date=future_date)
        EventFactory(status="published", date=past_date)
        url = reverse("event-list")
        response = api_client.get(url, {"date_from": timezone.now().date().isoformat()})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["date"] == future_date.isoformat()
    
    def test_list_events_filter_by_date_to(self, api_client):
        """Test filtering events by date_to."""
        future_date = timezone.now().date() + timedelta(days=30)
        past_date = timezone.now().date() - timedelta(days=30)
        EventFactory(status="published", date=future_date)
        EventFactory(status="published", date=past_date)
        url = reverse("event-list")
        response = api_client.get(url, {"date_to": timezone.now().date().isoformat()})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["date"] == past_date.isoformat()
    
    def test_retrieve_event_unauthenticated(self, api_client):
        """Test that unauthenticated users can retrieve events."""
        event = EventFactory(status="published")
        url = reverse("event-detail", kwargs={"slug": event.slug})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["slug"] == event.slug
        assert response.data["title"] == event.title
    
    def test_retrieve_event_not_found(self, api_client):
        """Test retrieving non-existent event."""
        url = reverse("event-detail", kwargs={"slug": "non-existent"})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_event_pagination(self, api_client):
        """Test event list pagination."""
        for _ in range(25):
            EventFactory(status="published")
        url = reverse("event-list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data
        assert len(response.data["results"]) == 20


class TestArtistViewSet:
    """Tests for ArtistViewSet."""
    
    def test_list_artists_unauthenticated(self, api_client):
        """Test that unauthenticated users can list artists."""
        ArtistFactory()
        ArtistFactory()
        url = reverse("artist-list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 2
    
    def test_list_artists_filter_by_genre(self, api_client):
        """Test filtering artists by genre."""
        ArtistFactory(genre="EDM")
        ArtistFactory(genre="COUNTRY")
        url = reverse("artist-list")
        response = api_client.get(url, {"genre": "EDM"})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["genre"] == "EDM"
    
    def test_retrieve_artist_unauthenticated(self, api_client):
        """Test that unauthenticated users can retrieve artists."""
        artist = ArtistFactory()
        url = reverse("artist-detail", kwargs={"slug": artist.slug})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["slug"] == artist.slug
        assert response.data["name"] == artist.name
    
    def test_retrieve_artist_not_found(self, api_client):
        """Test retrieving non-existent artist."""
        url = reverse("artist-detail", kwargs={"slug": "non-existent"})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_artist_articles_action(self, api_client):
        """Test getting articles for an artist."""
        artist = ArtistFactory()
        article1 = ArticleFactory(status="published")
        article2 = ArticleFactory(status="published")
        article3 = ArticleFactory(status="draft")  # Should not be included
        article1.artists.add(artist)
        article2.artists.add(artist)
        article3.artists.add(artist)
        url = reverse("artist-articles", kwargs={"slug": artist.slug})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2
        article_ids = [a["id"] for a in response.data]
        assert article1.id in article_ids
        assert article2.id in article_ids
        assert article3.id not in article_ids
    
    def test_artist_events_action(self, api_client):
        """Test getting events for an artist."""
        artist = ArtistFactory()
        event1 = EventFactory(status="published")
        event2 = EventFactory(status="published")
        event3 = EventFactory(status="draft")  # Should not be included
        event1.artists.add(artist)
        event2.artists.add(artist)
        event3.artists.add(artist)
        url = reverse("artist-events", kwargs={"slug": artist.slug})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2
        event_ids = [e["id"] for e in response.data]
        assert event1.id in event_ids
        assert event2.id in event_ids
        assert event3.id not in event_ids
    
    def test_artist_onboard_authenticated(self, authenticated_client, user):
        """Test artist onboarding when authenticated."""
        url = reverse("artist-onboard")
        data = {
            "artistName": "New Artist",
            "location": "New York",
            "genre": "EDM",
            "bio": "A new artist",
            "spotifyId": "4iHNK0tOyZPYnBU7iGc4UU",
        }
        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "New Artist"
        assert response.data["claimed"] is True
        artist = Artist.objects.get(slug=response.data["slug"])
        assert artist.claimed_by == user
    
    def test_artist_onboard_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot onboard."""
        url = reverse("artist-onboard")
        data = {
            "artistName": "New Artist",
            "location": "New York",
            "genre": "EDM",
            "bio": "A new artist",
        }
        response = api_client.post(url, data)
        # DRF returns 403 Forbidden when authentication is required
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
    
    def test_artist_me_action_authenticated(self, authenticated_client, user):
        """Test getting current user's artist profile."""
        artist = ArtistFactory(claimed=True, claimed_by=user)
        url = reverse("artist-me")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["slug"] == artist.slug
    
    def test_artist_me_action_no_artist(self, authenticated_client):
        """Test getting artist profile when user has no claimed artist."""
        url = reverse("artist-me")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_artist_update_me_action(self, authenticated_client, user):
        """Test updating current user's artist profile."""
        artist = ArtistFactory(claimed=True, claimed_by=user, name="Old Name")
        url = reverse("artist-update-me")
        data = {"name": "New Name", "bio": "Updated bio"}
        response = authenticated_client.patch(url, data)
        assert response.status_code == status.HTTP_200_OK
        artist.refresh_from_db()
        assert artist.name == "New Name"
        assert artist.bio == "Updated bio"
    
    def test_artist_update_me_action_no_artist(self, authenticated_client):
        """Test updating artist profile when user has no claimed artist."""
        url = reverse("artist-update-me")
        data = {"name": "New Name"}
        response = authenticated_client.patch(url, data)
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    @pytest.mark.parametrize("spotify_id", [
        "4iHNK0tOyZPYnBU7iGc4UU",  # Just ID
        "https://open.spotify.com/artist/4iHNK0tOyZPYnBU7iGc4UU",  # Full URL
        "spotify:artist:4iHNK0tOyZPYnBU7iGc4UU",  # URI format
    ])
    def test_artist_onboard_spotify_id_formats(self, authenticated_client, spotify_id):
        """Test artist onboarding with different Spotify ID formats."""
        url = reverse("artist-onboard")
        data = {
            "artistName": "Test Artist",
            "location": "New York",
            "genre": "EDM",
            "bio": "Test bio",
            "spotifyId": spotify_id,
        }
        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        artist = Artist.objects.get(slug=response.data["slug"])
        assert artist.spotify_artist_id is not None
    
    @pytest.mark.parametrize("query,expected_status", [
        ("test", status.HTTP_200_OK),
        ("", status.HTTP_200_OK),  # Empty query returns empty list
        ("a", status.HTTP_200_OK),  # Short query returns empty list
    ])
    def test_artist_search_spotify(self, api_client, query, expected_status, mocker):
        """Test Spotify search functionality."""
        # Mock Spotify API
        mock_spotify = mocker.patch("content.api.views.spotipy.Spotify")
        mock_client = mocker.MagicMock()
        mock_spotify.return_value = mock_client
        
        if query and len(query) >= 2:
            mock_client.search.return_value = {
                "artists": {
                    "items": [
                        {
                            "id": "test123",
                            "name": "Test Artist",
                            "images": [],
                            "external_urls": {"spotify": "https://open.spotify.com/artist/test123"},
                            "genres": ["edm"],
                        }
                    ]
                }
            }
        
        url = reverse("artist-search-spotify")
        response = api_client.get(url, {"q": query})
        assert response.status_code == expected_status
        if query and len(query) >= 2:
            assert len(response.data) > 0
        else:
            assert len(response.data) == 0
    
    def test_artist_search_spotify_no_credentials(self, api_client, mocker, settings):
        """Test Spotify search when credentials are not configured."""
        settings.SPOTIFY_CLIENT_ID = ""
        settings.SPOTIFY_CLIENT_SECRET = ""
        url = reverse("artist-search-spotify")
        response = api_client.get(url, {"q": "test"})
        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE


class TestWriterViewSet:
    """Tests for WriterViewSet."""
    
    def test_list_writers_unauthenticated(self, api_client):
        """Test that unauthenticated users can list writers."""
        WriterFactory()
        WriterFactory()
        url = reverse("writer-list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 2
    
    def test_retrieve_writer_unauthenticated(self, api_client):
        """Test that unauthenticated users can retrieve writers."""
        writer = WriterFactory()
        url = reverse("writer-detail", kwargs={"pk": writer.pk})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == writer.id
        assert response.data["name"] == writer.name


class TestCategoryViewSet:
    """Tests for CategoryViewSet."""
    
    def test_list_categories_unauthenticated(self, api_client):
        """Test that unauthenticated users can list categories."""
        ArticleFactory(status="published", category="EDM")
        ArticleFactory(status="published", category="EDM")
        ArticleFactory(status="published", category="COUNTRY")
        ArticleFactory(status="draft", category="EDM")  # Should not be counted
        url = reverse("category-list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2
        edm_category = next(c for c in response.data if c["category"] == "EDM")
        assert edm_category["count"] == 2

