import sys
import types
from contextlib import contextmanager
from itertools import count
from unittest.mock import MagicMock, patch

from django.test import TestCase
from django.urls import reverse
from django.utils.crypto import get_random_string
from rest_framework import status
from rest_framework.test import APIClient

from applications.models import Application
from jobs.models import Job
from users.models import User


class ShortlistTestDataMixin:
    _sequence = count(1)

    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.shortlist_url = reverse("shortlist")
        self.rescore_url = reverse("rescore")
        self.hr_user = self.create_user(role=User.Role.HR, prefix="hr")
        self.other_hr_user = self.create_user(role=User.Role.HR, prefix="other-hr")
        self.applicant_user = self.create_user(
            role=User.Role.APPLICANT,
            prefix="applicant",
        )
        self.job = self.create_job(posted_by=self.hr_user)
        self.other_job = self.create_job(
            posted_by=self.other_hr_user,
            title="Backend Engineer",
        )

    def create_user(self, *, role: str, prefix: str) -> User:
        index = next(self._sequence)
        generated_secret = f"test-{get_random_string(16)}"
        return User.objects.create_user(
            username=f"{prefix}-{index}",
            email=f"{prefix}-{index}@example.com",
            password=generated_secret,
            first_name=prefix.title(),
            last_name="User",
            role=role,
        )

    def create_job(self, *, posted_by: User, title: str = "Machine Learning Intern") -> Job:
        return Job.objects.create(
            posted_by=posted_by,
            title=title,
            department="Engineering",
            location="Hyderabad",
            job_type=Job.JobType.INTERNSHIP,
            experience_level=Job.ExperienceLevel.ENTRY,
            description=f"{title} description",
            requirements="Python, NLP",
            responsibilities="Build hiring workflows",
            skills_required=["Python", "NLP"],
            status=Job.Status.ACTIVE,
        )

    def create_application(
        self,
        *,
        job: Job | None = None,
        status_value: str = Application.Status.PENDING,
        final_score: float | None = 80.0,
        recommendation: str = "YES",
        extracted_text: str = "Resume text",
    ) -> Application:
        applicant = self.create_user(role=User.Role.APPLICANT, prefix="candidate")
        return Application.objects.create(
            applicant=applicant,
            job=job or self.job,
            status=status_value,
            final_score=final_score,
            ai_recommendation=recommendation,
            extracted_text=extracted_text,
            current_role="ML Intern",
            skills_mentioned=["Python"],
        )

    def authenticate_as(self, user: User):
        self.client.force_authenticate(user=user)


class ShortlistViewTests(ShortlistTestDataMixin, TestCase):
    def test_get_requires_hr_role(self):
        self.authenticate_as(self.applicant_user)

        response = self.client.get(self.shortlist_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["error"], "Forbidden.")

    def test_get_returns_scored_applications_filtered_and_sorted(self):
        low_score = self.create_application(
            status_value=Application.Status.REVIEWING,
            final_score=68.0,
            recommendation="YES",
        )
        high_score = self.create_application(
            status_value=Application.Status.SHORTLISTED,
            final_score=88.0,
            recommendation="STRONG_YES",
        )
        self.create_application(
            final_score=None,
            recommendation="STRONG_YES",
        )
        self.create_application(
            job=self.other_job,
            final_score=95.0,
            recommendation="STRONG_YES",
        )

        self.authenticate_as(self.hr_user)
        response = self.client.get(
            self.shortlist_url,
            {
                "job_id": self.job.id,
                "min_score": 65,
                "recommendation": "YES,STRONG_YES".split(",")[1],
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], high_score.id)
        self.assertEqual(response.data[0]["ai_score"], high_score.final_score)
        self.assertGreater(high_score.final_score, low_score.final_score)

    def test_post_requires_hr_role(self):
        self.authenticate_as(self.applicant_user)

        response = self.client.post(
            self.shortlist_url,
            {"job_id": self.job.id, "threshold": 65},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["error"], "Forbidden.")

    def test_post_requires_job_id(self):
        self.authenticate_as(self.hr_user)

        response = self.client.post(self.shortlist_url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "job_id is required.")

    def test_post_shortlists_reverts_and_preserves_manual_statuses(self):
        shortlisted_now = self.create_application(
            status_value=Application.Status.PENDING,
            final_score=86.0,
        )
        stays_reviewing = self.create_application(
            status_value=Application.Status.REVIEWING,
            final_score=62.0,
        )
        reverted = self.create_application(
            status_value=Application.Status.SHORTLISTED,
            final_score=58.0,
        )
        interviewing = self.create_application(
            status_value=Application.Status.INTERVIEW,
            final_score=91.0,
        )
        hired = self.create_application(
            status_value=Application.Status.HIRED,
            final_score=97.0,
        )

        self.authenticate_as(self.hr_user)
        response = self.client.post(
            self.shortlist_url,
            {"job_id": self.job.id, "threshold": 65},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["shortlisted"], 1)
        self.assertEqual(response.data["reverted"], 1)
        self.assertEqual(response.data["threshold"], 65.0)

        shortlisted_now.refresh_from_db()
        stays_reviewing.refresh_from_db()
        reverted.refresh_from_db()
        interviewing.refresh_from_db()
        hired.refresh_from_db()

        self.assertEqual(shortlisted_now.status, Application.Status.SHORTLISTED)
        self.assertEqual(stays_reviewing.status, Application.Status.REVIEWING)
        self.assertEqual(reverted.status, Application.Status.REVIEWING)
        self.assertEqual(interviewing.status, Application.Status.INTERVIEW)
        self.assertEqual(hired.status, Application.Status.HIRED)

    def test_post_uses_default_threshold_when_not_provided(self):
        scored_candidate = self.create_application(
            status_value=Application.Status.REVIEWING,
            final_score=61.0,
        )
        self.authenticate_as(self.hr_user)

        response = self.client.post(
            self.shortlist_url,
            {"job_id": self.job.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["threshold"], 60.0)

        scored_candidate.refresh_from_db()
        self.assertEqual(scored_candidate.status, Application.Status.SHORTLISTED)


class RescoreViewTests(ShortlistTestDataMixin, TestCase):
    def test_post_requires_hr_role(self):
        self.authenticate_as(self.applicant_user)

        response = self.client.post(
            self.rescore_url,
            {"job_id": self.job.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["error"], "Forbidden.")

    def test_post_requires_application_id_or_job_id(self):
        self.authenticate_as(self.hr_user)

        response = self.client.post(self.rescore_url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "Provide application_id or job_id.")

    def test_post_returns_not_found_for_unknown_application(self):
        self.authenticate_as(self.hr_user)

        with self._patched_scorer():
            response = self.client.post(
                self.rescore_url,
                {"application_id": 999999},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["error"], "Application not found.")

    def test_post_rejects_single_application_without_extracted_text(self):
        application = self.create_application(extracted_text="")
        self.authenticate_as(self.hr_user)

        with self._patched_scorer():
            response = self.client.post(
                self.rescore_url,
                {"application_id": application.id},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["error"],
            "No text extracted for this application.",
        )

    def test_post_rescores_single_application(self):
        application = self.create_application(extracted_text="Candidate profile")
        self.authenticate_as(self.hr_user)

        with self._patched_scorer() as score_mock:
            response = self.client.post(
                self.rescore_url,
                {"application_id": application.id},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["queued"], 1)
        self.assertIn("1 resume queued", response.data["message"])
        score_mock.assert_called_once_with(application)

    def test_post_rescores_all_eligible_applications_for_job(self):
        eligible_one = self.create_application(extracted_text="Resume one")
        eligible_two = self.create_application(extracted_text="Resume two")
        self.create_application(extracted_text="")
        self.create_application(job=self.other_job, extracted_text="Other HR resume")
        self.authenticate_as(self.hr_user)

        with self._patched_scorer() as score_mock:
            response = self.client.post(
                self.rescore_url,
                {"job_id": self.job.id},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["queued"], 2)
        self.assertIn("2 resumes queued", response.data["message"])
        self.assertEqual(score_mock.call_count, 2)
        rescored_ids = {call.args[0].id for call in score_mock.call_args_list}
        self.assertEqual(rescored_ids, {eligible_one.id, eligible_two.id})

    @contextmanager
    def _patched_scorer(self):
        score_mock = MagicMock()
        fake_module = types.ModuleType("shortlist.hybrid_scorer")
        fake_module.score_application = score_mock
        with patch.dict(sys.modules, {"shortlist.hybrid_scorer": fake_module}):
            yield score_mock
