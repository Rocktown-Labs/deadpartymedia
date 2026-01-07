"""
Pytest fixtures specific to users app tests.
"""
import pytest
from users.tests.factories import UserFactory, ArticleReadFactory, SavedArticleFactory


@pytest.fixture
def user():
    """Create a test user."""
    return UserFactory()


@pytest.fixture
def superuser():
    """Create a superuser."""
    return UserFactory(is_superuser=True, is_staff=True, role="super_admin")


@pytest.fixture
def article_read(user):
    """Create a test article read."""
    return ArticleReadFactory(user=user)


@pytest.fixture
def saved_article(user):
    """Create a test saved article."""
    return SavedArticleFactory(user=user)

