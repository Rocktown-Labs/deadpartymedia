"""
Pytest fixtures specific to content app tests.
"""
import pytest
from content.tests.factories import (
    UserFactory,
    WriterFactory,
    ArtistFactory,
    ArticleFactory,
    EventFactory,
    CommentFactory,
)


@pytest.fixture
def user():
    """Create a test user."""
    return UserFactory()


@pytest.fixture
def writer():
    """Create a test writer."""
    return WriterFactory()


@pytest.fixture
def artist():
    """Create a test artist."""
    return ArtistFactory()


@pytest.fixture
def article():
    """Create a test article."""
    return ArticleFactory()


@pytest.fixture
def event():
    """Create a test event."""
    return EventFactory()


@pytest.fixture
def comment():
    """Create a test comment."""
    return CommentFactory()


@pytest.fixture
def superuser():
    """Create a superuser."""
    return UserFactory(is_superuser=True, is_staff=True, role="super_admin")


@pytest.fixture
def writer_user():
    """Create a user with writer role."""
    return UserFactory(role="writer")


@pytest.fixture
def artist_user():
    """Create a user with artist role."""
    return UserFactory(role="artist")

