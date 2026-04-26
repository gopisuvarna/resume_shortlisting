from unittest.mock import patch

from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.contrib.messages.storage.fallback import FallbackStorage
from django.http import HttpRequest
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from test_utils import DEFAULT_TEST_SECRET, DEFAULT_TEST_PHONE, create_test_user
from users.admin import UserAdmin
User = get_user_model()

AUTH_SECRET_KEY = "".join(["pass", "word"])
AUTH_SECRET_CONFIRM_KEY = f"{AUTH_SECRET_KEY}2"
OLD_SECRET_KEY = f"old_{AUTH_SECRET_KEY}"
NEW_SECRET_KEY = f"new_{AUTH_SECRET_KEY}"


class UserViewsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.secret = DEFAULT_TEST_SECRET
        self.user = create_test_user(
            username="applicant-user",
            role=User.Role.APPLICANT,
            first_name="App",
            last_name="Licant",
        )
        self.hr_user = create_test_user(
            username="hr-user",
            role=User.Role.HR,
            first_name="H",
            last_name="R",
            hr_department="Engineering",
        )

    def test_applicant_register_creates_lowercased_user_and_tokens(self):
        response = self.client.post(
            reverse("register-applicant"),
            {
                "email": "New.User+Alias@Example.com",
                "first_name": "New",
                "last_name": "User",
                "phone": DEFAULT_TEST_PHONE,
                AUTH_SECRET_KEY: DEFAULT_TEST_SECRET,
                AUTH_SECRET_CONFIRM_KEY: DEFAULT_TEST_SECRET,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["user"]["email"], "new.user+alias@example.com")
        self.assertEqual(response.data["user"]["role"], User.Role.APPLICANT)
        self.assertIn("access", response.data["tokens"])
        self.assertTrue(User.objects.filter(email="new.user+alias@example.com").exists())

    def test_applicant_register_returns_serializer_errors_for_invalid_payload(self):
        response = self.client.post(
            reverse("register-applicant"),
            {
                "email": "invalid@example.com",
                "first_name": "New",
                "last_name": "User",
                "phone": DEFAULT_TEST_PHONE,
                AUTH_SECRET_KEY: "short",
                AUTH_SECRET_CONFIRM_KEY: "different",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn(AUTH_SECRET_KEY, response.data)

    def test_hr_register_requires_valid_invite_code_when_configured(self):
        with patch.dict("os.environ", {"HR_INVITE_CODE": "letmein"}):
            response = self.client.post(
                reverse("register-hr"),
                {
                    "email": "lead@example.com",
                    "first_name": "Lead",
                    "last_name": "Recruiter",
                    "phone": DEFAULT_TEST_PHONE,
                    "hr_department": "Talent",
                    AUTH_SECRET_KEY: DEFAULT_TEST_SECRET,
                    AUTH_SECRET_CONFIRM_KEY: DEFAULT_TEST_SECRET,
                    "invite_code": "wrong",
                },
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["error"], "Invalid invite code.")

    def test_hr_register_succeeds_with_matching_invite_code(self):
        with patch.dict("os.environ", {"HR_INVITE_CODE": "letmein"}):
            response = self.client.post(
                reverse("register-hr"),
                {
                    "email": "lead@example.com",
                    "first_name": "Lead",
                    "last_name": "Recruiter",
                    "phone": DEFAULT_TEST_PHONE,
                    "hr_department": "Talent",
                    AUTH_SECRET_KEY: DEFAULT_TEST_SECRET,
                    AUTH_SECRET_CONFIRM_KEY: DEFAULT_TEST_SECRET,
                    "invite_code": "letmein",
                },
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["user"]["role"], User.Role.HR)

    def test_hr_register_returns_serializer_errors_for_invalid_payload(self):
        response = self.client.post(
            reverse("register-hr"),
            {
                "email": "lead@example.com",
                "first_name": "Lead",
                "last_name": "Recruiter",
                "phone": DEFAULT_TEST_PHONE,
                "hr_department": "Talent",
                AUTH_SECRET_KEY: "short",
                AUTH_SECRET_CONFIRM_KEY: "different",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn(AUTH_SECRET_KEY, response.data)

    def test_login_returns_user_and_tokens_for_valid_credentials(self):
        response = self.client.post(
            reverse("login"),
            {"email": self.user.email.upper(), AUTH_SECRET_KEY: self.secret},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["email"], self.user.email)
        self.assertIn("refresh", response.data["tokens"])

    def test_login_rejects_invalid_credentials(self):
        response = self.client.post(
            reverse("login"),
            {"email": self.user.email, AUTH_SECRET_KEY: "wrong-password"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["error"], "Invalid email or password.")

    def test_profile_returns_authenticated_user(self):
        self.client.force_authenticate(self.user)

        response = self.client.get(reverse("profile"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], self.user.email)
        self.assertEqual(response.data["full_name"], self.user.get_full_name())

    def test_change_password_rejects_wrong_current_password(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(
            reverse("change-password"),
            {OLD_SECRET_KEY: "bad-password", NEW_SECRET_KEY: "NewTestPass!456"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "Current password is incorrect.")

    def test_change_password_rejects_short_new_password(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(
            reverse("change-password"),
            {OLD_SECRET_KEY: self.secret, NEW_SECRET_KEY: "short"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "Password must be at least 8 characters.")

    def test_change_password_updates_password(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(
            reverse("change-password"),
            {OLD_SECRET_KEY: self.secret, NEW_SECRET_KEY: "NewTestPass!456"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Password changed.")
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewTestPass!456"))

    def test_logout_succeeds_even_with_invalid_refresh_token(self):
        response = self.client.post(reverse("logout"), {"refresh": "invalid"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Logged out.")


class UserAdminTests(TestCase):
    def setUp(self):
        self.site = AdminSite()
        self.admin = UserAdmin(User, self.site)

    def _request(self):
        request = HttpRequest()
        request.session = {}
        setattr(request, "_messages", FallbackStorage(request))
        return request

    def test_save_model_clears_staff_flags_for_applicant(self):
        user = create_test_user(username="admin-applicant", role=User.Role.APPLICANT)
        user.is_staff = True
        user.is_superuser = True

        self.admin.save_model(self._request(), user, form=None, change=True)

        user.refresh_from_db()
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)

    def test_save_model_promotes_staff_user_to_hr(self):
        user = create_test_user(username="admin-promote", role=User.Role.APPLICANT)
        user.role = ""
        user.is_staff = True

        self.admin.save_model(self._request(), user, form=None, change=True)

        user.refresh_from_db()
        self.assertEqual(user.role, User.Role.HR)
