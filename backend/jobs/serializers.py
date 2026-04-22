from django.conf import settings
from rest_framework import serializers
from .models import Job


COMPANY_NAME = getattr(settings, 'COMPANY_NAME', 'Nueve IT Solutions')


class JobPublicSerializer(serializers.ModelSerializer):
    """Read-only — for applicants browsing jobs."""
    company           = serializers.SerializerMethodField()
    salary_range      = serializers.SerializerMethodField()
    total_applicants  = serializers.SerializerMethodField()
    experience_display = serializers.CharField(source='get_experience_level_display', read_only=True)
    job_type_display   = serializers.CharField(source='get_job_type_display', read_only=True)

    class Meta:
        model  = Job
        fields = [
            'id', 'title', 'department', 'location',
            'job_type', 'job_type_display',
            'experience_level', 'experience_display',
            'description', 'requirements', 'responsibilities',
            'skills_required', 'salary_range', 'company',
            'openings', 'status', 'deadline',
            'total_applicants', 'created_at',
        ]

    def get_company(self, obj):
        return COMPANY_NAME

    def get_salary_range(self, obj):
        if obj.salary_min and obj.salary_max:
            return f'{obj.salary_currency} {obj.salary_min:,} – {obj.salary_max:,}'
        return None

    def get_total_applicants(self, obj):
        return obj.applications.count()


class JobHRSerializer(JobPublicSerializer):
    """Full serializer for HR."""
    class Meta(JobPublicSerializer.Meta):
        fields = JobPublicSerializer.Meta.fields + [
            'posted_by', 'salary_min', 'salary_max', 'salary_currency', 'updated_at'
        ]
        read_only_fields = ['posted_by', 'created_at', 'updated_at']