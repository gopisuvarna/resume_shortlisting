from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIRequestFactory

from applications.models import Application
from jobs.models import Job
from jobs.serializers import JobHRSerializer, JobPublicSerializer
from jobs.views import IsHROrReadOnly


User = get_user_model()


class JobModelSerializerTests(TestCase):
    def setUp(self):
        self.hr_user = User.objects.create_user(
            username="job-hr",
            email="job-hr@example.com",
            password="StrongPass123",
            first_name="Job",
            last_name="Hr",
            role=User.Role.HR,
        )
        self.applicant = User.objects.create_user(
            username="job-applicant",
            email="job-applicant@example.com",
            password="StrongPass123",
            first_name="Job",
            last_name="Applicant",
            role=User.Role.APPLICANT,
        )
        self.job = Job.objects.create(
            posted_by=self.hr_user,
            title="Platform Engineer",
            department="Engineering",
            location="Hyderabad",
            job_type=Job.JobType.FULL_TIME,
            experience_level=Job.ExperienceLevel.SENIOR,
            description="Build reliable systems",
            requirements="Python, AWS",
            responsibilities="Own platform services",
            skills_required=["Python", "AWS", "Docker"],
            salary_min=1000000,
            salary_max=1800000,
            salary_currency="INR",
            status=Job.Status.ACTIVE,
            openings=2,
        )

    def test_job_string_representation_includes_title_and_status(self):
        self.assertEqual(str(self.job), "Platform Engineer [ACTIVE]")

    def test_job_total_applications_counts_related_records(self):
        Application.objects.create(
            applicant=self.applicant,
            job=self.job,
            status=Application.Status.PENDING,
            current_role="Engineer",
            skills_mentioned=["Python"],
            extracted_text="Resume text",
        )

        self.assertEqual(self.job.total_applications(), 1)

    def test_job_full_jd_contains_major_sections(self):
        full_jd = self.job.get_full_jd()

        self.assertIn("Job Title: Platform Engineer", full_jd)
        self.assertIn("Department: Engineering", full_jd)
        self.assertIn("Required Skills: Python, AWS, Docker", full_jd)

    def test_job_public_serializer_includes_company_and_total_applicants(self):
        Application.objects.create(
            applicant=self.applicant,
            job=self.job,
            status=Application.Status.PENDING,
            current_role="Engineer",
            skills_mentioned=["Python"],
            extracted_text="Resume text",
        )

        data = JobPublicSerializer(self.job).data

        self.assertEqual(data["company"], "Nueve IT Solutions")
        self.assertEqual(data["total_applicants"], 1)

    def test_job_public_serializer_formats_salary_range(self):
        data = JobPublicSerializer(self.job).data

        self.assertEqual(data["salary_range"], "INR 1,000,000 – 1,800,000")

    def test_job_hr_serializer_exposes_hr_only_fields(self):
        data = JobHRSerializer(self.job).data

        self.assertEqual(data["posted_by"], self.hr_user.id)
        self.assertEqual(data["salary_min"], 1000000)
        self.assertEqual(data["salary_max"], 1800000)


def _make_salary_range_test(min_value, max_value, expected):
    def test(self):
        self.job.salary_min = min_value
        self.job.salary_max = max_value

        data = JobPublicSerializer(self.job).data

        self.assertEqual(data["salary_range"], expected)

    return test


_SALARY_CASES = [
    (None, 1800000, None),
    (1000000, None, None),
    (0, 1800000, None),
    (1000000, 0, None),
]

for index, (min_value, max_value, expected) in enumerate(_SALARY_CASES, start=1):
    setattr(
        JobModelSerializerTests,
        f"test_salary_range_case_{index}",
        _make_salary_range_test(min_value, max_value, expected),
    )


def _make_status_display_test(job_type, experience_level):
    def test(self):
        self.job.job_type = job_type
        self.job.experience_level = experience_level
        data = JobPublicSerializer(self.job).data
        self.assertEqual(data["job_type"], job_type)
        self.assertTrue(data["job_type_display"])
        self.assertTrue(data["experience_display"])

    return test


_DISPLAY_CASES = [
    (Job.JobType.FULL_TIME, Job.ExperienceLevel.ENTRY),
    (Job.JobType.PART_TIME, Job.ExperienceLevel.MID),
    (Job.JobType.CONTRACT, Job.ExperienceLevel.SENIOR),
    (Job.JobType.INTERNSHIP, Job.ExperienceLevel.LEAD),
    (Job.JobType.REMOTE, Job.ExperienceLevel.ENTRY),
]

for index, (job_type, experience_level) in enumerate(_DISPLAY_CASES, start=1):
    setattr(
        JobModelSerializerTests,
        f"test_display_case_{index}",
        _make_status_display_test(job_type, experience_level),
    )


class IsHROrReadOnlyPermissionTests(TestCase):
    def setUp(self):
        self.permission = IsHROrReadOnly()
        self.factory = APIRequestFactory()
        self.hr_user = User.objects.create_user(
            username="perm-hr",
            email="perm-hr@example.com",
            password="StrongPass123",
            first_name="Perm",
            last_name="Hr",
            role=User.Role.HR,
        )
        self.applicant = User.objects.create_user(
            username="perm-applicant",
            email="perm-applicant@example.com",
            password="StrongPass123",
            first_name="Perm",
            last_name="Applicant",
            role=User.Role.APPLICANT,
        )
        self.other_hr_user = User.objects.create_user(
            username="perm-other-hr",
            email="perm-other-hr@example.com",
            password="StrongPass123",
            first_name="Other",
            last_name="Hr",
            role=User.Role.HR,
        )
        self.job = Job.objects.create(
            posted_by=self.hr_user,
            title="Permission Job",
            department="Engineering",
            location="Hyderabad",
            description="Build services",
            requirements="Python",
            responsibilities="Ship features",
            skills_required=["Python"],
        )

    def test_safe_method_allows_unauthenticated_request(self):
        request = self.factory.get("/api/jobs/")
        request.user = SimpleNamespace(is_authenticated=False, is_hr=False)

        self.assertTrue(self.permission.has_permission(request, None))

    def test_post_requires_authenticated_hr(self):
        request = self.factory.post("/api/jobs/")
        request.user = self.applicant

        self.assertFalse(self.permission.has_permission(request, None))

    def test_post_allows_authenticated_hr(self):
        request = self.factory.post("/api/jobs/")
        request.user = self.hr_user

        self.assertTrue(self.permission.has_permission(request, None))

    def test_object_permission_allows_owner_for_write(self):
        request = self.factory.patch("/api/jobs/1/")
        request.user = self.hr_user

        self.assertTrue(self.permission.has_object_permission(request, None, self.job))

    def test_object_permission_rejects_non_owner_for_write(self):
        request = self.factory.patch("/api/jobs/1/")
        request.user = self.other_hr_user

        self.assertFalse(self.permission.has_object_permission(request, None, self.job))

    def test_object_permission_allows_safe_method_for_any_user(self):
        request = self.factory.get("/api/jobs/1/")
        request.user = self.applicant

        self.assertTrue(self.permission.has_object_permission(request, None, self.job))
