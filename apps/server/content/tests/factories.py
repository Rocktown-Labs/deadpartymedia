"""
Factory classes for creating test data in the content app.
"""
import factory
from django.contrib.auth import get_user_model
from django.utils import timezone
from content.models import Artist, Article, Event, Writer, Comment, ArticleArtist, EventArtist
from datetime import datetime, timedelta

User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    """Factory for creating User instances."""
    
    class Meta:
        model = User
        django_get_or_create = ("email",)
    
    email = factory.Sequence(lambda n: f"user{n}@example.com")
    username = factory.LazyAttribute(lambda obj: obj.email)
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    role = "fan"
    is_active = True
    is_staff = False
    is_superuser = False


class WriterFactory(factory.django.DjangoModelFactory):
    """Factory for creating Writer instances."""
    
    class Meta:
        model = Writer
        django_get_or_create = ("user",)
    
    user = factory.SubFactory(UserFactory, role="writer")
    name = factory.Faker("name")
    bio = factory.Faker("text", max_nb_chars=500)
    role = factory.Faker("job")
    instagram = factory.LazyAttribute(lambda obj: f"https://instagram.com/{obj.name.lower().replace(' ', '')}")
    cashtag = factory.LazyAttribute(lambda obj: f"${obj.name.lower().replace(' ', '')}")


class ArtistFactory(factory.django.DjangoModelFactory):
    """Factory for creating Artist instances."""
    
    class Meta:
        model = Artist
        django_get_or_create = ("slug",)
    
    name = factory.Sequence(lambda n: f"Artist {n}")
    slug = factory.LazyAttribute(lambda obj: f"artist-{obj.name.lower().replace(' ', '-')}")
    bio = factory.Faker("text", max_nb_chars=500)
    location = factory.Faker("city")
    genre = "EDM"
    spotify_url = factory.LazyAttribute(lambda obj: f"https://open.spotify.com/artist/{factory.Faker('uuid4')}")
    spotify_artist_id = factory.LazyAttribute(lambda obj: obj.spotify_url.split("/")[-1] if obj.spotify_url else None)
    instagram = factory.LazyAttribute(lambda obj: f"https://instagram.com/{obj.name.lower().replace(' ', '')}")
    twitter = factory.LazyAttribute(lambda obj: f"https://twitter.com/{obj.name.lower().replace(' ', '')}")
    claimed = False
    profile_views = 0


class ArticleFactory(factory.django.DjangoModelFactory):
    """Factory for creating Article instances."""
    
    class Meta:
        model = Article
        django_get_or_create = ("slug",)
    
    title = factory.Sequence(lambda n: f"Article Title {n}")
    slug = factory.LazyAttribute(lambda obj: f"article-{obj.title.lower().replace(' ', '-')}")
    category = "EDM"
    excerpt = factory.Faker("text", max_nb_chars=200)
    content = factory.Faker("text", max_nb_chars=2000)
    author = factory.SubFactory(WriterFactory)
    status = "published"
    published_at = factory.LazyFunction(timezone.now)
    views = 0
    
    @factory.post_generation
    def artists(self, create, extracted, **kwargs):
        """Add artists to the article."""
        if not create:
            return
        if extracted:
            for artist in extracted:
                ArticleArtist.objects.create(article=self, artist=artist)


class EventFactory(factory.django.DjangoModelFactory):
    """Factory for creating Event instances."""
    
    class Meta:
        model = Event
        django_get_or_create = ("slug",)
    
    title = factory.Sequence(lambda n: f"Event {n}")
    slug = factory.LazyAttribute(lambda obj: f"event-{obj.title.lower().replace(' ', '-')}")
    description = factory.Faker("text", max_nb_chars=500)
    venue = factory.Faker("company")
    location = factory.Faker("city")
    date = factory.LazyFunction(lambda: timezone.now().date() + timedelta(days=30))
    time = "20:00"
    ticket_link = factory.LazyAttribute(lambda obj: f"https://tickets.example.com/{obj.slug}")
    price = "$25"
    genre = "EDM"
    status = "published"
    created_by = factory.SubFactory(UserFactory)
    
    @factory.post_generation
    def artists(self, create, extracted, **kwargs):
        """Add artists to the event."""
        if not create:
            return
        if extracted:
            for artist in extracted:
                EventArtist.objects.create(event=self, artist=artist)


class CommentFactory(factory.django.DjangoModelFactory):
    """Factory for creating Comment instances."""
    
    class Meta:
        model = Comment
    
    article = factory.SubFactory(ArticleFactory)
    user = factory.SubFactory(UserFactory)
    content = factory.Faker("text", max_nb_chars=200)
    parent = None


class ArticleArtistFactory(factory.django.DjangoModelFactory):
    """Factory for creating ArticleArtist through model instances."""
    
    class Meta:
        model = ArticleArtist
    
    article = factory.SubFactory(ArticleFactory)
    artist = factory.SubFactory(ArtistFactory)


class EventArtistFactory(factory.django.DjangoModelFactory):
    """Factory for creating EventArtist through model instances."""
    
    class Meta:
        model = EventArtist
    
    event = factory.SubFactory(EventFactory)
    artist = factory.SubFactory(ArtistFactory)

