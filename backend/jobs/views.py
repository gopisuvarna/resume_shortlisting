from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Avg

from .models import Job
from .serializers import JobPublicSerializer, JobHRSerializer


class IsHROrReadOnly(permissions.BasePermission):
    """
    GET/HEAD/OPTIONS: anyone (including unauthenticated visitors) can read.
    POST/PATCH/PUT/DELETE: must be authenticated HR who owns the object.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and request.user.is_hr

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.posted_by == request.user


class JobViewSet(viewsets.ModelViewSet):
    permission_classes = [IsHROrReadOnly]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ['status', 'job_type', 'experience_level', 'department', 'location']
    search_fields      = ['title', 'description', 'department', 'location']
    ordering_fields    = ['created_at', 'deadline', 'title']

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and user.is_hr:
            return (Job.objects
                    .filter(posted_by=user)
                    .select_related('posted_by')
                    .order_by('-created_at'))   # explicit ordering prevents pagination warning
        return (Job.objects
                .filter(status=Job.Status.ACTIVE)
                .select_related('posted_by')
                .annotate(application_count=Count('applications'))
                .order_by('-created_at'))       # explicit ordering on annotated queryset

    def get_serializer_class(self):
        if self.request.user.is_authenticated and self.request.user.is_hr:
            return JobHRSerializer
        return JobPublicSerializer

    def perform_create(self, serializer):
        serializer.save(posted_by=self.request.user)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def stats(self, request, pk=None):
        if not request.user.is_hr:
            return Response({'error': 'Forbidden.'}, status=403)
        job  = self.get_object()
        from applications.models import Application
        apps = Application.objects.filter(job=job)
        return Response({
            'total':         apps.count(),
            'by_status':     {s: apps.filter(status=s).count() for s, _ in Application.Status.choices},
            'avg_ai_score':  apps.exclude(final_score=None).aggregate(avg=Avg('final_score'))['avg'],
            'scored_count':  apps.exclude(final_score=None).count(),
            'pending_score': apps.filter(final_score=None).count(),
        })

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_jobs(self, request):
        if not request.user.is_hr:
            return Response({'error': 'Forbidden.'}, status=403)
        jobs = Job.objects.filter(posted_by=request.user).order_by('-created_at')
        return Response(JobHRSerializer(jobs, many=True, context={'request': request}).data)