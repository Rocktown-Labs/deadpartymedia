from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.sites.shortcuts import get_current_site
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from .models import Article, Event, Artist, Writer, ArticleArtist, EventArtist, Comment


class ArticleArtistInline(admin.TabularInline):
    """Inline admin for Article-Artist relationship."""

    model = ArticleArtist
    extra = 1
    autocomplete_fields = ["artist"]


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    """Admin configuration for Article model."""

    list_display = ["title", "category", "author", "status", "published_at", "views", "created_at"]
    list_filter = ["category", "status", "author", "created_at"]
    search_fields = ["title", "slug", "excerpt"]
    prepopulated_fields = {"slug": ("title",)}
    readonly_fields = ["views", "created_at", "updated_at"]
    inlines = [ArticleArtistInline]
    filter_horizontal = []

    fieldsets = (
        ("Basic Information", {"fields": ("title", "slug", "category", "excerpt", "cover_image")}),
        ("Content", {"fields": ("content",)}),
        ("Author & Status", {"fields": ("author", "status", "published_at")}),
        ("Statistics", {"fields": ("views",)}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )

    def get_queryset(self, request):
        """Filter queryset based on user role."""
        qs = super().get_queryset(request)
        if request.user.role == "writer":
            # Writers can only see their own articles
            try:
                writer = request.user.writer_profile
                return qs.filter(author=writer)
            except Writer.DoesNotExist:
                return qs.none()
        return qs

    def has_add_permission(self, request):
        """Writers and super_admins can add articles."""
        return request.user.is_superuser or request.user.role in ["writer", "super_admin"]

    def has_change_permission(self, request, obj=None):
        """Writers can change their own articles, super_admins can change all."""
        if request.user.is_superuser or request.user.role == "super_admin":
            return True
        if request.user.role == "writer":
            if obj:
                try:
                    writer = request.user.writer_profile
                    return obj.author == writer
                except Writer.DoesNotExist:
                    return False
            return True
        return False

    def has_delete_permission(self, request, obj=None):
        """Only super_admins can delete articles."""
        return request.user.is_superuser or request.user.role == "super_admin"


class EventArtistInline(admin.TabularInline):
    """Inline admin for Event-Artist relationship."""

    model = EventArtist
    extra = 1
    autocomplete_fields = ["artist"]


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    """Admin configuration for Event model."""

    list_display = ["title", "venue", "location", "date", "genre", "status", "created_at"]
    list_filter = ["genre", "status", "date", "created_at"]
    search_fields = ["title", "slug", "venue", "location"]
    prepopulated_fields = {"slug": ("title",)}
    readonly_fields = ["created_at", "updated_at"]
    inlines = [EventArtistInline]

    fieldsets = (
        ("Basic Information", {"fields": ("title", "slug", "description", "image")}),
        ("Event Details", {"fields": ("venue", "location", "date", "time", "ticket_link", "price")}),
        ("Category & Status", {"fields": ("genre", "status")}),
        ("Created By", {"fields": ("created_by",)}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )

    def get_queryset(self, request):
        """Filter queryset based on user role."""
        qs = super().get_queryset(request)
        if request.user.role == "writer":
            # Writers can only see their own events
            return qs.filter(created_by=request.user)
        return qs

    def has_add_permission(self, request):
        """Writers and super_admins can add events."""
        return request.user.is_superuser or request.user.role in ["writer", "super_admin"]

    def has_change_permission(self, request, obj=None):
        """Writers can change their own events, super_admins can change all."""
        if request.user.is_superuser or request.user.role == "super_admin":
            return True
        if request.user.role == "writer":
            if obj:
                return obj.created_by == request.user
            return True
        return False

    def has_delete_permission(self, request, obj=None):
        """Only super_admins can delete events."""
        return request.user.is_superuser or request.user.role == "super_admin"

    def save_model(self, request, obj, form, change):
        """Set created_by to current user if not set."""
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(Artist)
class ArtistAdmin(admin.ModelAdmin):
    """Admin configuration for Artist model."""

    list_display = ["name", "genre", "location", "claimed", "article_count", "event_count", "created_at"]
    list_filter = ["genre", "claimed", "created_at"]
    search_fields = ["name", "slug", "location"]
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ["article_count", "event_count", "created_at", "updated_at", "related_articles", "related_events"]

    fieldsets = (
        ("Basic Information", {"fields": ("name", "slug", "bio", "image", "location", "genre")}),
        ("Spotify", {"fields": ("spotify_url", "spotify_artist_id")}),
        ("Social Media", {"fields": ("instagram", "twitter", "tiktok", "website")}),
        ("Claiming", {"fields": ("email", "claimed", "claimed_by")}),
        ("Statistics", {"fields": ("article_count", "event_count", "profile_views")}),
        ("Related Content", {"fields": ("related_articles", "related_events")}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )

    def article_count(self, obj):
        """Display article count."""
        return obj.article_count

    article_count.short_description = "Articles"

    def event_count(self, obj):
        """Display event count."""
        return obj.event_count

    event_count.short_description = "Events"

    def related_articles(self, obj):
        """Display related articles."""
        articles = obj.get_articles()[:5]
        if not articles:
            return "No articles"
        links = []
        for article in articles:
            url = reverse("admin:content_article_change", args=[article.pk])
            links.append(f'<a href="{url}">{article.title}</a>')
        return format_html("<br>".join(links))

    related_articles.short_description = "Related Articles"

    def related_events(self, obj):
        """Display related events."""
        events = obj.get_events()[:5]
        if not events:
            return "No events"
        links = []
        for event in events:
            url = reverse("admin:content_event_change", args=[event.pk])
            links.append(f'<a href="{url}">{event.title}</a>')
        return format_html("<br>".join(links))

    related_events.short_description = "Related Events"

    def has_add_permission(self, request):
        """Writers and super_admins can add artists."""
        return request.user.is_superuser or request.user.role in ["writer", "super_admin"]

    def has_change_permission(self, request, obj=None):
        """Only super_admins can change artists."""
        return request.user.is_superuser or request.user.role == "super_admin"

    def has_delete_permission(self, request, obj=None):
        """Only super_admins can delete artists."""
        return request.user.is_superuser or request.user.role == "super_admin"

    def save_model(self, request, obj, form, change):
        """Send claim invitation email when email is provided."""
        email_sent = False
        if obj.email and not change:
            # New artist with email, send claim invitation
            email_sent = True
        
        super().save_model(request, obj, form, change)
        
        if email_sent and obj.email:
            # Send claim invitation email
            current_site = get_current_site(request)
            site_name = current_site.name
            site_domain = current_site.domain
            
            subject = f"Claim Your Artist Profile on {site_name}"
            html_message = render_to_string(
                "admin/artist_claim_email.html",
                {
                    "artist": obj,
                    "site_name": site_name,
                    "site_domain": site_domain,
                    "claim_url": f"http://{site_domain}/onboarding?artist={obj.slug}",
                },
            )
            plain_message = strip_tags(html_message)
            
            try:
                send_mail(
                    subject,
                    plain_message,
                    settings.DEFAULT_FROM_EMAIL,
                    [obj.email],
                    html_message=html_message,
                    fail_silently=False,
                )
            except Exception as e:
                # Log error but don't fail the save
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to send artist claim email: {e}")


@admin.register(Writer)
class WriterAdmin(admin.ModelAdmin):
    """Admin configuration for Writer model."""

    list_display = ["name", "user", "role", "article_count", "created_at"]
    list_filter = ["role", "created_at"]
    search_fields = ["name", "user__email", "user__username"]
    readonly_fields = ["article_count", "created_at", "updated_at"]

    fieldsets = (
        ("Basic Information", {"fields": ("user", "name", "bio", "image", "role")}),
        ("Social Media", {"fields": ("instagram", "cashtag")}),
        ("Statistics", {"fields": ("article_count",)}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )

    def article_count(self, obj):
        """Display article count."""
        return obj.article_count

    article_count.short_description = "Articles"

    def has_add_permission(self, request):
        """Only super_admins can add writers."""
        return request.user.is_superuser or request.user.role == "super_admin"

    def has_change_permission(self, request, obj=None):
        """Only super_admins can change writers."""
        return request.user.is_superuser or request.user.role == "super_admin"

    def has_delete_permission(self, request, obj=None):
        """Only super_admins can delete writers."""
        return request.user.is_superuser or request.user.role == "super_admin"

    def save_model(self, request, obj, form, change):
        """Send email invitation when creating a new writer."""
        super().save_model(request, obj, form, change)
        
        if not change and obj.user and obj.user.email:
            # New writer created, send access email
            current_site = get_current_site(request)
            site_name = current_site.name
            site_domain = current_site.domain
            
            subject = f"Welcome to {site_name} - Writer Access"
            html_message = render_to_string(
                "admin/writer_invitation_email.html",
                {
                    "writer": obj,
                    "site_name": site_name,
                    "site_domain": site_domain,
                    "login_url": f"http://{site_domain}/accounts/login/",
                },
            )
            plain_message = strip_tags(html_message)
            
            try:
                send_mail(
                    subject,
                    plain_message,
                    settings.DEFAULT_FROM_EMAIL,
                    [obj.user.email],
                    html_message=html_message,
                    fail_silently=False,
                )
            except Exception as e:
                # Log error but don't fail the save
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to send writer invitation email: {e}")


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    """Admin configuration for Comment model."""

    list_display = ["article", "user", "content_preview", "created_at"]
    list_filter = ["created_at", "article"]
    search_fields = ["content", "user__email", "article__title"]
    readonly_fields = ["created_at", "updated_at"]

    fieldsets = (
        ("Comment", {"fields": ("article", "user", "content", "parent")}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )

    def content_preview(self, obj):
        """Display content preview."""
        return obj.content[:50] + "..." if len(obj.content) > 50 else obj.content

    content_preview.short_description = "Content"

    def has_add_permission(self, request):
        """Only super_admins can add comments (users create via API)."""
        return request.user.is_superuser or request.user.role == "super_admin"

    def has_change_permission(self, request, obj=None):
        """Only super_admins can change comments."""
        return request.user.is_superuser or request.user.role == "super_admin"

    def has_delete_permission(self, request, obj=None):
        """Only super_admins can delete comments."""
        return request.user.is_superuser or request.user.role == "super_admin"
