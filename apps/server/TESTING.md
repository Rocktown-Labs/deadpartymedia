# Testing Guide

This document describes the test suite for the Dead Party Media Django backend.

## Test Structure

The test suite is organized by app:

- `content/tests/` - Tests for content app (articles, events, artists, writers, comments)
- `users/tests/` - Tests for users app (authentication, user profiles, activity tracking)

Each app has the following test files:

- `test_models.py` - Model tests (validation, relationships, properties)
- `test_api.py` - API endpoint tests (viewsets, permissions, filtering)
- `test_serializers.py` - Serializer tests (validation, nested serialization)
- `test_admin.py` - Admin interface tests (permissions, custom methods)
- `test_integrations.py` - Integration tests (external APIs, file uploads, email)
- `test_edge_cases.py` - Edge cases and error handling

## Running Tests

### Run all tests:
```bash
pytest
```

### Run tests for a specific app:
```bash
pytest content/tests/
pytest users/tests/
```

### Run a specific test file:
```bash
pytest content/tests/test_api.py
```

### Run a specific test class:
```bash
pytest content/tests/test_api.py::TestArticleViewSet
```

### Run a specific test:
```bash
pytest content/tests/test_api.py::TestArticleViewSet::test_list_articles_unauthenticated
```

### Run with coverage:
```bash
pytest --cov=. --cov-report=html
```

### Run with verbose output:
```bash
pytest -v
```

### Run with output capture disabled (see print statements):
```bash
pytest -s
```

## Test Configuration

- **Test Framework**: pytest with pytest-django
- **Test Database**: Uses separate test database (automatically created/destroyed)
- **Fixtures**: Defined in `conftest.py` files (shared fixtures in root `conftest.py`)
- **Factories**: Test data factories using `factory-boy` in `tests/factories.py`

## Test Coverage Goals

- **Target**: 80%+ code coverage
- **Focus Areas**:
  - All API endpoints
  - Business logic (slug generation, validation)
  - Permission checks
  - Error handling
  - Edge cases

## Writing New Tests

### Using Factories

```python
from content.tests.factories import ArticleFactory, ArtistFactory

def test_my_feature():
    article = ArticleFactory(status="published")
    artist = ArtistFactory()
    # ... test code
```

### Using Fixtures

```python
def test_with_user(user, authenticated_client):
    # user and authenticated_client are available as fixtures
    response = authenticated_client.get("/api/articles/")
    assert response.status_code == 200
```

### Testing API Endpoints

```python
from django.urls import reverse
from rest_framework import status

def test_api_endpoint(api_client):
    url = reverse("article-list")
    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
```

### Testing Permissions

```python
def test_permission(authenticated_client, user):
    # Test authenticated endpoint
    url = reverse("current_user")
    response = authenticated_client.get(url)
    assert response.status_code == status.HTTP_200_OK
```

## Mocking External Services

### Mocking Spotify API

```python
import pytest
from unittest.mock import patch

def test_spotify_search(mocker):
    mock_spotify = mocker.patch("content.api.views.spotipy.Spotify")
    # ... test code
```

### Mocking Email

Email backend is automatically set to `locmem` in tests. Check `mail.outbox`:

```python
from django.core import mail

def test_email_sent():
    # ... code that sends email
    assert len(mail.outbox) == 1
    assert "subject" in mail.outbox[0].subject
```

## Common Test Patterns

### Testing Model Validation

```python
from django.core.exceptions import ValidationError

def test_model_validation():
    article = Article(category="INVALID")
    with pytest.raises(ValidationError):
        article.full_clean()
```

### Testing Unique Constraints

```python
from django.db import IntegrityError

def test_unique_constraint():
    ArticleRead.objects.create(user=user, article=article)
    with pytest.raises(IntegrityError):
        ArticleRead.objects.create(user=user, article=article)
```

### Testing Pagination

```python
def test_pagination(api_client):
    # Create more than PAGE_SIZE items
    for _ in range(25):
        ArticleFactory()
    response = api_client.get("/api/articles/")
    assert len(response.data["results"]) == 20
    assert "next" in response.data
```

## Continuous Integration

Tests should be run in CI/CD pipeline before deployment. Ensure:

1. All tests pass
2. Coverage meets minimum threshold (80%)
3. No linting errors
4. Database migrations are up to date

## Troubleshooting

### Database Issues

If tests fail with database errors:
```bash
# Recreate test database
pytest --create-db
```

### Import Errors

Ensure you're running tests from the project root:
```bash
cd apps/server
pytest
```

### Fixture Not Found

Check that fixtures are defined in `conftest.py` files. Fixtures in `conftest.py` are automatically available to all tests in that directory and subdirectories.

