from django.contrib import admin
from .models import Job

@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display  = ['title', 'department', 'location', 'job_type', 'experience_level', 'status', 'openings', 'created_at']
    list_filter   = ['status', 'job_type', 'experience_level', 'department']
    search_fields = ['title', 'description', 'department', 'location']
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields  = ['posted_by']
    fieldsets = (
        ('Basic Info',    {'fields': ('posted_by', 'title', 'department', 'location', 'job_type', 'experience_level', 'openings', 'status', 'deadline')}),
        ('Description',   {'fields': ('description', 'requirements', 'responsibilities', 'skills_required')}),
        ('Salary',        {'fields': ('salary_min', 'salary_max', 'salary_currency')}),
        ('Timestamps',    {'fields': ('created_at', 'updated_at')}),
    )
