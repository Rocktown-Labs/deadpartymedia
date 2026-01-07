"""
Integration tests for content app.
"""
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from content.models import Artist
from content.tests.factories import UserFactory, ArtistFactory


@pytest.fixture
def api_client():
    """Return a DRF API client."""
    return APIClient()


@pytest.fixture
def authenticated_client(api_client, user):
    """Return an authenticated API client."""
    api_client.force_authenticate(user=user)
    return api_client


class TestSpotifyIntegration:
    """Tests for Spotify API integration."""
    
    def test_spotify_search_success(self, api_client, mocker, settings):
        """Test successful Spotify search."""
        settings.SPOTIFY_CLIENT_ID = "test_client_id"
        settings.SPOTIFY_CLIENT_SECRET = "test_secret"
        
        # Mock Spotify API
        mock_spotify = mocker.patch("content.api.views.spotipy.Spotify")
        mock_client = mocker.MagicMock()
        mock_spotify.return_value = mock_client
        
        mock_client.search.return_value = {
            "artists": {
                "items": [
                    {
                        "id": "test123",
                        "name": "Test Artist",
                        "images": [{"url": "https://example.com/image.jpg"}],
                        "external_urls": {"spotify": "https://open.spotify.com/artist/test123"},
                        "genres": ["edm", "electronic"],
                    }
                ]
            }
        }
        
        url = reverse("artist-search-spotify")
        response = api_client.get(url, {"q": "test"})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["name"] == "Test Artist"
        assert response.data[0]["id"] == "test123"
    
    def test_spotify_search_api_error(self, api_client, mocker, settings):
        """Test Spotify search with API error."""
        settings.SPOTIFY_CLIENT_ID = "test_client_id"
        settings.SPOTIFY_CLIENT_SECRET = "test_secret"
        
        # Mock Spotify API to raise exception
        mock_spotify = mocker.patch("content.api.views.spotipy.Spotify")
        mock_client = mocker.MagicMock()
        mock_spotify.return_value = mock_client
        mock_client.search.side_effect = Exception("API Error")
        
        url = reverse("artist-search-spotify")
        response = api_client.get(url, {"q": "test"})
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "error" in response.data
    
    def test_spotify_search_no_credentials(self, api_client, settings):
        """Test Spotify search when credentials are not configured."""
        settings.SPOTIFY_CLIENT_ID = ""
        settings.SPOTIFY_CLIENT_SECRET = ""
        
        url = reverse("artist-search-spotify")
        response = api_client.get(url, {"q": "test"})
        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE


class TestFileUploads:
    """Tests for file upload functionality."""
    
    def test_artist_image_upload(self, authenticated_client, user):
        """Test uploading artist profile image."""
        # Create a valid minimal PNG image (1x1 pixel)
        from io import BytesIO
        from PIL import Image
        
        img = Image.new('RGB', (1, 1), color='red')
        img_buffer = BytesIO()
        img.save(img_buffer, format='PNG')
        img_buffer.seek(0)
        
        image = SimpleUploadedFile(
            "test_image.png",
            img_buffer.read(),
            content_type="image/png"
        )
        
        url = reverse("artist-onboard")
        data = {
            "artistName": "Test Artist",
            "location": "New York",
            "genre": "EDM",
            "bio": "Test bio",
            "profileImage": image,
        }
        response = authenticated_client.post(url, data, format="multipart")
        assert response.status_code == status.HTTP_201_CREATED
        artist = Artist.objects.get(slug=response.data["slug"])
        assert artist.image is not None
    
    def test_artist_image_update(self, authenticated_client, user):
        """Test updating artist profile image."""
        from io import BytesIO
        from PIL import Image
        
        artist = ArtistFactory(claimed_by=user, claimed=True)
        
        # Create a valid minimal PNG image
        img = Image.new('RGB', (1, 1), color='blue')
        img_buffer = BytesIO()
        img.save(img_buffer, format='PNG')
        img_buffer.seek(0)
        
        new_image = SimpleUploadedFile(
            "new_image.png",
            img_buffer.read(),
            content_type="image/png"
        )
        
        url = reverse("artist-update-me")
        data = {
            "image": new_image,
        }
        response = authenticated_client.patch(url, data, format="multipart")
        assert response.status_code == status.HTTP_200_OK
        artist.refresh_from_db()
        assert artist.image is not None


class TestEmailSending:
    """Tests for email sending functionality."""
    
    @pytest.fixture
    def admin_site(self):
        """Return an AdminSite instance."""
        from django.contrib.admin.sites import AdminSite
        return AdminSite()
    
    def test_artist_claim_email_sent(self, admin_site, superuser, settings):
        """Test that artist claim email is sent on creation."""
        from django.core import mail
        from content.admin import ArtistAdmin
        from content.models import Artist
        
        settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
        admin = ArtistAdmin(Artist, admin_site)
        artist = Artist(email="artist@example.com", name="Test Artist")
        request = type("Request", (), {"user": superuser})()
        
        admin.save_model(request, artist, None, change=False)
        
        assert len(mail.outbox) == 1
        assert "claim" in mail.outbox[0].subject.lower()
        assert "artist@example.com" in mail.outbox[0].to
    
    def test_writer_invitation_email_sent(self, admin_site, superuser, settings):
        """Test that writer invitation email is sent on creation."""
        from django.core import mail
        from content.admin import WriterAdmin
        from content.models import Writer
        
        settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
        admin = WriterAdmin(Writer, admin_site)
        user = UserFactory(email="writer@example.com")
        writer = Writer(user=user, name="Test Writer")
        request = type("Request", (), {"user": superuser})()
        
        admin.save_model(request, writer, None, change=False)
        
        assert len(mail.outbox) == 1
        assert "writer" in mail.outbox[0].subject.lower()
        assert "writer@example.com" in mail.outbox[0].to


class TestAuthenticationFlows:
    """Tests for authentication flows."""
    
    def test_register_login_flow(self, api_client):
        """Test complete registration and login flow."""
        # Register
        register_url = reverse("register")
        register_data = {
            "email": "newuser@example.com",
            "password": "testpass123",
            "name": "New User",
            "userType": "fan",
        }
        register_response = api_client.post(register_url, register_data)
        assert register_response.status_code == status.HTTP_201_CREATED
        
        # Login
        login_url = reverse("login")
        login_data = {
            "email": "newuser@example.com",
            "password": "testpass123",
        }
        login_response = api_client.post(login_url, login_data)
        assert login_response.status_code == status.HTTP_200_OK
        assert login_response.data["email"] == "newuser@example.com"
    
    def test_login_logout_flow(self, api_client):
        """Test login and logout flow."""
        user = UserFactory(email="test@example.com")
        user.set_password("testpass123")
        user.save()
        
        # Login
        login_url = reverse("login")
        login_data = {
            "email": "test@example.com",
            "password": "testpass123",
        }
        login_response = api_client.post(login_url, login_data)
        assert login_response.status_code == status.HTTP_200_OK
        
        # Logout
        logout_url = reverse("logout")
        logout_response = api_client.post(logout_url)
        assert logout_response.status_code == status.HTTP_200_OK
    
    def test_authenticated_api_access(self, api_client):
        """Test that authenticated users can access protected endpoints."""
        user = UserFactory()
        user.set_password("testpass123")
        user.save()
        
        # Login
        login_url = reverse("login")
        api_client.post(login_url, {"email": user.email, "password": "testpass123"})
        
        # Access protected endpoint
        url = reverse("current_user")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
    
    def test_unauthenticated_api_access_denied(self, api_client):
        """Test that unauthenticated users cannot access protected endpoints."""
        url = reverse("current_user")
        response = api_client.get(url)
        # DRF returns 403 Forbidden when authentication is required
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

