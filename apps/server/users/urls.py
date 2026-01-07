from django.urls import path
from .api import (
    register,
    login_view,
    logout_view,
    current_user,
    change_password,
    read_articles,
    saved_articles,
    user_comments,
    dashboard_stats,
)

urlpatterns = [
    path("register/", register, name="register"),
    path("login/", login_view, name="login"),
    path("logout/", logout_view, name="logout"),
    path("user/", current_user, name="current_user"),
    path("user/password/", change_password, name="change_password"),
    path("user/articles/read/", read_articles, name="read_articles"),
    path("user/articles/saved/", saved_articles, name="saved_articles"),
    path("user/articles/saved/<int:saved_id>/", saved_articles, name="unsave_article"),
    path("user/comments/", user_comments, name="user_comments"),
    path("user/stats/", dashboard_stats, name="dashboard_stats"),
]
