from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models
from django.core.exceptions import ValidationError


class UserManager(UserManager):
    """Custom UserManager to set role when creating superusers."""

    def create_superuser(self, username, email=None, password=None, **extra_fields):
        """Create a superuser with super_admin role."""
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "super_admin")  # Set role to super_admin for superusers

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self._create_user(username, email, password, **extra_fields)


class User(AbstractUser):
    """Custom User model extending Django's AbstractUser."""

    ROLE_CHOICES = [
        ("super_admin", "Super Admin"),
        ("admin", "Admin"),
        ("writer", "Writer"),
        ("artist", "Artist"),
        ("fan", "Fan"),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="fan")
    bio = models.TextField(blank=True, null=True)
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)

    objects = UserManager()

    class Meta:
        db_table = "users"
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["role"]),
        ]

    def __str__(self):
        return self.email or self.username


class ArticleRead(models.Model):
    """Track when users read articles."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="read_articles")
    article = models.ForeignKey("content.Article", on_delete=models.CASCADE, related_name="read_by_users")
    read_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "article_reads"
        unique_together = [["user", "article"]]
        indexes = [
            models.Index(fields=["user", "read_at"]),
            models.Index(fields=["article"]),
        ]
        ordering = ["-read_at"]

    def __str__(self):
        return f"{self.user.email} read {self.article.title}"


class SavedArticle(models.Model):
    """Track articles saved by users."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="saved_articles")
    article = models.ForeignKey("content.Article", on_delete=models.CASCADE, related_name="saved_by_users")
    saved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "saved_articles"
        unique_together = [["user", "article"]]
        indexes = [
            models.Index(fields=["user", "saved_at"]),
            models.Index(fields=["article"]),
        ]
        ordering = ["-saved_at"]

    def __str__(self):
        return f"{self.user.email} saved {self.article.title}"
