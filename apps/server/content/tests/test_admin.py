"""
Tests for content app admin functionality.
"""
import pytest
from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.core import mail
from content.admin import (
    ArticleAdmin,
    EventAdmin,
    ArtistAdmin,
    WriterAdmin,
    CommentAdmin,
)
from content.models import Article, Event, Artist, Writer, Comment
from content.tests.factories import (
    ArticleFactory,
    EventFactory,
    ArtistFactory,
    WriterFactory,
    CommentFactory,
    UserFactory,
)

User = get_user_model()


@pytest.fixture
def admin_site():
    """Return an AdminSite instance."""
    return AdminSite()


@pytest.fixture
def superuser():
    """Create a superuser."""
    return UserFactory(is_superuser=True, is_staff=True, role="super_admin")


@pytest.fixture
def writer_user():
    """Create a user with writer role."""
    return UserFactory(role="writer", is_staff=True)


@pytest.fixture
def fan_user():
    """Create a user with fan role."""
    return UserFactory(role="fan", is_staff=True)


class TestArticleAdmin:
    """Tests for ArticleAdmin."""
    
    def test_article_admin_has_add_permission_superuser(self, admin_site, superuser):
        """Test that superuser can add articles."""
        admin = ArticleAdmin(Article, admin_site)
        request = type("Request", (), {"user": superuser})()
        assert admin.has_add_permission(request) is True
    
    def test_article_admin_has_add_permission_writer(self, admin_site, writer_user):
        """Test that writer can add articles."""
        admin = ArticleAdmin(Article, admin_site)
        request = type("Request", (), {"user": writer_user})()
        assert admin.has_add_permission(request) is True
    
    def test_article_admin_has_add_permission_fan(self, admin_site, fan_user):
        """Test that fan cannot add articles."""
        admin = ArticleAdmin(Article, admin_site)
        request = type("Request", (), {"user": fan_user})()
        assert admin.has_add_permission(request) is False
    
    def test_article_admin_has_change_permission_superuser(self, admin_site, superuser):
        """Test that superuser can change any article."""
        article = ArticleFactory()
        admin = ArticleAdmin(Article, admin_site)
        request = type("Request", (), {"user": superuser})()
        assert admin.has_change_permission(request, article) is True
    
    def test_article_admin_has_change_permission_writer_own(self, admin_site, writer_user):
        """Test that writer can change their own articles."""
        writer = WriterFactory(user=writer_user)
        article = ArticleFactory(author=writer)
        admin = ArticleAdmin(Article, admin_site)
        request = type("Request", (), {"user": writer_user})()
        assert admin.has_change_permission(request, article) is True
    
    def test_article_admin_has_change_permission_writer_other(self, admin_site, writer_user):
        """Test that writer cannot change other writers' articles."""
        other_writer = WriterFactory()
        article = ArticleFactory(author=other_writer)
        admin = ArticleAdmin(Article, admin_site)
        request = type("Request", (), {"user": writer_user})()
        assert admin.has_change_permission(request, article) is False
    
    def test_article_admin_has_delete_permission_superuser(self, admin_site, superuser):
        """Test that superuser can delete articles."""
        article = ArticleFactory()
        admin = ArticleAdmin(Article, admin_site)
        request = type("Request", (), {"user": superuser})()
        assert admin.has_delete_permission(request, article) is True
    
    def test_article_admin_has_delete_permission_writer(self, admin_site, writer_user):
        """Test that writer cannot delete articles."""
        writer = WriterFactory(user=writer_user)
        article = ArticleFactory(author=writer)
        admin = ArticleAdmin(Article, admin_site)
        request = type("Request", (), {"user": writer_user})()
        assert admin.has_delete_permission(request, article) is False
    
    def test_article_admin_get_queryset_writer(self, admin_site, writer_user):
        """Test that writer only sees their own articles."""
        writer = WriterFactory(user=writer_user)
        article1 = ArticleFactory(author=writer)
        article2 = ArticleFactory()  # Other writer's article
        admin = ArticleAdmin(Article, admin_site)
        request = type("Request", (), {"user": writer_user})()
        queryset = admin.get_queryset(request)
        assert article1 in queryset
        assert article2 not in queryset
    
    def test_article_admin_get_queryset_superuser(self, admin_site, superuser):
        """Test that superuser sees all articles."""
        article1 = ArticleFactory()
        article2 = ArticleFactory()
        admin = ArticleAdmin(Article, admin_site)
        request = type("Request", (), {"user": superuser})()
        queryset = admin.get_queryset(request)
        assert article1 in queryset
        assert article2 in queryset


class TestEventAdmin:
    """Tests for EventAdmin."""
    
    def test_event_admin_has_add_permission_superuser(self, admin_site, superuser):
        """Test that superuser can add events."""
        admin = EventAdmin(Event, admin_site)
        request = type("Request", (), {"user": superuser})()
        assert admin.has_add_permission(request) is True
    
    def test_event_admin_has_add_permission_writer(self, admin_site, writer_user):
        """Test that writer can add events."""
        admin = EventAdmin(Event, admin_site)
        request = type("Request", (), {"user": writer_user})()
        assert admin.has_add_permission(request) is True
    
    def test_event_admin_has_change_permission_superuser(self, admin_site, superuser):
        """Test that superuser can change any event."""
        event = EventFactory()
        admin = EventAdmin(Event, admin_site)
        request = type("Request", (), {"user": superuser})()
        assert admin.has_change_permission(request, event) is True
    
    def test_event_admin_has_change_permission_writer_own(self, admin_site, writer_user):
        """Test that writer can change their own events."""
        event = EventFactory(created_by=writer_user)
        admin = EventAdmin(Event, admin_site)
        request = type("Request", (), {"user": writer_user})()
        assert admin.has_change_permission(request, event) is True
    
    def test_event_admin_has_change_permission_writer_other(self, admin_site, writer_user):
        """Test that writer cannot change other users' events."""
        other_user = UserFactory()
        event = EventFactory(created_by=other_user)
        admin = EventAdmin(Event, admin_site)
        request = type("Request", (), {"user": writer_user})()
        assert admin.has_change_permission(request, event) is False
    
    def test_event_admin_save_model_sets_created_by(self, admin_site, writer_user):
        """Test that save_model sets created_by to current user."""
        from django.utils import timezone
        from datetime import timedelta
        admin = EventAdmin(Event, admin_site)
        event = Event(
            title="New Event",
            description="Test description",
            venue="Test Venue",
            location="Test Location",
            date=timezone.now().date() + timedelta(days=30),
            time="20:00",
            genre="EDM",
            status="draft"
        )
        request = type("Request", (), {"user": writer_user})()
        admin.save_model(request, event, None, change=False)
        assert event.created_by == writer_user
    
    def test_event_admin_get_queryset_writer(self, admin_site, writer_user):
        """Test that writer only sees their own events."""
        event1 = EventFactory(created_by=writer_user)
        event2 = EventFactory()  # Other user's event
        admin = EventAdmin(Event, admin_site)
        request = type("Request", (), {"user": writer_user})()
        queryset = admin.get_queryset(request)
        assert event1 in queryset
        assert event2 not in queryset


class TestArtistAdmin:
    """Tests for ArtistAdmin."""
    
    def test_artist_admin_has_add_permission_superuser(self, admin_site, superuser):
        """Test that superuser can add artists."""
        admin = ArtistAdmin(Artist, admin_site)
        request = type("Request", (), {"user": superuser})()
        assert admin.has_add_permission(request) is True
    
    def test_artist_admin_has_add_permission_writer(self, admin_site, writer_user):
        """Test that writer can add artists."""
        admin = ArtistAdmin(Artist, admin_site)
        request = type("Request", (), {"user": writer_user})()
        assert admin.has_add_permission(request) is True
    
    def test_artist_admin_has_change_permission_superuser(self, admin_site, superuser):
        """Test that superuser can change artists."""
        artist = ArtistFactory()
        admin = ArtistAdmin(Artist, admin_site)
        request = type("Request", (), {"user": superuser})()
        assert admin.has_change_permission(request, artist) is True
    
    def test_artist_admin_has_change_permission_writer(self, admin_site, writer_user):
        """Test that writer cannot change artists."""
        artist = ArtistFactory()
        admin = ArtistAdmin(Artist, admin_site)
        request = type("Request", (), {"user": writer_user})()
        assert admin.has_change_permission(request, artist) is False
    
    def test_artist_admin_save_model_sends_email(self, admin_site, superuser, settings):
        """Test that save_model sends claim invitation email when email is provided."""
        settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
        admin = ArtistAdmin(Artist, admin_site)
        artist = Artist(email="artist@example.com", name="Test Artist")
        request = type("Request", (), {"user": superuser})()
        admin.save_model(request, artist, None, change=False)
        assert len(mail.outbox) == 1
        assert "claim" in mail.outbox[0].subject.lower()
        assert "artist@example.com" in mail.outbox[0].to
    
    def test_artist_admin_save_model_no_email_on_update(self, admin_site, superuser):
        """Test that email is not sent when updating existing artist."""
        artist = ArtistFactory(email="artist@example.com")
        admin = ArtistAdmin(Artist, admin_site)
        request = type("Request", (), {"user": superuser})()
        admin.save_model(request, artist, None, change=True)
        assert len(mail.outbox) == 0
    
    def test_artist_admin_article_count_display(self, admin_site, superuser):
        """Test article_count display method."""
        artist = ArtistFactory()
        ArticleFactory()
        article = ArticleFactory()
        article.artists.add(artist)
        admin = ArtistAdmin(Artist, admin_site)
        assert admin.article_count(artist) == 1
    
    def test_artist_admin_event_count_display(self, admin_site, superuser):
        """Test event_count display method."""
        artist = ArtistFactory()
        event = EventFactory()
        event.artists.add(artist)
        admin = ArtistAdmin(Artist, admin_site)
        assert admin.event_count(artist) == 1


class TestWriterAdmin:
    """Tests for WriterAdmin."""
    
    def test_writer_admin_has_add_permission_superuser(self, admin_site, superuser):
        """Test that superuser can add writers."""
        admin = WriterAdmin(Writer, admin_site)
        request = type("Request", (), {"user": superuser})()
        assert admin.has_add_permission(request) is True
    
    def test_writer_admin_has_add_permission_writer(self, admin_site, writer_user):
        """Test that writer cannot add writers."""
        admin = WriterAdmin(Writer, admin_site)
        request = type("Request", (), {"user": writer_user})()
        assert admin.has_add_permission(request) is False
    
    def test_writer_admin_save_model_sends_email(self, admin_site, superuser, settings):
        """Test that save_model sends invitation email when creating new writer."""
        settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
        user = UserFactory(email="writer@example.com")
        admin = WriterAdmin(Writer, admin_site)
        writer = Writer(user=user, name="Test Writer")
        request = type("Request", (), {"user": superuser})()
        admin.save_model(request, writer, None, change=False)
        assert len(mail.outbox) == 1
        assert "writer" in mail.outbox[0].subject.lower()
        assert "writer@example.com" in mail.outbox[0].to
    
    def test_writer_admin_article_count_display(self, admin_site, superuser):
        """Test article_count display method."""
        writer = WriterFactory()
        ArticleFactory(author=writer)
        ArticleFactory(author=writer)
        admin = WriterAdmin(Writer, admin_site)
        assert admin.article_count(writer) == 2


class TestCommentAdmin:
    """Tests for CommentAdmin."""
    
    def test_comment_admin_has_add_permission_superuser(self, admin_site, superuser):
        """Test that superuser can add comments."""
        admin = CommentAdmin(Comment, admin_site)
        request = type("Request", (), {"user": superuser})()
        assert admin.has_add_permission(request) is True
    
    def test_comment_admin_has_add_permission_writer(self, admin_site, writer_user):
        """Test that writer cannot add comments."""
        admin = CommentAdmin(Comment, admin_site)
        request = type("Request", (), {"user": writer_user})()
        assert admin.has_add_permission(request) is False
    
    def test_comment_admin_content_preview(self, admin_site, superuser):
        """Test content_preview display method."""
        long_content = "A" * 100
        comment = CommentFactory(content=long_content)
        admin = CommentAdmin(Comment, admin_site)
        preview = admin.content_preview(comment)
        assert len(preview) == 53  # 50 chars + "..."
        assert preview.endswith("...")

