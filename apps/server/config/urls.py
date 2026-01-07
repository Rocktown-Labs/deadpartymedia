"""
URL configuration for Dead Party Media project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse


def trigger_error(request):
    """Debug route to test Sentry integration."""
    division_by_zero = 1 / 0
    return HttpResponse("This should never be reached")


urlpatterns = [
    # Custom admin URL
    path("deadpartyrocks/", admin.site.urls),
    
    # API versioning: /v1/ for current version
    path("v1/", include("content.api.urls")),
    path("v1/auth/", include("users.urls")),
    
    # Legacy API paths (for backward compatibility during transition)
    path("api/", include("content.api.urls")),
    path("api/auth/", include("users.urls")),
    
    # Other endpoints
    path("ckeditor/", include("ckeditor_uploader.urls")),
    path("accounts/", include("allauth.urls")),
    path("sentry-debug/", trigger_error),  # Sentry test route
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
