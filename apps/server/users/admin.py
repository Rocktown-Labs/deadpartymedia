from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin configuration for User model."""

    list_display = ["email", "username", "role", "is_staff", "is_active", "date_joined"]
    list_filter = ["role", "is_staff", "is_active", "date_joined"]
    search_fields = ["email", "username", "first_name", "last_name"]
    ordering = ["-date_joined"]

    fieldsets = BaseUserAdmin.fieldsets + (
        ("Additional Info", {"fields": ("role", "bio", "avatar")}),
    )

    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ("Additional Info", {"fields": ("role", "bio", "avatar")}),
    )

    def has_add_permission(self, request):
        """Only super_admins can add users."""
        return request.user.role == "super_admin"

    def has_change_permission(self, request, obj=None):
        """Only super_admins can change users."""
        return request.user.role == "super_admin"

    def has_delete_permission(self, request, obj=None):
        """Only super_admins can delete users."""
        return request.user.role == "super_admin"
