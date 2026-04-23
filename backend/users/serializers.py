import uuid
from rest_framework import serializers
from .models import User


def _gen_username(email: str) -> str:
    """Generate unique username from email prefix."""
    base = email.split('@')[0][:20].replace('.', '_').replace('+', '_')
    username = f"{base}_{uuid.uuid4().hex[:6]}"
    while User.objects.filter(username=username).exists():
        username = f"{base}_{uuid.uuid4().hex[:6]}"
    return username


class _BaseRegisterSerializer(serializers.ModelSerializer):
    password  = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True)

    role = None
    staff_enabled = False

    class Meta:
        model  = User
        fields = []

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password2'):
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        email = attrs.get('email', '').strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError({'email': 'An account with this email already exists.'})
        attrs['email'] = email
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(
            username=_gen_username(validated_data['email']),
            role=self.role,
            is_staff=self.staff_enabled,
            is_superuser=False,
            is_active=True,
            **validated_data,
        )
        user.set_password(password)
        user.save()
        return user


class ApplicantRegisterSerializer(_BaseRegisterSerializer):
    class Meta:
        model  = User
        fields = ['email', 'first_name', 'last_name', 'phone', 'password', 'password2']

    role = User.Role.APPLICANT
    staff_enabled = False


class HRRegisterSerializer(_BaseRegisterSerializer):
    class Meta:
        model  = User
        fields = ['email', 'first_name', 'last_name', 'phone', 'hr_department', 'password', 'password2']

    role = User.Role.HR
    staff_enabled = True


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='get_full_name', read_only=True)

    class Meta:
        model  = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'phone', 'hr_department', 'created_at',
        ]
        read_only_fields = ['id', 'role', 'created_at']