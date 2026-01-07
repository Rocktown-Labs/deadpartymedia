"""
Tests for users app API endpoints.
"""
import pytest
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient
from users.models import ArticleRead, SavedArticle
from content.models import Comment
from users.tests.factories import UserFactory, ArticleReadFactory, SavedArticleFactory
from content.tests.factories import ArticleFactory, CommentFactory

User = get_user_model()


@pytest.fixture
def api_client():
    """Return a DRF API client."""
    return APIClient()


@pytest.fixture
def authenticated_client(api_client, user):
    """Return an authenticated API client."""
    api_client.force_authenticate(user=user)
    return api_client


class TestAuthenticationEndpoints:
    """Tests for authentication endpoints."""
    
    def test_register_success(self, api_client):
        """Test successful user registration."""
        url = reverse("register")
        data = {
            "email": "newuser@example.com",
            "password": "testpass123",
            "name": "New User",
            "userType": "fan",
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["email"] == "newuser@example.com"
        assert response.data["role"] == "fan"
        assert User.objects.filter(email="newuser@example.com").exists()
    
    def test_register_artist_role(self, api_client):
        """Test user registration with artist role."""
        url = reverse("register")
        data = {
            "email": "artist@example.com",
            "password": "testpass123",
            "name": "Artist User",
            "userType": "artist",
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["role"] == "artist"
    
    def test_register_missing_fields(self, api_client):
        """Test registration with missing required fields."""
        url = reverse("register")
        data = {"email": "test@example.com"}  # Missing password and name
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_register_duplicate_email(self, api_client):
        """Test registration with existing email."""
        UserFactory(email="existing@example.com")
        url = reverse("register")
        data = {
            "email": "existing@example.com",
            "password": "testpass123",
            "name": "New User",
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_login_success(self, api_client):
        """Test successful user login."""
        user = UserFactory(email="test@example.com")
        user.set_password("testpass123")
        user.save()
        url = reverse("login")
        data = {
            "email": "test@example.com",
            "password": "testpass123",
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["email"] == "test@example.com"
    
    def test_login_invalid_credentials(self, api_client):
        """Test login with invalid credentials."""
        UserFactory(email="test@example.com")
        url = reverse("login")
        data = {
            "email": "test@example.com",
            "password": "wrongpassword",
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_login_missing_credentials(self, api_client):
        """Test login with missing credentials."""
        url = reverse("login")
        data = {}  # Missing email and password
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_logout_authenticated(self, authenticated_client):
        """Test logout when authenticated."""
        url = reverse("logout")
        response = authenticated_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["message"] == "Logged out successfully"
    
    def test_logout_unauthenticated(self, api_client):
        """Test logout when not authenticated."""
        url = reverse("logout")
        response = api_client.post(url)
        assert response.status_code == status.HTTP_200_OK  # Should still succeed


class TestUserProfileEndpoints:
    """Tests for user profile endpoints."""
    
    def test_current_user_get_authenticated(self, authenticated_client, user):
        """Test getting current user profile when authenticated."""
        url = reverse("current_user")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["email"] == user.email
        assert response.data["id"] == user.id
    
    def test_current_user_get_unauthenticated(self, api_client):
        """Test getting current user profile when not authenticated."""
        url = reverse("current_user")
        response = api_client.get(url)
        # DRF returns 403 Forbidden when authentication is required
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
    
    def test_current_user_update_put(self, authenticated_client, user):
        """Test updating user profile with PUT."""
        url = reverse("current_user")
        data = {
            "first_name": "Updated",
            "last_name": "Name",
            "email": user.email,
        }
        response = authenticated_client.put(url, data)
        assert response.status_code == status.HTTP_200_OK
        user.refresh_from_db()
        assert user.first_name == "Updated"
        assert user.last_name == "Name"
    
    def test_current_user_update_patch(self, authenticated_client, user):
        """Test partially updating user profile with PATCH."""
        url = reverse("current_user")
        data = {"first_name": "New First Name"}
        response = authenticated_client.patch(url, data)
        assert response.status_code == status.HTTP_200_OK
        user.refresh_from_db()
        assert user.first_name == "New First Name"
    
    def test_current_user_update_unauthenticated(self, api_client):
        """Test updating user profile when not authenticated."""
        url = reverse("current_user")
        data = {"first_name": "Updated"}
        response = api_client.patch(url, data)
        # DRF returns 403 Forbidden when authentication is required
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
    
    def test_change_password_success(self, authenticated_client, user):
        """Test successful password change."""
        user.set_password("oldpass123")
        user.save()
        url = reverse("change_password")
        data = {
            "current_password": "oldpass123",
            "new_password": "newpass123",
            "confirm_password": "newpass123",
        }
        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_200_OK
        user.refresh_from_db()
        assert user.check_password("newpass123")
    
    def test_change_password_wrong_current(self, authenticated_client, user):
        """Test password change with wrong current password."""
        user.set_password("oldpass123")
        user.save()
        url = reverse("change_password")
        data = {
            "current_password": "wrongpass",
            "new_password": "newpass123",
            "confirm_password": "newpass123",
        }
        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_change_password_mismatch(self, authenticated_client, user):
        """Test password change with mismatched passwords."""
        user.set_password("oldpass123")
        user.save()
        url = reverse("change_password")
        data = {
            "current_password": "oldpass123",
            "new_password": "newpass123",
            "confirm_password": "differentpass",
        }
        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_change_password_unauthenticated(self, api_client):
        """Test password change when not authenticated."""
        url = reverse("change_password")
        data = {
            "current_password": "oldpass123",
            "new_password": "newpass123",
            "confirm_password": "newpass123",
        }
        response = api_client.post(url, data)
        # DRF returns 403 Forbidden when authentication is required
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]


class TestUserActivityEndpoints:
    """Tests for user activity endpoints."""
    
    def test_read_articles_get(self, authenticated_client, user):
        """Test getting user's read articles."""
        article1 = ArticleFactory()
        article2 = ArticleFactory()
        ArticleReadFactory(user=user, article=article1)
        ArticleReadFactory(user=user, article=article2)
        url = reverse("read_articles")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 2
    
    def test_read_articles_post(self, authenticated_client, user):
        """Test marking an article as read."""
        article = ArticleFactory()
        url = reverse("read_articles")
        data = {"article_id": article.id}
        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert ArticleRead.objects.filter(user=user, article=article).exists()
    
    def test_read_articles_post_idempotent(self, authenticated_client, user):
        """Test that marking article as read is idempotent."""
        article = ArticleFactory()
        ArticleReadFactory(user=user, article=article)
        url = reverse("read_articles")
        data = {"article_id": article.id}
        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_200_OK  # Should return existing
        assert ArticleRead.objects.filter(user=user, article=article).count() == 1
    
    def test_read_articles_post_missing_article_id(self, authenticated_client):
        """Test marking article as read without article_id."""
        url = reverse("read_articles")
        data = {}
        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_read_articles_unauthenticated(self, api_client):
        """Test read articles endpoint when not authenticated."""
        url = reverse("read_articles")
        response = api_client.get(url)
        # DRF returns 403 Forbidden when authentication is required
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
    
    def test_read_articles_pagination(self, authenticated_client, user):
        """Test read articles pagination."""
        for _ in range(25):
            article = ArticleFactory()
            ArticleReadFactory(user=user, article=article)
        url = reverse("read_articles")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 20
        assert "next" in response.data
    
    def test_saved_articles_get(self, authenticated_client, user):
        """Test getting user's saved articles."""
        article1 = ArticleFactory()
        article2 = ArticleFactory()
        SavedArticleFactory(user=user, article=article1)
        SavedArticleFactory(user=user, article=article2)
        url = reverse("saved_articles")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 2
    
    def test_saved_articles_post(self, authenticated_client, user):
        """Test saving an article."""
        article = ArticleFactory()
        url = reverse("saved_articles")
        data = {"article_id": article.id}
        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert SavedArticle.objects.filter(user=user, article=article).exists()
    
    def test_saved_articles_post_idempotent(self, authenticated_client, user):
        """Test that saving article is idempotent."""
        article = ArticleFactory()
        SavedArticleFactory(user=user, article=article)
        url = reverse("saved_articles")
        data = {"article_id": article.id}
        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_200_OK  # Should return existing
        assert SavedArticle.objects.filter(user=user, article=article).count() == 1
    
    def test_saved_articles_delete(self, authenticated_client, user):
        """Test unsaving an article."""
        article = ArticleFactory()
        saved_article = SavedArticleFactory(user=user, article=article)
        url = reverse("unsave_article", kwargs={"saved_id": saved_article.id})
        response = authenticated_client.delete(url)
        assert response.status_code == status.HTTP_200_OK
        assert not SavedArticle.objects.filter(id=saved_article.id).exists()
    
    def test_saved_articles_delete_not_owner(self, authenticated_client):
        """Test deleting saved article that doesn't belong to user."""
        other_user = UserFactory()
        article = ArticleFactory()
        saved_article = SavedArticleFactory(user=other_user, article=article)
        url = reverse("unsave_article", kwargs={"saved_id": saved_article.id})
        response = authenticated_client.delete(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_saved_articles_unauthenticated(self, api_client):
        """Test saved articles endpoint when not authenticated."""
        url = reverse("saved_articles")
        response = api_client.get(url)
        # DRF returns 403 Forbidden when authentication is required
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
    
    def test_saved_articles_pagination(self, authenticated_client, user):
        """Test saved articles pagination."""
        for _ in range(25):
            article = ArticleFactory()
            SavedArticleFactory(user=user, article=article)
        url = reverse("saved_articles")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 20
        assert "next" in response.data
    
    def test_user_comments_get(self, authenticated_client, user):
        """Test getting user's comments."""
        comment1 = CommentFactory(user=user, parent=None)
        comment2 = CommentFactory(user=user, parent=None)
        reply = CommentFactory(user=user, parent=comment1)
        url = reverse("user_comments")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 2  # Only top-level comments
        # Check that replies are nested
        comment_with_replies = next(c for c in response.data["results"] if c["id"] == comment1.id)
        assert len(comment_with_replies["replies"]) == 1
    
    def test_user_comments_unauthenticated(self, api_client):
        """Test user comments endpoint when not authenticated."""
        url = reverse("user_comments")
        response = api_client.get(url)
        # DRF returns 403 Forbidden when authentication is required
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
    
    def test_user_comments_pagination(self, authenticated_client, user):
        """Test user comments pagination."""
        for _ in range(25):
            CommentFactory(user=user, parent=None)
        url = reverse("user_comments")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 20
        assert "next" in response.data
    
    def test_dashboard_stats(self, authenticated_client, user):
        """Test getting dashboard statistics."""
        article1 = ArticleFactory()
        article2 = ArticleFactory()
        ArticleReadFactory(user=user, article=article1)
        SavedArticleFactory(user=user, article=article2)
        CommentFactory(user=user)
        url = reverse("dashboard_stats")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["articles_read_count"] == 1
        assert response.data["articles_saved_count"] == 1
        assert response.data["comments_count"] == 1
    
    def test_dashboard_stats_empty(self, authenticated_client, user):
        """Test dashboard stats with no activity."""
        url = reverse("dashboard_stats")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["articles_read_count"] == 0
        assert response.data["articles_saved_count"] == 0
        assert response.data["comments_count"] == 0
    
    def test_dashboard_stats_unauthenticated(self, api_client):
        """Test dashboard stats endpoint when not authenticated."""
        url = reverse("dashboard_stats")
        response = api_client.get(url)
        # DRF returns 403 Forbidden when authentication is required
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

