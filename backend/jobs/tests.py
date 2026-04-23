from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from test_utils import create_test_user
from applications.models import Application
from jobs.models import Job


User = get_user_model()


class JobViewSetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.hr_user = create_test_user(
            username="hr-owner",
            email="owner@example.com",
            first_name="Owner",
            last_name="Hr",
            role=User.Role.HR,
        )
        self.other_hr_user = create_test_user(
            username="hr-other",
            email="other@example.com",
            first_name="Other",
            last_name="Hr",
            role=User.Role.HR,
        )
        self.applicant = create_test_user(
            username="applicant-one",
            email="applicant@example.com",
            first_name="Apply",
            last_name="Cant",
            role=User.Role.APPLICANT,
        )
        self.active_job = self._create_job(posted_by=self.hr_user, status=Job.Status.ACTIVE)
        self.draft_job = self._create_job(
            posted_by=self.hr_user,
            title="Draft Role",
            status=Job.Status.DRAFT,
        )
        self.other_job = self._create_job(
            posted_by=self.other_hr_user,
            title="Other Team Role",
            status=Job.Status.ACTIVE,
        )

    def _create_job(self, *, posted_by, title="ML Engineer", status=Job.Status.ACTIVE):
        return Job.objects.create(
            posted_by=posted_by,
            title=title,
            department="Engineering",
            location="Hyderabad",
            job_type=Job.JobType.FULL_TIME,
            experience_level=Job.ExperienceLevel.MID,
            description=f"{title} description",
            requirements="Python",
            responsibilities="Ship features",
            skills_required=["Python", "Django"],
            salary_min=600000,
            salary_max=1200000,
            status=status,
            openings=2,
        )

    def test_public_list_only_returns_active_jobs(self):
        response = self.client.get("/api/jobs/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [row["id"] for row in response.data["results"]]
        self.assertIn(self.active_job.id, ids)
        self.assertIn(self.other_job.id, ids)
        self.assertNotIn(self.draft_job.id, ids)

    def test_hr_list_returns_only_owned_jobs(self):
        self.client.force_authenticate(self.hr_user)

        response = self.client.get("/api/jobs/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [row["id"] for row in response.data["results"]]
        self.assertEqual(set(ids), {self.active_job.id, self.draft_job.id})

    def test_hr_create_sets_posted_by_to_request_user(self):
        self.client.force_authenticate(self.hr_user)

        response = self.client.post(
            "/api/jobs/",
            {
                "title": "Platform Engineer",
                "department": "Engineering",
                "location": "Remote",
                "job_type": Job.JobType.FULL_TIME,
                "experience_level": Job.ExperienceLevel.SENIOR,
                "description": "Build APIs",
                "requirements": "Python, AWS",
                "responsibilities": "Own platform work",
                "skills_required": ["Python", "AWS"],
                "salary_min": 1500000,
                "salary_max": 2200000,
                "salary_currency": "INR",
                "openings": 1,
                "status": Job.Status.ACTIVE,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = Job.objects.get(title="Platform Engineer")
        self.assertEqual(created.posted_by, self.hr_user)

    def test_stats_returns_aggregated_application_data_for_hr_owner(self):
        Application.objects.create(
            applicant=self.applicant,
            job=self.active_job,
            status=Application.Status.SHORTLISTED,
            final_score=84.0,
            current_role="Engineer",
            skills_mentioned=["Python"],
            extracted_text="Resume text",
        )

        self.client.force_authenticate(self.hr_user)
        response = self.client.get(f"/api/jobs/{self.active_job.id}/stats/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 1)
        self.assertEqual(response.data["by_status"]["SHORTLISTED"], 1)
        self.assertEqual(response.data["avg_ai_score"], 84.0)
        self.assertEqual(response.data["scored_count"], 1)

    def test_my_jobs_forbids_non_hr_users(self):
        self.client.force_authenticate(self.applicant)

        response = self.client.get("/api/jobs/my_jobs/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["error"], "Forbidden.")
