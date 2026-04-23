import sys
import types
from datetime import date
from hashlib import sha256
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIRequestFactory

from test_utils import DEFAULT_TEST_PHONE, create_test_user
from applications.models import Application, resume_upload_path
from applications.serializers import (
    ApplicationApplicantSerializer,
    ApplicationCreateSerializer,
    ApplicationHRSerializer,
    STATUS_MESSAGES,
)
from jobs.models import Job


User = get_user_model()


class DummyPage:
    def __init__(self, text):
        self._text = text

    def get_text(self):
        return self._text


class DummyDoc:
    def __init__(self, text):
        self._text = text

    def __iter__(self):
        return iter([DummyPage(self._text)])

    def close(self):
        return None


class ApplicationModelSerializerTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.hr_user = create_test_user(
            username="app-hr",
            email="app-hr@example.com",
            first_name="App",
            last_name="Hr",
            role=User.Role.HR,
        )
        self.applicant = create_test_user(
            username="applicant",
            email="applicant@example.com",
            first_name="App",
            last_name="Licant",
            role=User.Role.APPLICANT,
            phone=DEFAULT_TEST_PHONE,
        )
        self.job = Job.objects.create(
            posted_by=self.hr_user,
            title="ML Engineer",
            department="Engineering",
            location="Hyderabad",
            job_type=Job.JobType.FULL_TIME,
            experience_level=Job.ExperienceLevel.MID,
            description="Build ML systems",
            requirements="Python",
            responsibilities="Own models",
            skills_required=["Python", "ML"],
            status=Job.Status.ACTIVE,
        )
        self.application = Application.objects.create(
            applicant=self.applicant,
            job=self.job,
            status=Application.Status.PENDING,
            current_role="Engineer",
            skills_mentioned=["Python"],
            extracted_text="Readable resume text",
            final_score=82.4,
            nlp_score=70.0,
            embedding_score=75.0,
            llm_score=90.0,
            ai_skills_score=88.0,
            ai_experience_score=73.0,
            ai_education_score=66.0,
        )

    def _request(self):
        request = self.factory.get("/api/applications/")
        request.user = self.hr_user
        return request

    def test_resume_upload_path_uses_job_user_and_date(self):
        dummy = types.SimpleNamespace(job_id=99, applicant_id=7)

        with patch("applications.models.date") as date_mock:
            date_mock.today.return_value = date(2026, 4, 23)
            path = resume_upload_path(dummy, "resume.pdf")

        self.assertEqual(path, "resumes\\99\\2026-04-23\\7_resume.pdf")

    def test_application_string_representation_includes_user_job_and_status(self):
        text = str(self.application)

        self.assertIn("App Licant", text)
        self.assertIn("ML Engineer", text)
        self.assertIn("[PENDING]", text)

    def test_applicant_serializer_includes_job_fields(self):
        data = ApplicationApplicantSerializer(self.application).data

        self.assertEqual(data["job_title"], "ML Engineer")
        self.assertEqual(data["job_department"], "Engineering")
        self.assertEqual(data["job_location"], "Hyderabad")

    def test_applicant_serializer_marks_resume_presence_false_by_default(self):
        data = ApplicationApplicantSerializer(self.application).data
        self.assertFalse(data["has_resume"])

    def test_applicant_serializer_marks_resume_presence_true_when_file_exists(self):
        self.application.resume_file.save("resume.pdf", ContentFile(b"pdf"), save=True)

        data = ApplicationApplicantSerializer(self.application).data

        self.assertTrue(data["has_resume"])

    def test_hr_serializer_returns_none_resume_url_without_file(self):
        data = ApplicationHRSerializer(self.application, context={"request": self._request()}).data
        self.assertIsNone(data["resume_url"])

    def test_hr_serializer_builds_absolute_resume_url_with_request(self):
        self.application.resume_file.save("resume.pdf", ContentFile(b"pdf"), save=True)

        data = ApplicationHRSerializer(self.application, context={"request": self._request()}).data

        self.assertIn("/media/resumes/", data["resume_url"])
        self.assertTrue(data["resume_url"].startswith("http://testserver/"))

    def test_hr_serializer_returns_relative_resume_url_without_request(self):
        self.application.resume_file.save("resume.pdf", ContentFile(b"pdf"), save=True)

        data = ApplicationHRSerializer(self.application).data

        self.assertTrue(data["resume_url"].startswith("/media/resumes/"))

    def test_hr_serializer_returns_none_when_resume_url_generation_fails(self):
        class BrokenResume:
            def __bool__(self):
                return True

            @property
            def url(self):
                raise ValueError("boom")

        self.application.resume_file = BrokenResume()
        serializer = ApplicationHRSerializer(self.application, context={"request": self._request()})

        self.assertIsNone(serializer.get_resume_url(self.application))

    def test_hr_serializer_returns_score_breakdown_when_scored(self):
        data = ApplicationHRSerializer(self.application).data

        self.assertEqual(data["score_breakdown"]["overall"], 82.4)
        self.assertEqual(data["score_breakdown"]["skills"], 88.0)
        self.assertEqual(data["ai_score"], 82.4)

    def test_hr_serializer_returns_none_score_breakdown_when_unscored(self):
        self.application.final_score = None

        data = ApplicationHRSerializer(self.application).data

        self.assertIsNone(data["score_breakdown"])

    def test_create_serializer_accepts_list_skills_value(self):
        serializer = ApplicationCreateSerializer()

        self.assertEqual(serializer.validate_skills_mentioned(["Python"]), ["Python"])

    def test_create_serializer_parses_json_skills_value(self):
        serializer = ApplicationCreateSerializer()

        self.assertEqual(serializer.validate_skills_mentioned('["Python","ML"]'), ["Python", "ML"])

    def test_create_serializer_returns_empty_list_for_non_list_json(self):
        serializer = ApplicationCreateSerializer()

        self.assertEqual(serializer.validate_skills_mentioned('{"name":"Python"}'), [])

    def test_create_serializer_returns_empty_list_for_invalid_json(self):
        serializer = ApplicationCreateSerializer()

        self.assertEqual(serializer.validate_skills_mentioned("not-json"), [])

    def test_create_serializer_rejects_inactive_job(self):
        self.job.status = Job.Status.CLOSED
        serializer = ApplicationCreateSerializer()

        with self.assertRaisesMessage(Exception, "This job is not currently accepting applications."):
            serializer.validate_job(self.job)

    def test_create_serializer_accepts_active_job(self):
        serializer = ApplicationCreateSerializer()

        self.assertEqual(serializer.validate_job(self.job), self.job)

    def test_create_serializer_rejects_duplicate_application(self):
        serializer = ApplicationCreateSerializer(context={"request": types.SimpleNamespace(user=self.applicant)})

        with self.assertRaisesMessage(Exception, "You have already applied for this job."):
            serializer.validate({"job": self.job, "resume_file": SimpleUploadedFile("resume.pdf", b"pdf")})

    def test_create_serializer_rejects_non_pdf_file(self):
        serializer = ApplicationCreateSerializer(context={"request": types.SimpleNamespace(user=self.hr_user)})

        with self.assertRaisesMessage(Exception, "Only PDF files are allowed."):
            serializer.validate({"job": self.job, "resume_file": SimpleUploadedFile("resume.txt", b"text")})

    def test_create_serializer_rejects_duplicate_resume_hash_for_job(self):
        bytes_content = b"%PDF-1.4 duplicate"
        duplicate_hash = sha256(bytes_content).hexdigest()
        Application.objects.create(
            applicant=self.hr_user,
            job=self.job,
            status=Application.Status.PENDING,
            current_role="Engineer",
            skills_mentioned=["Python"],
            extracted_text="Existing",
            resume_hash=duplicate_hash,
        )
        other_user = create_test_user(
            username="duplicate-check",
            email="duplicate-check@example.com",
            first_name="Duplicate",
            last_name="Check",
            role=User.Role.APPLICANT,
        )
        serializer = ApplicationCreateSerializer(context={"request": types.SimpleNamespace(user=other_user)})

        with self.assertRaisesMessage(Exception, "A duplicate resume has already been submitted for this job."):
            serializer.validate({"job": self.job, "resume_file": SimpleUploadedFile("resume.pdf", bytes_content)})

    def test_create_serializer_rejects_pdf_parse_error(self):
        serializer = ApplicationCreateSerializer(context={"request": types.SimpleNamespace(user=self.hr_user)})
        fake_fitz = types.ModuleType("fitz")

        def boom(**kwargs):
            raise ValueError("parse failed")

        fake_fitz.open = boom

        with patch.dict(sys.modules, {"fitz": fake_fitz}):
            with self.assertRaisesMessage(Exception, "Failed to parse PDF: parse failed"):
                serializer.validate({"job": self.job, "resume_file": SimpleUploadedFile("resume.pdf", b"%PDF-1.4")})

    def test_create_serializer_rejects_pdf_without_readable_text(self):
        serializer = ApplicationCreateSerializer(context={"request": types.SimpleNamespace(user=self.hr_user)})
        fake_fitz = types.ModuleType("fitz")
        fake_fitz.open = lambda **kwargs: DummyDoc("   ")

        with patch.dict(sys.modules, {"fitz": fake_fitz}):
            with self.assertRaisesMessage(Exception, "The PDF contains no readable text."):
                serializer.validate({"job": self.job, "resume_file": SimpleUploadedFile("resume.pdf", b"%PDF-1.4")})

    def test_create_serializer_extracts_text_and_hash_for_valid_pdf(self):
        serializer = ApplicationCreateSerializer(context={"request": types.SimpleNamespace(user=self.hr_user)})
        fake_fitz = types.ModuleType("fitz")
        fake_fitz.open = lambda **kwargs: DummyDoc("Readable content")
        upload = SimpleUploadedFile("resume.pdf", b"%PDF-1.4 hello")

        with patch.dict(sys.modules, {"fitz": fake_fitz}):
            attrs = serializer.validate({"job": self.job, "resume_file": upload})

        self.assertEqual(attrs["extracted_text"], "Readable content")
        self.assertEqual(attrs["resume_hash"], sha256(b"%PDF-1.4 hello").hexdigest())

    def test_create_serializer_create_logs_scoring_error_but_still_saves(self):
        serializer = ApplicationCreateSerializer(context={"request": types.SimpleNamespace(user=self.hr_user)})
        score_module = types.ModuleType("shortlist.hybrid_scorer")

        def blow_up(app):
            raise RuntimeError("scoring failed")

        score_module.score_application = blow_up

        with patch.dict(sys.modules, {"shortlist.hybrid_scorer": score_module}):
            with patch("logging.getLogger") as get_logger:
                app = serializer.create(
                    {
                        "job": self.job,
                        "resume_file": SimpleUploadedFile("resume.pdf", b"%PDF-1.4"),
                        "skills_mentioned": [],
                        "resume_hash": "hash",
                        "extracted_text": "Text",
                    }
                )

        self.assertEqual(app.applicant, self.hr_user)
        self.assertTrue(Application.objects.filter(id=app.id).exists())
        get_logger.return_value.error.assert_called_once()


def _make_status_message_test(status_value, expected_message):
    def test(self):
        self.application.status = status_value
        data = ApplicationApplicantSerializer(self.application).data
        self.assertEqual(data["status_message"], expected_message)

    return test


for index, (status_value, expected_message) in enumerate(STATUS_MESSAGES.items(), start=1):
    setattr(
        ApplicationModelSerializerTests,
        f"test_status_message_case_{index}",
        _make_status_message_test(status_value, expected_message),
    )


def _make_shortlisted_state_test(status_value, expected):
    def test(self):
        self.application.status = status_value
        data = ApplicationApplicantSerializer(self.application).data
        self.assertEqual(data["is_shortlisted"], expected)

    return test


_SHORTLIST_CASES = [
    (Application.Status.PENDING, False),
    (Application.Status.REVIEWING, False),
    (Application.Status.SHORTLISTED, True),
    (Application.Status.INTERVIEW, True),
    (Application.Status.REJECTED, False),
    (Application.Status.OFFERED, True),
    (Application.Status.HIRED, True),
    (Application.Status.WITHDRAWN, False),
]

for index, (status_value, expected) in enumerate(_SHORTLIST_CASES, start=1):
    setattr(
        ApplicationModelSerializerTests,
        f"test_shortlisted_case_{index}",
        _make_shortlisted_state_test(status_value, expected),
    )


def _make_score_label_test(score, expected):
    def test(self):
        self.application.final_score = score
        serializer = ApplicationHRSerializer(self.application)
        self.assertEqual(serializer.get_score_label(self.application), expected)

    return test


_SCORE_LABEL_CASES = [
    (None, "Not yet scored"),
    (85.0, "Excellent match"),
    (70.0, "Good match"),
    (50.0, "Partial match"),
    (20.0, "Poor match"),
]

for index, (score, expected) in enumerate(_SCORE_LABEL_CASES, start=1):
    setattr(
        ApplicationModelSerializerTests,
        f"test_score_label_case_{index}",
        _make_score_label_test(score, expected),
    )


def _make_score_color_test(score, expected):
    def test(self):
        self.application.final_score = score
        serializer = ApplicationHRSerializer(self.application)
        self.assertEqual(serializer.get_score_color(self.application), expected)

    return test


_SCORE_COLOR_CASES = [
    (None, "gray"),
    (85.0, "green"),
    (70.0, "blue"),
    (50.0, "amber"),
    (20.0, "red"),
]

for index, (score, expected) in enumerate(_SCORE_COLOR_CASES, start=1):
    setattr(
        ApplicationModelSerializerTests,
        f"test_score_color_case_{index}",
        _make_score_color_test(score, expected),
    )
