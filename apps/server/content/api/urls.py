from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ArticleViewSet, EventViewSet, ArtistViewSet, WriterViewSet, CategoryViewSet

router = DefaultRouter()
router.register(r"articles", ArticleViewSet, basename="article")
router.register(r"events", EventViewSet, basename="event")
router.register(r"artists", ArtistViewSet, basename="artist")
router.register(r"writers", WriterViewSet, basename="writer")
router.register(r"categories", CategoryViewSet, basename="category")

urlpatterns = [
    path("", include(router.urls)),
]

