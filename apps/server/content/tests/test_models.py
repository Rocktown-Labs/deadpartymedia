"""
Tests for content app models.
"""
import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
from content.models import Artist, Article, Event, Writer, Comment, ArticleArtist, EventArtist
from content.tests.factories import (
    ArtistFactory,
    ArticleFactory,
    EventFactory,
    WriterFactory,
    CommentFactory,
    UserFactory,
)


class TestArtistModel:
    """Tests for Artist model."""
    
    def test_artist_creation(self, artist):
        """Test basic artist creation."""
        assert artist.name is not None
        assert artist.slug is not None
        assert artist.genre in [choice[0] for choice in Artist.GENRE_CHOICES]
    
    def test_artist_slug_auto_generation(self):
        """Test that slug is auto-generated from name."""
        artist = ArtistFactory(name="Test Artist Name", slug=None)
        assert artist.slug == "test-artist-name"
    
    def test_artist_slug_uniqueness(self):
        """Test that duplicate slugs are handled with counter."""
        artist1 = ArtistFactory(name="Test Artist", slug=None)
        artist2 = ArtistFactory(name="Test Artist", slug=None)
        assert artist1.slug == "test-artist"
        assert artist2.slug == "test-artist-1"
    
    def test_artist_slug_preserved_if_provided(self):
        """Test that provided slug is preserved."""
        artist = ArtistFactory(name="Test Artist", slug="custom-slug")
        assert artist.slug == "custom-slug"
    
    def test_artist_article_count_property(self, artist):
        """Test article_count property."""
        article1 = ArticleFactory()
        article2 = ArticleFactory()
        ArticleArtist.objects.create(article=article1, artist=artist)
        ArticleArtist.objects.create(article=article2, artist=artist)
        assert artist.article_count == 2
    
    def test_artist_event_count_property(self, artist):
        """Test event_count property."""
        event1 = EventFactory()
        event2 = EventFactory()
        EventArtist.objects.create(event=event1, artist=artist)
        EventArtist.objects.create(event=event2, artist=artist)
        assert artist.event_count == 2
    
    def test_artist_get_articles_method(self, artist):
        """Test get_articles() method."""
        article1 = ArticleFactory()
        article2 = ArticleFactory()
        ArticleArtist.objects.create(article=article1, artist=artist)
        ArticleArtist.objects.create(article=article2, artist=artist)
        articles = artist.get_articles()
        assert articles.count() == 2
        assert article1 in articles
        assert article2 in articles
    
    def test_artist_get_events_method(self, artist):
        """Test get_events() method."""
        event1 = EventFactory()
        event2 = EventFactory()
        EventArtist.objects.create(event=event1, artist=artist)
        EventArtist.objects.create(event=event2, artist=artist)
        events = artist.get_events()
        assert events.count() == 2
        assert event1 in events
        assert event2 in events
    
    def test_artist_claiming(self):
        """Test artist claiming functionality."""
        user = UserFactory()
        artist = ArtistFactory(claimed=False, claimed_by=None)
        artist.claimed = True
        artist.claimed_by = user
        artist.save()
        assert artist.claimed is True
        assert artist.claimed_by == user
    
    def test_artist_genre_choices(self):
        """Test genre choices validation."""
        valid_genres = [choice[0] for choice in Artist.GENRE_CHOICES]
        for genre in valid_genres:
            artist = ArtistFactory(genre=genre)
            assert artist.genre == genre
    
    def test_artist_str_representation(self, artist):
        """Test string representation."""
        assert str(artist) == artist.name


class TestArticleModel:
    """Tests for Article model."""
    
    def test_article_creation(self, article):
        """Test basic article creation."""
        assert article.title is not None
        assert article.slug is not None
        assert article.author is not None
        assert article.category in [choice[0] for choice in Article.CATEGORY_CHOICES]
        assert article.status in [choice[0] for choice in Article.STATUS_CHOICES]
    
    def test_article_slug_auto_generation(self):
        """Test that slug is auto-generated from title."""
        article = ArticleFactory(title="Test Article Title", slug=None)
        assert article.slug == "test-article-title"
    
    def test_article_slug_uniqueness(self):
        """Test that duplicate slugs are handled with counter."""
        article1 = ArticleFactory(title="Test Article", slug=None)
        article2 = ArticleFactory(title="Test Article", slug=None)
        assert article1.slug == "test-article"
        assert article2.slug == "test-article-1"
    
    def test_article_slug_preserved_if_provided(self):
        """Test that provided slug is preserved."""
        article = ArticleFactory(title="Test Article", slug="custom-slug")
        assert article.slug == "custom-slug"
    
    def test_article_view_counter_increment(self, article):
        """Test that view counter increments."""
        initial_views = article.views
        article.views += 1
        article.save()
        article.refresh_from_db()
        assert article.views == initial_views + 1
    
    def test_article_artist_relationship(self, article):
        """Test many-to-many relationship with Artist."""
        artist1 = ArtistFactory()
        artist2 = ArtistFactory()
        ArticleArtist.objects.create(article=article, artist=artist1)
        ArticleArtist.objects.create(article=article, artist=artist2)
        assert article.artists.count() == 2
        assert artist1 in article.artists.all()
        assert artist2 in article.artists.all()
    
    def test_article_author_relationship(self, article):
        """Test foreign key relationship with Writer."""
        writer = WriterFactory()
        article.author = writer
        article.save()
        assert article.author == writer
        assert article in writer.articles.all()
    
    def test_article_status_choices(self):
        """Test status choices validation."""
        valid_statuses = [choice[0] for choice in Article.STATUS_CHOICES]
        for status in valid_statuses:
            article = ArticleFactory(status=status)
            assert article.status == status
    
    def test_article_category_choices(self):
        """Test category choices validation."""
        valid_categories = [choice[0] for choice in Article.CATEGORY_CHOICES]
        for category in valid_categories:
            article = ArticleFactory(category=category)
            assert article.category == category
    
    def test_article_published_at(self, article):
        """Test published_at field."""
        now = timezone.now()
        article.published_at = now
        article.save()
        assert article.published_at == now
    
    def test_article_str_representation(self, article):
        """Test string representation."""
        assert str(article) == article.title
    
    def test_article_ordering(self):
        """Test article ordering by created_at descending."""
        article1 = ArticleFactory()
        article2 = ArticleFactory()
        articles = Article.objects.all()
        assert articles[0].created_at >= articles[1].created_at


class TestEventModel:
    """Tests for Event model."""
    
    def test_event_creation(self, event):
        """Test basic event creation."""
        assert event.title is not None
        assert event.slug is not None
        assert event.created_by is not None
        assert event.genre in [choice[0] for choice in Event.GENRE_CHOICES]
        assert event.status in [choice[0] for choice in Event.STATUS_CHOICES]
    
    def test_event_slug_auto_generation(self):
        """Test that slug is auto-generated from title."""
        event = EventFactory(title="Test Event Title", slug=None)
        assert event.slug == "test-event-title"
    
    def test_event_slug_uniqueness(self):
        """Test that duplicate slugs are handled with counter."""
        event1 = EventFactory(title="Test Event", slug=None)
        event2 = EventFactory(title="Test Event", slug=None)
        assert event1.slug == "test-event"
        assert event2.slug == "test-event-1"
    
    def test_event_slug_preserved_if_provided(self):
        """Test that provided slug is preserved."""
        event = EventFactory(title="Test Event", slug="custom-slug")
        assert event.slug == "custom-slug"
    
    def test_event_artist_relationship(self, event):
        """Test many-to-many relationship with Artist."""
        artist1 = ArtistFactory()
        artist2 = ArtistFactory()
        EventArtist.objects.create(event=event, artist=artist1)
        EventArtist.objects.create(event=event, artist=artist2)
        assert event.artists.count() == 2
        assert artist1 in event.artists.all()
        assert artist2 in event.artists.all()
    
    def test_event_created_by_relationship(self, event):
        """Test foreign key relationship with User."""
        user = UserFactory()
        event.created_by = user
        event.save()
        assert event.created_by == user
        assert event in user.created_events.all()
    
    def test_event_genre_choices(self):
        """Test genre choices validation."""
        valid_genres = [choice[0] for choice in Event.GENRE_CHOICES]
        for genre in valid_genres:
            event = EventFactory(genre=genre)
            assert event.genre == genre
    
    def test_event_status_choices(self):
        """Test status choices validation."""
        valid_statuses = [choice[0] for choice in Event.STATUS_CHOICES]
        for status in valid_statuses:
            event = EventFactory(status=status)
            assert event.status == status
    
    def test_event_date_filtering(self):
        """Test event date filtering."""
        future_date = timezone.now().date() + timedelta(days=30)
        past_date = timezone.now().date() - timedelta(days=30)
        future_event = EventFactory(date=future_date)
        past_event = EventFactory(date=past_date)
        events = Event.objects.filter(date__gte=timezone.now().date())
        assert future_event in events
        assert past_event not in events
    
    def test_event_str_representation(self, event):
        """Test string representation."""
        assert str(event) == event.title
    
    def test_event_ordering(self):
        """Test event ordering by date descending."""
        event1 = EventFactory(date=timezone.now().date() + timedelta(days=10))
        event2 = EventFactory(date=timezone.now().date() + timedelta(days=20))
        events = Event.objects.all()
        # Ordering is by -date, so most recent first
        assert events[0].date >= events[1].date


class TestWriterModel:
    """Tests for Writer model."""
    
    def test_writer_creation(self, writer):
        """Test basic writer creation."""
        assert writer.name is not None
        assert writer.user is not None
        assert writer.user.role == "writer"
    
    def test_writer_user_one_to_one_relationship(self, writer):
        """Test one-to-one relationship with User."""
        assert writer.user.writer_profile == writer
    
    def test_writer_article_count_property(self, writer):
        """Test article_count property."""
        article1 = ArticleFactory(author=writer)
        article2 = ArticleFactory(author=writer)
        assert writer.article_count == 2
    
    def test_writer_str_representation(self, writer):
        """Test string representation."""
        assert str(writer) == writer.name
    
    def test_writer_ordering(self):
        """Test writer ordering by name."""
        writer1 = WriterFactory(name="Zebra Writer")
        writer2 = WriterFactory(name="Alpha Writer")
        writers = Writer.objects.all()
        # Ordering is by name, so alphabetical
        names = [w.name for w in writers]
        assert names == sorted(names)


class TestCommentModel:
    """Tests for Comment model."""
    
    def test_comment_creation(self, comment):
        """Test basic comment creation."""
        assert comment.content is not None
        assert comment.article is not None
        assert comment.user is not None
        assert comment.parent is None
    
    def test_comment_nested_replies(self, comment):
        """Test parent-child relationship for nested comments."""
        reply1 = CommentFactory(article=comment.article, parent=comment, user=UserFactory())
        reply2 = CommentFactory(article=comment.article, parent=comment, user=UserFactory())
        assert comment.replies.count() == 2
        assert reply1.parent == comment
        assert reply2.parent == comment
    
    def test_comment_article_relationship(self, comment):
        """Test foreign key relationship with Article."""
        article = ArticleFactory()
        comment.article = article
        comment.save()
        assert comment.article == article
        assert comment in article.comments.all()
    
    def test_comment_user_relationship(self, comment):
        """Test foreign key relationship with User."""
        user = UserFactory()
        comment.user = user
        comment.save()
        assert comment.user == user
        assert comment in user.comments.all()
    
    def test_comment_str_representation(self, comment):
        """Test string representation."""
        expected = f"Comment by {comment.user.email} on {comment.article.title}"
        assert str(comment) == expected
    
    def test_comment_ordering(self):
        """Test comment ordering by created_at descending."""
        comment1 = CommentFactory()
        comment2 = CommentFactory()
        comments = Comment.objects.all()
        assert comments[0].created_at >= comments[1].created_at


class TestThroughModels:
    """Tests for through models (ArticleArtist, EventArtist)."""
    
    def test_article_artist_unique_together(self, article, artist):
        """Test that ArticleArtist enforces unique together constraint."""
        ArticleArtist.objects.create(article=article, artist=artist)
        # Attempting to create duplicate should raise IntegrityError
        with pytest.raises(Exception):  # IntegrityError or ValidationError
            ArticleArtist.objects.create(article=article, artist=artist)
    
    def test_event_artist_unique_together(self, event, artist):
        """Test that EventArtist enforces unique together constraint."""
        EventArtist.objects.create(event=event, artist=artist)
        # Attempting to create duplicate should raise IntegrityError
        with pytest.raises(Exception):  # IntegrityError or ValidationError
            EventArtist.objects.create(event=event, artist=artist)
    
    def test_article_artist_str_representation(self, article, artist):
        """Test ArticleArtist string representation."""
        article_artist = ArticleArtist.objects.create(article=article, artist=artist)
        expected = f"{article.title} - {artist.name}"
        assert str(article_artist) == expected
    
    def test_event_artist_str_representation(self, event, artist):
        """Test EventArtist string representation."""
        event_artist = EventArtist.objects.create(event=event, artist=artist)
        expected = f"{event.title} - {artist.name}"
        assert str(event_artist) == expected

