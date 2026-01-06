from django.urls import path
from .api import register, login_view, logout_view, current_user

urlpatterns = [
    path("register/", register, name="register"),
    path("login/", login_view, name="login"),
    path("logout/", logout_view, name="logout"),
    path("user/", current_user, name="current_user"),
]

