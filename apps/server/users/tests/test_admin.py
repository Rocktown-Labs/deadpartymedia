"""
Tests for users app admin functionality.
"""
import pytest
from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from users.admin import UserAdmin
from users.tests.factories import UserFactory

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
def regular_user():
    """Create a regular user."""
    return UserFactory(role="fan", is_staff=False)


class TestUserAdmin:
    """Tests for UserAdmin."""
    
    def test_user_admin_has_add_permission_superuser(self, admin_site, superuser):
        """Test that superuser can add users."""
        admin = UserAdmin(User, admin_site)
        request = type("Request", (), {"user": superuser})()
        assert admin.has_add_permission(request) is True
    
    def test_user_admin_has_add_permission_regular_user(self, admin_site, regular_user):
        """Test that regular user cannot add users."""
        admin = UserAdmin(User, admin_site)
        request = type("Request", (), {"user": regular_user})()
        assert admin.has_add_permission(request) is False
    
    def test_user_admin_has_change_permission_superuser(self, admin_site, superuser):
        """Test that superuser can change users."""
        user = UserFactory()
        admin = UserAdmin(User, admin_site)
        request = type("Request", (), {"user": superuser})()
        assert admin.has_change_permission(request, user) is True
    
    def test_user_admin_has_change_permission_regular_user(self, admin_site, regular_user):
        """Test that regular user cannot change users."""
        user = UserFactory()
        admin = UserAdmin(User, admin_site)
        request = type("Request", (), {"user": regular_user})()
        assert admin.has_change_permission(request, user) is False
    
    def test_user_admin_has_delete_permission_superuser(self, admin_site, superuser):
        """Test that superuser can delete users."""
        user = UserFactory()
        admin = UserAdmin(User, admin_site)
        request = type("Request", (), {"user": superuser})()
        assert admin.has_delete_permission(request, user) is True
    
    def test_user_admin_has_delete_permission_regular_user(self, admin_site, regular_user):
        """Test that regular user cannot delete users."""
        user = UserFactory()
        admin = UserAdmin(User, admin_site)
        request = type("Request", (), {"user": regular_user})()
        assert admin.has_delete_permission(request, user) is False

