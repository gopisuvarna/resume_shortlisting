from rest_framework import viewsets, permissions, status, parsers
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q

from .models import Application
from .serializers import (
    ApplicationApplicantSerializer,
    ApplicationHRSerializer,
    ApplicationCreateSerializer,
)


class IsHR(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_hr


class IsApplicant(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_applicant


class ApplicationViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    # Accept both JSON and multipart (resume upload uses FormData)
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    http_method_names  = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_serializer_class(self):
        if self.request.user.is_hr:
            return ApplicationHRSerializer
        if self.action == 'create':
            return ApplicationCreateSerializer
        return ApplicationApplicantSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_hr:
            return (Application.objects
                    .filter(job__posted_by=user)
                    .select_related('applicant', 'job')
                    .order_by('-applied_at'))
        return (Application.objects
                .filter(applicant=user)
                .select_related('job')
                .order_by('-applied_at'))

    def create(self, request, *args, **kwargs):
        if request.user.is_hr:
            return Response({'error': 'HR accounts cannot submit applications.'}, status=403)
        return super().create(request, *args, **kwargs)

    @action(detail=False, methods=['get'], permission_classes=[IsHR])
    def by_job(self, request):
        job_id = request.query_params.get('job_id')
        date   = request.query_params.get('date')
        if not job_id:
            return Response({'error': 'job_id required.'}, status=400)
        qs = (Application.objects
              .filter(job_id=job_id, job__posted_by=request.user)
              .select_related('applicant', 'job')
              .order_by('-final_score', '-applied_at'))
        if date:
            qs = qs.filter(applied_at__date=date)
        return Response(ApplicationHRSerializer(qs, many=True, context={'request': request}).data)

    @action(detail=False, methods=['get'], permission_classes=[IsHR])
    def daily_summary(self, request):
        job_id = request.query_params.get('job_id')
        if not job_id:
            return Response({'error': 'job_id required.'}, status=400)
        rows = (Application.objects
                .filter(job_id=job_id, job__posted_by=request.user)
                .values('applied_at__date')
                .annotate(
                    total=Count('id'),
                    shortlisted=Count('id', filter=Q(status='SHORTLISTED')),
                    scored=Count('id', filter=Q(final_score__isnull=False)),
                )
                .order_by('-applied_at__date'))
        return Response(list(rows))

    @action(detail=True, methods=['patch'], permission_classes=[IsHR])
    def update_status(self, request, pk=None):
        app        = self.get_object()
        new_status = request.data.get('status')
        # hr_notes field was removed from model in migration 0005 — no longer stored
        if new_status not in dict(Application.Status.choices):
            return Response({'error': f'Invalid status: {new_status}'}, status=400)
        app.status = new_status
        app.save(update_fields=['status', 'updated_at'])
        return Response(ApplicationHRSerializer(app, context={'request': request}).data)

    @action(detail=True, methods=['post'], permission_classes=[IsApplicant])
    def withdraw(self, request, pk=None):
        app = self.get_object()
        if app.applicant != request.user:
            return Response({'error': 'Not your application.'}, status=403)
        if app.status in ('HIRED', 'WITHDRAWN'):
            return Response({'error': 'Cannot withdraw at this stage.'}, status=400)
        app.status = Application.Status.WITHDRAWN
        app.save(update_fields=['status', 'updated_at'])
        return Response({'message': 'Application withdrawn.'})