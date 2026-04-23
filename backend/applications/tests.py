import sys
import types
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from applications.models import Application
from jobs.models import Job


User = get_user_model()


class DummyPage:
    def __init__(self, text):
        self._text = text

    def get_text(self):
        return self._text


class DummyDoc:
    def __init__(self, text="Readable resume text"):
        self._pages = [DummyPage(text)]

    def __iter__(self):
        return iter(self._pages)

    def close(self):
        return None


class ApplicationViewSetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.hr_user = User.objects.create_user(
            username="hr-owner",
            email="owner@example.com",
            password="StrongPass123",
            first_name="Owner",
            last_name="Hr",
            role=User.Role.HR,
        )
        self.applicant = User.objects.create_user(
            username="applicant-one",
            email="applicant@example.com",
            password="StrongPass123",
            first_name="Apply",
            last_name="Cant",
            role=User.Role.APPLICANT,
        )
        self.other_applicant = User.objects.create_user(
            username="applicant-two",
            email="other@applicant.com",
            password="StrongPass123",
            first_name="Other",
            last_name="Applicant",
            role=User.Role.APPLICANT,
        )
        self.job = Job.objects.create(
            posted_by=self.hr_user,
            title="Machine Learning Engineer",
            department="Engineering",
            location="Hyderabad",
            job_type=Job.JobType.FULL_TIME,
            experience_level=Job.ExperienceLevel.MID,
            description="Build models",
            requirements="Python, NLP",
            responsibilities="Own ML systems",
            skills_required=["Python", "NLP"],
            status=Job.Status.ACTIVE,
        )

    def _resume_file(self, name="resume.pdf", content=b"%PDF-1.4 fake pdf bytes"):
        return SimpleUploadedFile(name, content, content_type="application/pdf")

    def _create_application(self, *, applicant=None, status_value=Application.Status.PENDING, final_score=82.0):
        return Application.objects.create(
            applicant=applicant or self.applicant,
            job=self.job,
            status=status_value,
            final_score=final_score,
            current_role="ML Engineer",
            skills_mentioned=["Python"],
            extracted_text="Existing extracted text",
        )

    def test_applicant_can_create_application_with_pdf_resume(self):
        fake_fitz = types.ModuleType("fitz")
        fake_fitz.open = lambda **kwargs: DummyDoc("Readable resume text")
        score_mock = MagicMock()
        fake_scorer = types.ModuleType("shortlist.hybrid_scorer")
        fake_scorer.score_application = score_mock
        self.client.force_authenticate(self.applicant)
        with patch.dict(sys.modules, {"fitz": fake_fitz, "shortlist.hybrid_scorer": fake_scorer}):
            response = self.client.post(
                "/api/applications/",
                {
                    "job": str(self.job.id),
                    "resume_file": self._resume_file(),
                    "cover_letter": "I would love to join.",
                    "years_of_experience": "3",
                    "current_company": "Acme",
                    "current_role": "Engineer",
                    "notice_period_days": "30",
                    "expected_salary": "1200000",
                    "linkedin_url": "https://linkedin.com/in/example",
                    "portfolio_url": "https://example.com",
                    "skills_mentioned": '["Python","NLP"]',
                },
                format="multipart",
            )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = Application.objects.get(applicant=self.applicant, job=self.job)
        self.assertEqual(created.resume_hash != "", True)
        self.assertEqual(created.extracted_text, "Readable resume text")
        score_mock.assert_called_once_with(created)

    def test_hr_cannot_create_application(self):
        self.client.force_authenticate(self.hr_user)

        response = self.client.post("/api/applications/", {"job": self.job.id}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["error"], "HR accounts cannot submit applications.")

    def test_by_job_requires_job_id(self):
        self.client.force_authenticate(self.hr_user)

        response = self.client.get("/api/applications/by_job/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "job_id required.")

    def test_by_job_returns_only_requested_job_for_owner(self):
        target = self._create_application(applicant=self.applicant, final_score=91.0)
        other_job = Job.objects.create(
            posted_by=self.hr_user,
            title="Backend Engineer",
            department="Engineering",
            location="Remote",
            job_type=Job.JobType.FULL_TIME,
            experience_level=Job.ExperienceLevel.MID,
            description="Build services",
            requirements="Python",
            responsibilities="Ship APIs",
            skills_required=["Python"],
            status=Job.Status.ACTIVE,
        )
        Application.objects.create(
            applicant=self.other_applicant,
            job=other_job,
            status=Application.Status.PENDING,
            final_score=40.0,
            current_role="Developer",
            skills_mentioned=["Python"],
            extracted_text="Other text",
        )

        self.client.force_authenticate(self.hr_user)
        response = self.client.get("/api/applications/by_job/", {"job_id": self.job.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([row["id"] for row in response.data], [target.id])

    def test_daily_summary_returns_counts_per_day(self):
        self._create_application(applicant=self.applicant, status_value=Application.Status.SHORTLISTED, final_score=88.0)
        self._create_application(applicant=self.other_applicant, status_value=Application.Status.PENDING, final_score=None)

        self.client.force_authenticate(self.hr_user)
        response = self.client.get("/api/applications/daily_summary/", {"job_id": self.job.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["total"], 2)
        self.assertEqual(response.data[0]["shortlisted"], 1)
        self.assertEqual(response.data[0]["scored"], 1)

    def test_update_status_rejects_invalid_values(self):
        application = self._create_application()
        self.client.force_authenticate(self.hr_user)

        response = self.client.patch(
            f"/api/applications/{application.id}/update_status/",
            {"status": "NOT_A_STATUS"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invalid status", response.data["error"])

    def test_update_status_allows_hr_to_change_status(self):
        application = self._create_application()
        self.client.force_authenticate(self.hr_user)

        response = self.client.patch(
            f"/api/applications/{application.id}/update_status/",
            {"status": Application.Status.INTERVIEW},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        application.refresh_from_db()
        self.assertEqual(application.status, Application.Status.INTERVIEW)

    def test_withdraw_marks_own_application_withdrawn(self):
        application = self._create_application()
        self.client.force_authenticate(self.applicant)

        response = self.client.post(f"/api/applications/{application.id}/withdraw/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        application.refresh_from_db()
        self.assertEqual(application.status, Application.Status.WITHDRAWN)

    def test_withdraw_rejects_hired_application(self):
        application = self._create_application(status_value=Application.Status.HIRED)
        self.client.force_authenticate(self.applicant)

        response = self.client.post(f"/api/applications/{application.id}/withdraw/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "Cannot withdraw at this stage.")
