"""
Pytest configuration and shared fixtures for Django tests.
"""
import pytest
from django.conf import settings
from django.core.management import call_command
from django.db import transaction
from django.test import override_settings
from io import StringIO


def pytest_collection_modifyitems(config, items):
    """Automatically add django_db marker to all tests that need database access."""
    for item in items:
        # Skip if test already has django_db marker
        if not item.get_closest_marker("django_db"):
            # Add django_db marker to all tests
            item.add_marker(pytest.mark.django_db)


@pytest.fixture(scope="session")
def django_db_setup(django_db_setup, django_db_blocker):
    """Set up test database with migrations."""
    with django_db_blocker.unblock():
        call_command("migrate", verbosity=0)


@pytest.fixture(autouse=True)
def disable_sentry(monkeypatch):
    """Disable Sentry SDK in tests."""
    monkeypatch.setenv("SENTRY_DSN", "")
    # Mock sentry_sdk to prevent errors
    import sentry_sdk
    original_capture = sentry_sdk.capture_exception
    original_set_context = sentry_sdk.set_context
    original_set_user = sentry_sdk.set_user
    
    def mock_capture(*args, **kwargs):
        pass
    
    def mock_set_context(*args, **kwargs):
        pass
    
    def mock_set_user(*args, **kwargs):
        pass
    
    monkeypatch.setattr(sentry_sdk, "capture_exception", mock_capture)
    monkeypatch.setattr(sentry_sdk, "set_context", mock_set_context)
    monkeypatch.setattr(sentry_sdk, "set_user", mock_set_user)


@pytest.fixture(autouse=True)
def email_backend(settings):
    """Use console email backend for tests."""
    settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"


@pytest.fixture(autouse=True)
def media_root(settings, tmp_path):
    """Use temporary directory for media files in tests."""
    settings.MEDIA_ROOT = str(tmp_path / "media")


@pytest.fixture(autouse=True)
def static_root(settings, tmp_path):
    """Use temporary directory for static files in tests."""
    settings.STATIC_ROOT = str(tmp_path / "static")


@pytest.fixture
def api_client():
    """Return a DRF API client."""
    from rest_framework.test import APIClient
    return APIClient()


@pytest.fixture
def authenticated_client(api_client, user):
    """Return an authenticated API client."""
    api_client.force_authenticate(user=user)
    return api_client

