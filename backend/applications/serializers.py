import json
from rest_framework import serializers
from .models import Application

STATUS_MESSAGES = {
    'PENDING':     'Your application has been received and is awaiting review.',
    'REVIEWING':   'Our HR team is currently reviewing your profile.',
    'SHORTLISTED': '🎉 Congratulations! You have been shortlisted for this role. We will be in touch shortly.',
    'INTERVIEW':   '📅 You have been selected for an interview. Please check your email for details.',
    'REJECTED':    'Thank you for applying. We have decided to move forward with other candidates.',
    'OFFERED':     '🌟 An offer has been extended to you! Please check your email.',
    'HIRED':       '🎊 Welcome aboard! Your hiring process is complete.',
    'WITHDRAWN':   'You have withdrawn this application.',
}


class ApplicationApplicantSerializer(serializers.ModelSerializer):
    job_title      = serializers.CharField(source='job.title',      read_only=True)
    job_department = serializers.CharField(source='job.department',  read_only=True)
    job_location   = serializers.CharField(source='job.location',   read_only=True)
    job_type       = serializers.CharField(source='job.job_type',   read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    status_message = serializers.SerializerMethodField()
    is_shortlisted = serializers.SerializerMethodField()
    has_resume     = serializers.SerializerMethodField()

    class Meta:
        model  = Application
        fields = [
            'id', 'job', 'job_title', 'job_department', 'job_location', 'job_type',
            'status', 'status_display', 'status_message', 'is_shortlisted',
            'cover_letter', 'years_of_experience', 'current_company', 'current_role',
            'notice_period_days', 'expected_salary', 'linkedin_url', 'portfolio_url',
            'skills_mentioned', 'has_resume', 'applied_at', 'updated_at',
        ]
        read_only_fields = ['id', 'status', 'applied_at', 'updated_at']

    def get_status_message(self, obj):
        return STATUS_MESSAGES.get(obj.status, '')

    def get_is_shortlisted(self, obj):
        return obj.status in ('SHORTLISTED', 'INTERVIEW', 'OFFERED', 'HIRED')

    def get_has_resume(self, obj):
        return bool(obj.resume_file)


class ApplicationHRSerializer(serializers.ModelSerializer):
    applicant_name  = serializers.CharField(source='applicant.get_full_name', read_only=True)
    applicant_email = serializers.CharField(source='applicant.email',          read_only=True)
    applicant_phone = serializers.CharField(source='applicant.phone',          read_only=True)
    job_title       = serializers.CharField(source='job.title',                read_only=True)
    status_display  = serializers.CharField(source='get_status_display',       read_only=True)
    resume_url      = serializers.SerializerMethodField()
    has_resume      = serializers.SerializerMethodField()
    score_breakdown = serializers.SerializerMethodField()
    score_label     = serializers.SerializerMethodField()
    score_color     = serializers.SerializerMethodField()
    # Alias final_score → ai_score so frontend doesn't need changing
    ai_score        = serializers.FloatField(source='final_score', read_only=True)

    class Meta:
        model  = Application
        fields = '__all__'
        read_only_fields = [
            'applicant', 'job', 'applied_at', 'updated_at',
            'nlp_score', 'embedding_score', 'llm_score', 'final_score',
            'ai_skills_score', 'ai_experience_score', 'ai_education_score',
            'ai_summary', 'llm_explanation', 'ai_matched_skills',
            'ai_missing_skills', 'ai_recommendation',
            'resume_hash', 'extracted_text', 'embedding_vector',
        ]

    def get_resume_url(self, obj):
        try:
            if not obj.resume_file:
                return None
            request = self.context.get('request')
            return request.build_absolute_uri(obj.resume_file.url) if request else obj.resume_file.url
        except Exception:
            return None

    def get_has_resume(self, obj):
        return bool(obj.resume_file)

    def get_score_breakdown(self, obj):
        if obj.final_score is None:
            return None
        return {
            'overall':    round(obj.final_score,            1),
            'nlp':        round(obj.nlp_score,              1) if obj.nlp_score        is not None else None,
            'embedding':  round(obj.embedding_score,        1) if obj.embedding_score  is not None else None,
            'llm':        round(obj.llm_score,              1) if obj.llm_score        is not None else None,
            'skills':     round(obj.ai_skills_score,        1) if obj.ai_skills_score  is not None else None,
            'experience': round(obj.ai_experience_score,    1) if obj.ai_experience_score is not None else None,
            'education':  round(obj.ai_education_score,     1) if obj.ai_education_score  is not None else None,
            'weights': {
                'embedding': 40, 'nlp': 30, 'llm': 30,
                'skills': 50, 'experience': 35, 'education': 15,
            },
        }

    def get_score_label(self, obj):
        if obj.final_score is None: return 'Not yet scored'
        s = obj.final_score
        if s >= 80: return 'Excellent match'
        if s >= 65: return 'Good match'
        if s >= 45: return 'Partial match'
        return 'Poor match'

    def get_score_color(self, obj):
        if obj.final_score is None: return 'gray'
        s = obj.final_score
        if s >= 80: return 'green'
        if s >= 65: return 'blue'
        if s >= 45: return 'amber'
        return 'red'


class ApplicationCreateSerializer(serializers.ModelSerializer):
    """
    Used when applicant submits via FormData (multipart).
    resume_file is required. skills_mentioned arrives as a JSON string.
    """
    resume_file    = serializers.FileField(required=True)
    # skills_mentioned comes as a JSON string from FormData
    skills_mentioned = serializers.CharField(required=False, default='[]')

    class Meta:
        model  = Application
        fields = [
            'id', 'job', 'resume_file', 'cover_letter', 'years_of_experience',
            'current_company', 'current_role', 'notice_period_days', 'expected_salary',
            'linkedin_url', 'portfolio_url', 'skills_mentioned',
        ]
        read_only_fields = ['id']

    def validate_skills_mentioned(self, value):
        """Parse JSON string → list if sent via FormData."""
        if isinstance(value, list):
            return value
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, list) else []
        except (json.JSONDecodeError, TypeError):
            return []

    def validate_job(self, job):
        from jobs.models import Job
        if job.status != Job.Status.ACTIVE:
            raise serializers.ValidationError('This job is not currently accepting applications.')
        return job

    def validate(self, attrs):
        import hashlib
        user = self.context['request'].user
        job  = attrs['job']

        if Application.objects.filter(applicant=user, job=job).exists():
            raise serializers.ValidationError('You have already applied for this job.')

        resume_file = attrs.get('resume_file')
        if not resume_file.name.lower().endswith('.pdf'):
            raise serializers.ValidationError({'resume_file': 'Only PDF files are allowed.'})

        # Read bytes, compute hash, extract text
        file_bytes = resume_file.read()
        file_hash  = hashlib.sha256(file_bytes).hexdigest()

        if Application.objects.filter(resume_hash=file_hash, job=job).exists():
            raise serializers.ValidationError('A duplicate resume has already been submitted for this job.')

        # Extract text with PyMuPDF (fitz)
        text = ''
        try:
            import fitz
            doc  = fitz.open(stream=file_bytes, filetype='pdf')
            text = '\n'.join(page.get_text() for page in doc)
            doc.close()
        except Exception as e:
            raise serializers.ValidationError({'resume_file': f'Failed to parse PDF: {e}'})

        if not text.strip():
            raise serializers.ValidationError({'resume_file': 'The PDF contains no readable text.'})

        # Reset file pointer so Django can save it
        resume_file.seek(0)

        attrs['resume_hash']    = file_hash
        attrs['extracted_text'] = text
        return attrs

    def create(self, validated_data):
        app = Application.objects.create(
            applicant=self.context['request'].user,
            **validated_data,
        )
        # Trigger synchronous hybrid scoring
        try:
            from shortlist.hybrid_scorer import score_application
            score_application(app)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f'Scoring failed for application {app.id}: {e}')
        return app