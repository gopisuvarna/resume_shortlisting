from django.urls import path
from .views import (
    ApplicantRegisterView, HRRegisterView,
    LoginView, LogoutView, ProfileView, ChangePasswordView,
)

urlpatterns = [
    path('register/applicant/', ApplicantRegisterView.as_view(), name='register-applicant'),
    path('register/hr/',        HRRegisterView.as_view(),        name='register-hr'),
    path('login/',              LoginView.as_view(),              name='login'),
    path('logout/',             LogoutView.as_view(),             name='logout'),
    path('profile/',            ProfileView.as_view(),            name='profile'),
    path('change-password/',    ChangePasswordView.as_view(),     name='change-password'),
]
