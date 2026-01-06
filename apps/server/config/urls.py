"""
URL configuration for Dead Party Media project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("content.api.urls")),
    path("api/auth/", include("users.urls")),
    path("ckeditor/", include("ckeditor_uploader.urls")),
    path("accounts/", include("allauth.urls")),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
