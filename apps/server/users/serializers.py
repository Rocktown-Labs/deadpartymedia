from rest_framework import serializers
from django.contrib.auth import get_user_model
from users.models import ArticleRead, SavedArticle
from content.models import Article, Comment
from content.api.serializers import ArticleListSerializer, CommentSerializer

User = get_user_model()


class ArticleReadSerializer(serializers.ModelSerializer):
    """Serializer for ArticleRead model with article details."""

    article = ArticleListSerializer(read_only=True)
    read_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = ArticleRead
        fields = ["id", "article", "read_at"]


class SavedArticleSerializer(serializers.ModelSerializer):
    """Serializer for SavedArticle model with article details."""

    article = ArticleListSerializer(read_only=True)
    saved_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = SavedArticle
        fields = ["id", "article", "saved_at"]


class UserCommentSerializer(serializers.ModelSerializer):
    """Serializer for user's comments with article context and replies."""

    article = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            "id",
            "article",
            "content",
            "parent",
            "replies",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_article(self, obj):
        """Get article details."""
        return {
            "id": obj.article.id,
            "slug": obj.article.slug,
            "title": obj.article.title,
            "cover_image": obj.article.cover_image.url if obj.article.cover_image else None,
        }

    def get_replies(self, obj):
        """Get comment replies."""
        replies = obj.replies.all()
        return CommentSerializer(replies, many=True).data


class DashboardStatsSerializer(serializers.Serializer):
    """Serializer for dashboard statistics."""

    articles_read_count = serializers.IntegerField()
    articles_saved_count = serializers.IntegerField()
    comments_count = serializers.IntegerField()


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile."""

    class Meta:
        model = User
        fields = ["first_name", "last_name", "email"]
        extra_kwargs = {
            "email": {"required": True},
        }

    def validate_email(self, value):
        """Ensure email is unique if changed."""
        user = self.instance
        if User.objects.filter(email=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer for changing user password."""

    current_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, min_length=8)
    confirm_password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        """Validate password change."""
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return attrs

    def validate_current_password(self, value):
        """Verify current password."""
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

