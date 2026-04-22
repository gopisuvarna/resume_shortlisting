from django.contrib import admin
from .models import Application


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display   = ['applicant', 'job', 'status', 'final_score', 'ai_recommendation', 'applied_at']
    list_filter    = ['status', 'ai_recommendation', 'applied_at']
    search_fields  = ['applicant__email', 'applicant__first_name', 'job__title']
    readonly_fields = [
        'final_score', 'nlp_score', 'embedding_score', 'llm_score',
        'ai_skills_score', 'ai_experience_score', 'ai_education_score',
        'ai_summary', 'llm_explanation', 'ai_matched_skills',
        'ai_missing_skills', 'ai_recommendation',
        'applied_at', 'updated_at',
    ]
    raw_id_fields  = ['applicant', 'job']
    fieldsets = (
        ('Application',   {'fields': ('applicant', 'job', 'status')}),
        ('Applicant Data',{'fields': (
            'cover_letter', 'years_of_experience', 'current_company',
            'current_role', 'notice_period_days', 'expected_salary',
            'linkedin_url', 'portfolio_url', 'skills_mentioned',
        )}),
        ('AI Scoring',    {'fields': (
            'final_score', 'nlp_score', 'embedding_score', 'llm_score',
            'ai_skills_score', 'ai_experience_score', 'ai_education_score',
            'ai_summary', 'llm_explanation', 'ai_matched_skills',
            'ai_missing_skills', 'ai_recommendation'
        )}),
        ('Timestamps',    {'fields': ('applied_at', 'updated_at')}),
    )