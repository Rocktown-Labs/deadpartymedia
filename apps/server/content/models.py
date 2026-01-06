from django.db import models
from django.utils.text import slugify
from django.contrib.auth import get_user_model
from ckeditor.fields import RichTextField
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


class Writer(models.Model):
    """Writer model linked to User."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="writer_profile")
    name = models.CharField(max_length=255)
    bio = models.TextField()
    image = models.ImageField(upload_to="writers/", blank=True, null=True)
    role = models.CharField(max_length=255, blank=True)
    instagram = models.URLField(blank=True, null=True)
    cashtag = models.CharField(max_length=50, blank=True, null=True, help_text="Cash App cashtag (e.g., $username)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "writers"
        ordering = ["name"]

    def __str__(self):
        return self.name

    @property
    def article_count(self):
        """Return the number of articles by this writer."""
        return self.articles.count()


class Artist(models.Model):
    """Artist model."""

    GENRE_CHOICES = [
        ("Country", "Country"),
        ("EDM", "EDM"),
        ("Hardcore & Rock", "Hardcore & Rock"),
        ("Hip-Hop & R&B", "Hip-Hop & R&B"),
        ("Other", "Other"),
    ]

    slug = models.SlugField(unique=True, max_length=255)
    name = models.CharField(max_length=255)
    bio = models.TextField()
    image = models.ImageField(upload_to="artists/", blank=True, null=True)
    location = models.CharField(max_length=255)
    genre = models.CharField(max_length=50, choices=GENRE_CHOICES)
    spotify_url = models.URLField(blank=True, null=True)
    spotify_artist_id = models.CharField(max_length=255, blank=True, null=True)
    instagram = models.URLField(blank=True, null=True)
    twitter = models.URLField(blank=True, null=True)
    tiktok = models.URLField(blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    email = models.EmailField(blank=True, null=True, help_text="Email to send claim invitation")
    claimed = models.BooleanField(default=False)
    claimed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="claimed_artists"
    )
    profile_views = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "artists"
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["genre"]),
            models.Index(fields=["claimed"]),
        ]
        ordering = ["name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        """Auto-generate slug from name if not provided."""
        if not self.slug:
            self.slug = slugify(self.name)
            # Ensure uniqueness
            original_slug = self.slug
            counter = 1
            while Artist.objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
                self.slug = f"{original_slug}-{counter}"
                counter += 1
        super().save(*args, **kwargs)

    @property
    def article_count(self):
        """Return the number of articles featuring this artist."""
        return self.articles.count()

    @property
    def event_count(self):
        """Return the number of events featuring this artist."""
        return self.events.count()

    def get_articles(self):
        """Return all articles featuring this artist."""
        return self.articles.all()

    def get_events(self):
        """Return all events featuring this artist."""
        return self.events.all()


class Article(models.Model):
    """Article model."""

    CATEGORY_CHOICES = [
        ("COUNTRY", "Country"),
        ("EDM", "EDM"),
        ("HARDCORE & ROCK", "Hardcore & Rock"),
        ("HIP-HOP & R&B", "Hip-Hop & R&B"),
        ("OTHER", "Other"),
    ]

    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("published", "Published"),
        ("archived", "Archived"),
    ]

    slug = models.SlugField(unique=True, max_length=255)
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    excerpt = models.TextField()
    content = RichTextField()
    cover_image = models.ImageField(upload_to="articles/")
    author = models.ForeignKey(Writer, on_delete=models.CASCADE, related_name="articles")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    published_at = models.DateTimeField(null=True, blank=True)
    views = models.IntegerField(default=0)
    artists = models.ManyToManyField(Artist, through="ArticleArtist", related_name="articles")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "articles"
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["category"]),
            models.Index(fields=["status"]),
            models.Index(fields=["published_at"]),
            models.Index(fields=["author"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        """Auto-generate slug from title if not provided."""
        try:
            if not self.slug:
                self.slug = slugify(self.title)
                # Ensure uniqueness
                original_slug = self.slug
                counter = 1
                while Article.objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
                    self.slug = f"{original_slug}-{counter}"
                    counter += 1
            super().save(*args, **kwargs)
        except Exception as e:
            logger.error(f"Error saving article {self.title}: {e}", exc_info=True)
            import sentry_sdk
            sentry_sdk.capture_exception(e)
            raise


class ArticleArtist(models.Model):
    """Through model for Article-Artist many-to-many relationship."""

    article = models.ForeignKey(Article, on_delete=models.CASCADE, related_name="article_artists")
    artist = models.ForeignKey(Artist, on_delete=models.CASCADE, related_name="article_artists")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "article_artists"
        unique_together = [["article", "artist"]]
        indexes = [
            models.Index(fields=["article"]),
            models.Index(fields=["artist"]),
        ]

    def __str__(self):
        return f"{self.article.title} - {self.artist.name}"


class Event(models.Model):
    """Event model."""

    GENRE_CHOICES = [
        ("COUNTRY", "Country"),
        ("EDM", "EDM"),
        ("HARDCORE & ROCK", "Hardcore & Rock"),
        ("HIP-HOP & R&B", "Hip-Hop & R&B"),
        ("OTHER", "Other"),
    ]

    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("published", "Published"),
        ("past", "Past"),
    ]

    slug = models.SlugField(unique=True, max_length=255)
    title = models.CharField(max_length=255)
    description = models.TextField()
    image = models.ImageField(upload_to="events/")
    venue = models.CharField(max_length=255)
    location = models.CharField(max_length=255)
    date = models.DateField()
    time = models.CharField(max_length=50)
    ticket_link = models.URLField(blank=True, null=True)
    price = models.CharField(max_length=50, blank=True, null=True)
    genre = models.CharField(max_length=50, choices=GENRE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="created_events")
    artists = models.ManyToManyField(Artist, through="EventArtist", related_name="events")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "events"
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["genre"]),
            models.Index(fields=["status"]),
            models.Index(fields=["date"]),
            models.Index(fields=["created_by"]),
        ]
        ordering = ["-date"]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        """Auto-generate slug from title if not provided."""
        if not self.slug:
            self.slug = slugify(self.title)
            # Ensure uniqueness
            original_slug = self.slug
            counter = 1
            while Event.objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
                self.slug = f"{original_slug}-{counter}"
                counter += 1
        super().save(*args, **kwargs)


class EventArtist(models.Model):
    """Through model for Event-Artist many-to-many relationship."""

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="event_artists")
    artist = models.ForeignKey(Artist, on_delete=models.CASCADE, related_name="event_artists")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "event_artists"
        unique_together = [["event", "artist"]]
        indexes = [
            models.Index(fields=["event"]),
            models.Index(fields=["artist"]),
        ]

    def __str__(self):
        return f"{self.event.title} - {self.artist.name}"


class Comment(models.Model):
    """Comment model for articles."""

    article = models.ForeignKey(Article, on_delete=models.CASCADE, related_name="comments")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="comments")
    content = models.TextField()
    parent = models.ForeignKey("self", on_delete=models.CASCADE, null=True, blank=True, related_name="replies")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "comments"
        indexes = [
            models.Index(fields=["article"]),
            models.Index(fields=["created_at"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"Comment by {self.user.email} on {self.article.title}"
