from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import User
from .serializers import ApplicantRegisterSerializer, HRRegisterSerializer, UserSerializer


def _tokens(user):
    r = RefreshToken.for_user(user)
    return {'refresh': str(r), 'access': str(r.access_token)}


class ApplicantRegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        s = ApplicantRegisterSerializer(data=request.data)
        if s.is_valid():
            user = s.save()
            return Response({'user': UserSerializer(user).data, 'tokens': _tokens(user)}, status=201)
        return Response(s.errors, status=400)


class HRRegisterView(APIView):
    """
    HR self-registration.
    Gate with HR_INVITE_CODE env var in production.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        import os
        code = os.environ.get('HR_INVITE_CODE', '').strip()
        if code and request.data.get('invite_code', '').strip() != code:
            return Response({'error': 'Invalid invite code.'}, status=403)
        data = {k: v for k, v in request.data.items() if k != 'invite_code'}
        s = HRRegisterSerializer(data=data)
        if s.is_valid():
            user = s.save()
            return Response({'user': UserSerializer(user).data, 'tokens': _tokens(user)}, status=201)
        return Response(s.errors, status=400)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email    = request.data.get('email', '').strip().lower()
        password = request.data.get('password', '')
        user     = authenticate(request, username=email, password=password)
        if user and user.is_active:
            return Response({'user': UserSerializer(user).data, 'tokens': _tokens(user)})
        return Response({'error': 'Invalid email or password.'}, status=401)


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            RefreshToken(request.data.get('refresh', '')).blacklist()
        except Exception:
            pass
        return Response({'message': 'Logged out.'})


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class   = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if not user.check_password(request.data.get('old_password', '')):
            return Response({'error': 'Current password is incorrect.'}, status=400)
        new = request.data.get('new_password', '')
        if len(new) < 8:
            return Response({'error': 'Password must be at least 8 characters.'}, status=400)
        user.set_password(new)
        user.save()
        return Response({'message': 'Password changed.'})