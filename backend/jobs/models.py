from django.db import models
from django.conf import settings


class Job(models.Model):
    class Status(models.TextChoices):
        DRAFT  = 'DRAFT',  'Draft'
        ACTIVE = 'ACTIVE', 'Active'
        CLOSED = 'CLOSED', 'Closed'
        PAUSED = 'PAUSED', 'Paused'

    class JobType(models.TextChoices):
        FULL_TIME  = 'FULL_TIME',  'Full Time'
        PART_TIME  = 'PART_TIME',  'Part Time'
        CONTRACT   = 'CONTRACT',   'Contract'
        INTERNSHIP = 'INTERNSHIP', 'Internship'
        REMOTE     = 'REMOTE',     'Remote'

    class ExperienceLevel(models.TextChoices):
        ENTRY  = 'ENTRY',  'Entry Level (0–2 yrs)'
        MID    = 'MID',    'Mid Level (2–5 yrs)'
        SENIOR = 'SENIOR', 'Senior Level (5–8 yrs)'
        LEAD   = 'LEAD',   'Lead / Manager (8+ yrs)'

    posted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='posted_jobs', limit_choices_to={'role': 'HR'},
    )
    title            = models.CharField(max_length=200, db_index=True)
    department       = models.CharField(max_length=100, db_index=True)
    location         = models.CharField(max_length=200)
    job_type         = models.CharField(max_length=20, choices=JobType.choices, default=JobType.FULL_TIME)
    experience_level = models.CharField(max_length=20, choices=ExperienceLevel.choices, default=ExperienceLevel.MID)
    description      = models.TextField()
    requirements     = models.TextField()
    responsibilities = models.TextField()
    skills_required  = models.JSONField(default=list)
    salary_min       = models.PositiveIntegerField(null=True, blank=True)
    salary_max       = models.PositiveIntegerField(null=True, blank=True)
    salary_currency  = models.CharField(max_length=10, default='INR')
    openings         = models.PositiveIntegerField(default=1)
    status           = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True)
    deadline         = models.DateField(null=True, blank=True)
    created_at       = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at       = models.DateTimeField(auto_now=True)

    def get_full_jd(self) -> str:
        """Concatenated JD text sent to the AI scorer."""
        return (
            f"Job Title: {self.title}\n"
            f"Department: {self.department}\n"
            f"Location: {self.location}\n"
            f"Type: {self.get_job_type_display()}\n"
            f"Experience: {self.get_experience_level_display()}\n\n"
            f"Description:\n{self.description}\n\n"
            f"Responsibilities:\n{self.responsibilities}\n\n"
            f"Requirements:\n{self.requirements}\n\n"
            f"Required Skills: {', '.join(self.skills_required)}"
        )

    def total_applications(self):
        return self.applications.count()

    def __str__(self):
        return f'{self.title} [{self.status}]'

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Job'
        verbose_name_plural = 'Jobs'
