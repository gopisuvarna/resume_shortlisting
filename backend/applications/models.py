from django.db import models
from django.conf import settings
import os
from datetime import date


def resume_upload_path(instance, filename):
    """
    Day-wise local storage:
    media/resumes/<job_id>/<YYYY-MM-DD>/<user_id>_<filename>.pdf
    """
    today   = date.today().strftime('%Y-%m-%d')
    job_id  = instance.job_id
    user_id = instance.applicant_id
    return os.path.join('resumes', str(job_id), today, f'{user_id}_{filename}')



class Application(models.Model):
    class Status(models.TextChoices):
        PENDING     = 'PENDING',     'Pending Review'
        REVIEWING   = 'REVIEWING',   'Under Review'
        SHORTLISTED = 'SHORTLISTED', 'Shortlisted'
        INTERVIEW   = 'INTERVIEW',   'Interview Scheduled'
        REJECTED    = 'REJECTED',    'Rejected'
        OFFERED     = 'OFFERED',     'Offer Extended'
        HIRED       = 'HIRED',       'Hired'
        WITHDRAWN   = 'WITHDRAWN',   'Withdrawn'

    applicant = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='applications'
    )
    job = models.ForeignKey(
        'jobs.Job', on_delete=models.CASCADE, related_name='applications'
    )

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True
    )

    # Applicant-supplied
    cover_letter        = models.TextField(blank=True)
    years_of_experience = models.PositiveSmallIntegerField(default=0)
    current_company     = models.CharField(max_length=200, blank=True)
    current_role        = models.CharField(max_length=200, blank=True)
    notice_period_days  = models.PositiveSmallIntegerField(default=30)
    expected_salary     = models.PositiveIntegerField(null=True, blank=True)
    linkedin_url        = models.URLField(blank=True)
    portfolio_url       = models.URLField(blank=True)
    skills_mentioned    = models.JSONField(default=list)

    # AI Hybrid Engine Fields
    resume_file         = models.FileField(upload_to=resume_upload_path, null=True, blank=True)
    resume_hash         = models.CharField(max_length=64, blank=True, db_index=True)
    extracted_text      = models.TextField(blank=True)
    embedding_vector    = models.JSONField(null=True, blank=True)

    # Component Scores
    nlp_score           = models.FloatField(null=True, blank=True)
    embedding_score     = models.FloatField(null=True, blank=True)
    llm_score           = models.FloatField(null=True, blank=True)
    final_score         = models.FloatField(null=True, blank=True, db_index=True)

    # Old UI Component Scores (Preserved)
    ai_skills_score     = models.FloatField(null=True, blank=True)
    ai_experience_score = models.FloatField(null=True, blank=True)
    ai_education_score  = models.FloatField(null=True, blank=True)

    ai_summary          = models.TextField(blank=True)
    llm_explanation     = models.TextField(blank=True)
    ai_matched_skills   = models.JSONField(default=list)
    ai_missing_skills   = models.JSONField(default=list)
    ai_recommendation   = models.CharField(max_length=20, blank=True)

    applied_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['applicant', 'job']
        ordering = ['-applied_at']

    def __str__(self):
        return f'{self.applicant.get_full_name()} → {self.job.title} [{self.status}]'