"""
Factory classes for creating test data in the users app.
"""
import factory
from users.models import ArticleRead, SavedArticle
from content.tests.factories import ArticleFactory, UserFactory


class ArticleReadFactory(factory.django.DjangoModelFactory):
    """Factory for creating ArticleRead instances."""
    
    class Meta:
        model = ArticleRead
    
    user = factory.SubFactory(UserFactory)
    article = factory.SubFactory(ArticleFactory)


class SavedArticleFactory(factory.django.DjangoModelFactory):
    """Factory for creating SavedArticle instances."""
    
    class Meta:
        model = SavedArticle
    
    user = factory.SubFactory(UserFactory)
    article = factory.SubFactory(ArticleFactory)

