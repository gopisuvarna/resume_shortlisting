from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase

from users.models import User
from users.serializers import (
    ApplicantRegisterSerializer,
    HRRegisterSerializer,
    UserSerializer,
    _gen_username,
)


class UserModelTests(TestCase):
    def test_applicant_reports_role_flags(self):
        user = User(
            username="applicant",
            email="applicant@example.com",
            role=User.Role.APPLICANT,
            first_name="App",
            last_name="Licant",
        )

        self.assertTrue(user.is_applicant)
        self.assertFalse(user.is_hr)

    def test_hr_reports_role_flags(self):
        user = User(
            username="hr",
            email="hr@example.com",
            role=User.Role.HR,
            first_name="H",
            last_name="R",
        )

        self.assertTrue(user.is_hr)
        self.assertFalse(user.is_applicant)

    def test_saving_applicant_clears_staff_and_superuser(self):
        user = User.objects.create_user(
            username="staff-applicant",
            email="staff-applicant@example.com",
            password="StrongPass123",
            first_name="Staff",
            last_name="Applicant",
            role=User.Role.APPLICANT,
            is_staff=True,
            is_superuser=True,
        )

        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertEqual(user.role, User.Role.APPLICANT)

    def test_saving_hr_forces_staff_access(self):
        user = User.objects.create_user(
            username="hr-user",
            email="hr-user@example.com",
            password="StrongPass123",
            first_name="HR",
            last_name="User",
            role=User.Role.HR,
            is_staff=False,
        )

        self.assertTrue(user.is_staff)
        self.assertEqual(user.role, User.Role.HR)

    def test_applicant_role_clears_staff_flag_even_if_requested(self):
        user = User.objects.create_user(
            username="staff-user",
            email="staff-user@example.com",
            password="StrongPass123",
            first_name="Staff",
            last_name="User",
            role=User.Role.APPLICANT,
            is_staff=True,
        )

        self.assertEqual(user.role, User.Role.APPLICANT)
        self.assertFalse(user.is_staff)

    def test_applicant_role_clears_superuser_flag_even_if_requested(self):
        user = User.objects.create_user(
            username="super-user",
            email="super-user@example.com",
            password="StrongPass123",
            first_name="Super",
            last_name="User",
            role=User.Role.APPLICANT,
            is_superuser=True,
        )

        self.assertEqual(user.role, User.Role.APPLICANT)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)

    def test_string_representation_includes_full_name_email_and_role(self):
        user = User.objects.create_user(
            username="repr-user",
            email="repr@example.com",
            password="StrongPass123",
            first_name="Repr",
            last_name="User",
            role=User.Role.HR,
        )

        self.assertEqual(str(user), "Repr User <repr@example.com> [HR]")


class UserSerializerTests(TestCase):
    def test_applicant_register_serializer_rejects_password_mismatch(self):
        serializer = ApplicantRegisterSerializer(
            data={
                "email": "new@example.com",
                "first_name": "New",
                "last_name": "User",
                "phone": "9999999999",
                "password": "StrongPass123",
                "password2": "WrongPass123",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertEqual(serializer.errors["password"][0], "Passwords do not match.")

    def test_applicant_register_serializer_rejects_duplicate_email(self):
        User.objects.create_user(
            username="existing",
            email="existing@example.com",
            password="StrongPass123",
            first_name="Existing",
            last_name="User",
            role=User.Role.APPLICANT,
        )

        serializer = ApplicantRegisterSerializer(
            data={
                "email": "EXISTING@example.com",
                "first_name": "Existing",
                "last_name": "User",
                "phone": "9999999999",
                "password": "StrongPass123",
                "password2": "StrongPass123",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertEqual(
            serializer.errors["email"][0],
            "An account with this email already exists.",
        )

    def test_applicant_register_serializer_creates_normalized_applicant(self):
        serializer = ApplicantRegisterSerializer(
            data={
                "email": "Applicant+Alias@Example.com",
                "first_name": "Applicant",
                "last_name": "User",
                "phone": "9999999999",
                "password": "StrongPass123",
                "password2": "StrongPass123",
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()

        self.assertEqual(user.email, "applicant+alias@example.com")
        self.assertEqual(user.role, User.Role.APPLICANT)
        self.assertFalse(user.is_staff)
        self.assertTrue(user.check_password("StrongPass123"))

    def test_hr_register_serializer_rejects_password_mismatch(self):
        serializer = HRRegisterSerializer(
            data={
                "email": "hr@example.com",
                "first_name": "HR",
                "last_name": "User",
                "phone": "9999999999",
                "hr_department": "Engineering",
                "password": "StrongPass123",
                "password2": "WrongPass123",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertEqual(serializer.errors["password"][0], "Passwords do not match.")

    def test_hr_register_serializer_rejects_duplicate_email(self):
        User.objects.create_user(
            username="existing-hr",
            email="hr@example.com",
            password="StrongPass123",
            first_name="Existing",
            last_name="Hr",
            role=User.Role.HR,
        )

        serializer = HRRegisterSerializer(
            data={
                "email": "HR@example.com",
                "first_name": "HR",
                "last_name": "User",
                "phone": "9999999999",
                "hr_department": "Engineering",
                "password": "StrongPass123",
                "password2": "StrongPass123",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertEqual(
            serializer.errors["email"][0],
            "An account with this email already exists.",
        )

    def test_hr_register_serializer_creates_staff_hr_user(self):
        serializer = HRRegisterSerializer(
            data={
                "email": "hr@example.com",
                "first_name": "HR",
                "last_name": "User",
                "phone": "9999999999",
                "hr_department": "Engineering",
                "password": "StrongPass123",
                "password2": "StrongPass123",
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()

        self.assertEqual(user.role, User.Role.HR)
        self.assertTrue(user.is_staff)
        self.assertEqual(user.hr_department, "Engineering")

    def test_user_serializer_exposes_full_name_and_read_only_fields(self):
        user = User.objects.create_user(
            username="serial-user",
            email="serial@example.com",
            password="StrongPass123",
            first_name="Serial",
            last_name="User",
            role=User.Role.HR,
        )

        data = UserSerializer(user).data

        self.assertEqual(data["full_name"], "Serial User")
        self.assertEqual(data["role"], User.Role.HR)
        self.assertEqual(data["email"], "serial@example.com")

    def test_gen_username_retries_when_generated_username_exists(self):
        User.objects.create_user(
            username="existing_aaaaaa",
            email="existing-user@example.com",
            password="StrongPass123",
            first_name="Existing",
            last_name="User",
            role=User.Role.APPLICANT,
        )
        uuids = [
            SimpleNamespace(hex="aaaaaa123456"),
            SimpleNamespace(hex="bbbbbb654321"),
        ]

        with patch("users.serializers.uuid.uuid4", side_effect=uuids):
            username = _gen_username("existing@example.com")

        self.assertEqual(username, "existing_bbbbbb")


def _make_gen_username_test(email, expected_prefix):
    def test(self):
        with patch("users.serializers.uuid.uuid4", return_value=SimpleNamespace(hex="abcdef123456")):
            username = _gen_username(email)
        self.assertEqual(username, f"{expected_prefix}_abcdef")

    return test


_USERNAME_CASES = [
    ("plain@example.com", "plain"),
    ("first.last@example.com", "first_last"),
    ("first+alias@example.com", "first_alias"),
    ("mixed.symbols+alias@example.com", "mixed_symbols_alias"),
    ("averyveryveryverylongprefix@example.com", "averyveryveryverylon"),
]

for index, (email, expected_prefix) in enumerate(_USERNAME_CASES, start=1):
    setattr(
        UserSerializerTests,
        f"test_gen_username_case_{index}",
        _make_gen_username_test(email, expected_prefix),
    )
