from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from test_utils import DEFAULT_TEST_PASSWORD, DEFAULT_TEST_PHONE, create_test_user
User = get_user_model()


class UserViewsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.password = DEFAULT_TEST_PASSWORD
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
                "password": DEFAULT_TEST_PASSWORD,
                "password2": DEFAULT_TEST_PASSWORD,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["user"]["email"], "new.user+alias@example.com")
        self.assertEqual(response.data["user"]["role"], User.Role.APPLICANT)
        self.assertIn("access", response.data["tokens"])
        self.assertTrue(User.objects.filter(email="new.user+alias@example.com").exists())

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
                    "password": DEFAULT_TEST_PASSWORD,
                    "password2": DEFAULT_TEST_PASSWORD,
                    "invite_code": "wrong",
                },
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["error"], "Invalid invite code.")

    def test_login_returns_user_and_tokens_for_valid_credentials(self):
        response = self.client.post(
            reverse("login"),
            {"email": self.user.email.upper(), "password": self.password},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["email"], self.user.email)
        self.assertIn("refresh", response.data["tokens"])

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
            {"old_password": "bad-password", "new_password": "NewTestPass!456"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "Current password is incorrect.")

    def test_change_password_updates_password(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(
            reverse("change-password"),
            {"old_password": self.password, "new_password": "NewTestPass!456"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Password changed.")
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewTestPass!456"))
