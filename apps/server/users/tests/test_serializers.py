"""
Tests for users app serializers.
"""
import pytest
from django.contrib.auth import get_user_model
from users.serializers import (
    UserUpdateSerializer,
    PasswordChangeSerializer,
    ArticleReadSerializer,
    SavedArticleSerializer,
    UserCommentSerializer,
    DashboardStatsSerializer,
)
from users.tests.factories import UserFactory, ArticleReadFactory, SavedArticleFactory
from content.tests.factories import ArticleFactory, CommentFactory

User = get_user_model()


class TestUserUpdateSerializer:
    """Tests for UserUpdateSerializer."""
    
    def test_user_update_serializer_valid_data(self, user):
        """Test serializer with valid data."""
        data = {
            "first_name": "Updated",
            "last_name": "Name",
            "email": "updated@example.com",
        }
        serializer = UserUpdateSerializer(user, data=data)
        assert serializer.is_valid()
        updated_user = serializer.save()
        assert updated_user.first_name == "Updated"
        assert updated_user.last_name == "Name"
        assert updated_user.email == "updated@example.com"
    
    def test_user_update_serializer_email_uniqueness(self, user):
        """Test that email must be unique."""
        other_user = UserFactory(email="existing@example.com")
        data = {
            "email": "existing@example.com",
        }
        serializer = UserUpdateSerializer(user, data=data)
        assert not serializer.is_valid()
        assert "email" in serializer.errors
    
    def test_user_update_serializer_email_same_user(self, user):
        """Test that user can keep their own email."""
        data = {
            "email": user.email,
        }
        serializer = UserUpdateSerializer(user, data=data)
        assert serializer.is_valid()
    
    def test_user_update_serializer_partial_update(self, user):
        """Test partial update."""
        data = {
            "first_name": "New First",
        }
        serializer = UserUpdateSerializer(user, data=data, partial=True)
        assert serializer.is_valid()
        updated_user = serializer.save()
        assert updated_user.first_name == "New First"
        # Other fields should remain unchanged
        assert updated_user.last_name == user.last_name


class TestPasswordChangeSerializer:
    """Tests for PasswordChangeSerializer."""
    
    def test_password_change_serializer_valid_data(self, user):
        """Test serializer with valid password change data."""
        user.set_password("oldpass123")
        user.save()
        data = {
            "current_password": "oldpass123",
            "new_password": "newpass123",
            "confirm_password": "newpass123",
        }
        serializer = PasswordChangeSerializer(data=data, context={"request": type("Request", (), {"user": user})()})
        assert serializer.is_valid()
    
    def test_password_change_serializer_wrong_current_password(self, user):
        """Test serializer with wrong current password."""
        user.set_password("oldpass123")
        user.save()
        data = {
            "current_password": "wrongpass",
            "new_password": "newpass123",
            "confirm_password": "newpass123",
        }
        serializer = PasswordChangeSerializer(data=data, context={"request": type("Request", (), {"user": user})()})
        assert not serializer.is_valid()
        assert "current_password" in serializer.errors
    
    def test_password_change_serializer_password_mismatch(self, user):
        """Test serializer with mismatched passwords."""
        user.set_password("oldpass123")
        user.save()
        data = {
            "current_password": "oldpass123",
            "new_password": "newpass123",
            "confirm_password": "differentpass",
        }
        serializer = PasswordChangeSerializer(data=data, context={"request": type("Request", (), {"user": user})()})
        assert not serializer.is_valid()
        assert "confirm_password" in serializer.errors or "non_field_errors" in serializer.errors
    
    def test_password_change_serializer_min_length(self, user):
        """Test that new password must meet minimum length."""
        user.set_password("oldpass123")
        user.save()
        data = {
            "current_password": "oldpass123",
            "new_password": "short",
            "confirm_password": "short",
        }
        serializer = PasswordChangeSerializer(data=data, context={"request": type("Request", (), {"user": user})()})
        assert not serializer.is_valid()
        assert "new_password" in serializer.errors


class TestArticleReadSerializer:
    """Tests for ArticleReadSerializer."""
    
    def test_article_read_serializer_nested_article(self, user):
        """Test that article is serialized with details."""
        article = ArticleFactory()
        article_read = ArticleReadFactory(user=user, article=article)
        serializer = ArticleReadSerializer(article_read)
        assert "article" in serializer.data
        assert serializer.data["article"]["id"] == article.id
        assert serializer.data["article"]["title"] == article.title
    
    def test_article_read_serializer_read_at(self, user):
        """Test that read_at is included."""
        article_read = ArticleReadFactory(user=user)
        serializer = ArticleReadSerializer(article_read)
        assert "read_at" in serializer.data


class TestSavedArticleSerializer:
    """Tests for SavedArticleSerializer."""
    
    def test_saved_article_serializer_nested_article(self, user):
        """Test that article is serialized with details."""
        article = ArticleFactory()
        saved_article = SavedArticleFactory(user=user, article=article)
        serializer = SavedArticleSerializer(saved_article)
        assert "article" in serializer.data
        assert serializer.data["article"]["id"] == article.id
        assert serializer.data["article"]["title"] == article.title
    
    def test_saved_article_serializer_saved_at(self, user):
        """Test that saved_at is included."""
        saved_article = SavedArticleFactory(user=user)
        serializer = SavedArticleSerializer(saved_article)
        assert "saved_at" in serializer.data


class TestUserCommentSerializer:
    """Tests for UserCommentSerializer."""
    
    def test_user_comment_serializer_article_info(self, user):
        """Test that article info is included."""
        article = ArticleFactory()
        comment = CommentFactory(user=user, article=article)
        serializer = UserCommentSerializer(comment)
        assert "article" in serializer.data
        assert serializer.data["article"]["id"] == article.id
        assert serializer.data["article"]["slug"] == article.slug
        assert serializer.data["article"]["title"] == article.title
    
    def test_user_comment_serializer_nested_replies(self, user):
        """Test that replies are nested."""
        article = ArticleFactory()
        comment = CommentFactory(user=user, article=article, parent=None)
        reply1 = CommentFactory(user=user, article=article, parent=comment)
        reply2 = CommentFactory(user=user, article=article, parent=comment)
        serializer = UserCommentSerializer(comment)
        assert "replies" in serializer.data
        assert len(serializer.data["replies"]) == 2


class TestDashboardStatsSerializer:
    """Tests for DashboardStatsSerializer."""
    
    def test_dashboard_stats_serializer_valid_data(self):
        """Test serializer with valid stats data."""
        data = {
            "articles_read_count": 10,
            "articles_saved_count": 5,
            "comments_count": 3,
        }
        serializer = DashboardStatsSerializer(data=data)
        assert serializer.is_valid()
        assert serializer.data == data
    
    def test_dashboard_stats_serializer_zero_counts(self):
        """Test serializer with zero counts."""
        data = {
            "articles_read_count": 0,
            "articles_saved_count": 0,
            "comments_count": 0,
        }
        serializer = DashboardStatsSerializer(data=data)
        assert serializer.is_valid()

