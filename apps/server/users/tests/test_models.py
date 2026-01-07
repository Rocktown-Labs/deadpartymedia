"""
Tests for users app models.
"""
import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from users.models import ArticleRead, SavedArticle
from users.tests.factories import UserFactory, ArticleReadFactory, SavedArticleFactory
from content.tests.factories import ArticleFactory

User = get_user_model()


class TestUserModel:
    """Tests for User model."""
    
    def test_user_creation(self, user):
        """Test basic user creation."""
        assert user.email is not None
        assert user.username == user.email
        assert user.role in [choice[0] for choice in User.ROLE_CHOICES]
        assert user.is_active is True
    
    def test_user_email_as_username(self):
        """Test that email is used as username."""
        user = UserFactory(email="test@example.com")
        assert user.username == "test@example.com"
    
    def test_user_role_choices(self):
        """Test role choices validation."""
        valid_roles = [choice[0] for choice in User.ROLE_CHOICES]
        for role in valid_roles:
            user = UserFactory(role=role)
            assert user.role == role
    
    def test_user_default_role(self):
        """Test that default role is 'fan'."""
        user = UserFactory()
        assert user.role == "fan"
    
    def test_user_str_representation(self, user):
        """Test string representation."""
        assert str(user) == user.email or str(user) == user.username
    
    def test_user_create_superuser(self):
        """Test create_superuser method sets role to super_admin."""
        superuser = User.objects.create_superuser(
            username="admin@example.com",
            email="admin@example.com",
            password="testpass123"
        )
        assert superuser.is_superuser is True
        assert superuser.is_staff is True
        assert superuser.role == "super_admin"
    
    def test_user_create_superuser_requires_staff(self):
        """Test that create_superuser requires is_staff=True."""
        with pytest.raises(ValueError, match="Superuser must have is_staff=True"):
            User.objects.create_superuser(
                username="admin@example.com",
                email="admin@example.com",
                password="testpass123",
                is_staff=False
            )
    
    def test_user_create_superuser_requires_superuser(self):
        """Test that create_superuser requires is_superuser=True."""
        with pytest.raises(ValueError, match="Superuser must have is_superuser=True"):
            User.objects.create_superuser(
                username="admin@example.com",
                email="admin@example.com",
                password="testpass123",
                is_superuser=False
            )
    
    def test_user_bio_field(self):
        """Test bio field."""
        user = UserFactory(bio="Test bio")
        assert user.bio == "Test bio"
    
    def test_user_avatar_field(self):
        """Test avatar field."""
        user = UserFactory(avatar=None)
        # Check if avatar field is empty (ImageFieldFile evaluates to False when empty)
        assert not user.avatar or user.avatar.name == ""


class TestArticleReadModel:
    """Tests for ArticleRead model."""
    
    def test_article_read_creation(self, article_read):
        """Test basic article read creation."""
        assert article_read.user is not None
        assert article_read.article is not None
        assert article_read.read_at is not None
    
    def test_article_read_unique_together(self, user):
        """Test that ArticleRead enforces unique together constraint."""
        article = ArticleFactory()
        ArticleRead.objects.create(user=user, article=article)
        # Attempting to create duplicate should raise IntegrityError
        with pytest.raises(Exception):  # IntegrityError or ValidationError
            ArticleRead.objects.create(user=user, article=article)
    
    def test_article_read_get_or_create_idempotency(self, user):
        """Test that get_or_create is idempotent."""
        article = ArticleFactory()
        read1, created1 = ArticleRead.objects.get_or_create(user=user, article=article)
        read2, created2 = ArticleRead.objects.get_or_create(user=user, article=article)
        assert read1 == read2
        assert created1 is True
        assert created2 is False
    
    def test_article_read_str_representation(self, article_read):
        """Test string representation."""
        expected = f"{article_read.user.email} read {article_read.article.title}"
        assert str(article_read) == expected
    
    def test_article_read_ordering(self, user):
        """Test article read ordering by read_at descending."""
        article1 = ArticleFactory()
        article2 = ArticleFactory()
        read1 = ArticleRead.objects.create(user=user, article=article1)
        read2 = ArticleRead.objects.create(user=user, article=article2)
        reads = ArticleRead.objects.filter(user=user)
        assert reads[0].read_at >= reads[1].read_at
    
    def test_article_read_user_relationship(self, user):
        """Test foreign key relationship with User."""
        article = ArticleFactory()
        article_read = ArticleRead.objects.create(user=user, article=article)
        assert article_read.user == user
        assert article_read in user.read_articles.all()
    
    def test_article_read_article_relationship(self, user):
        """Test foreign key relationship with Article."""
        article = ArticleFactory()
        article_read = ArticleRead.objects.create(user=user, article=article)
        assert article_read.article == article
        assert article_read in article.read_by_users.all()


class TestSavedArticleModel:
    """Tests for SavedArticle model."""
    
    def test_saved_article_creation(self, saved_article):
        """Test basic saved article creation."""
        assert saved_article.user is not None
        assert saved_article.article is not None
        assert saved_article.saved_at is not None
    
    def test_saved_article_unique_together(self, user):
        """Test that SavedArticle enforces unique together constraint."""
        article = ArticleFactory()
        SavedArticle.objects.create(user=user, article=article)
        # Attempting to create duplicate should raise IntegrityError
        with pytest.raises(Exception):  # IntegrityError or ValidationError
            SavedArticle.objects.create(user=user, article=article)
    
    def test_saved_article_get_or_create_idempotency(self, user):
        """Test that get_or_create is idempotent."""
        article = ArticleFactory()
        saved1, created1 = SavedArticle.objects.get_or_create(user=user, article=article)
        saved2, created2 = SavedArticle.objects.get_or_create(user=user, article=article)
        assert saved1 == saved2
        assert created1 is True
        assert created2 is False
    
    def test_saved_article_str_representation(self, saved_article):
        """Test string representation."""
        expected = f"{saved_article.user.email} saved {saved_article.article.title}"
        assert str(saved_article) == expected
    
    def test_saved_article_ordering(self, user):
        """Test saved article ordering by saved_at descending."""
        article1 = ArticleFactory()
        article2 = ArticleFactory()
        saved1 = SavedArticle.objects.create(user=user, article=article1)
        saved2 = SavedArticle.objects.create(user=user, article=article2)
        saved_articles = SavedArticle.objects.filter(user=user)
        assert saved_articles[0].saved_at >= saved_articles[1].saved_at
    
    def test_saved_article_user_relationship(self, user):
        """Test foreign key relationship with User."""
        article = ArticleFactory()
        saved_article = SavedArticle.objects.create(user=user, article=article)
        assert saved_article.user == user
        assert saved_article in user.saved_articles.all()
    
    def test_saved_article_article_relationship(self, user):
        """Test foreign key relationship with Article."""
        article = ArticleFactory()
        saved_article = SavedArticle.objects.create(user=user, article=article)
        assert saved_article.article == article
        assert saved_article in article.saved_by_users.all()

