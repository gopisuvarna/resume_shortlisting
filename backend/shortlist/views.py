from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from applications.models import Application
from applications.serializers import ApplicationHRSerializer


FORBIDDEN_ERROR = {'error': 'Forbidden.'}


class ShortlistView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        HR: scored applications ranked by AI score.

        Query params:
          job_id    — filter by job (required in most cases)
          min_score — float, default 0 — show only applications at or above this score
          recommendation — STRONG_YES | YES | MAYBE | NO

        KEY DESIGN: this endpoint returns ALL scored applications above the
        threshold regardless of their current status. This means:
          - Applications that were shortlisted at threshold=50 still appear
                        when threshold=60, so HR can see them and decide manually.
          - The 'is_above_threshold' field shows whether each one meets the
            current threshold.
          - Bulk-shortlist (POST) is the only action that changes status.
        """
        if not request.user.is_hr:
            return Response(FORBIDDEN_ERROR, status=403)

        job_id    = request.query_params.get('job_id')
        min_score = float(request.query_params.get('min_score', 0))
        rec       = request.query_params.get('recommendation', '')

        qs = (
            Application.objects
            .filter(job__posted_by=request.user, final_score__isnull=False)
            .select_related('applicant', 'job')
            .order_by('-final_score')
        )
        if job_id:
            qs = qs.filter(job_id=job_id)
        if min_score:
            qs = qs.filter(final_score__gte=min_score)
        if rec:
            qs = qs.filter(ai_recommendation=rec)

        data = ApplicationHRSerializer(qs, many=True, context={'request': request}).data
        return Response(data)

    def post(self, request):
        """
        HR: bulk-shortlist applications at or above threshold.

        Behaviour on threshold change (the core requirement):
          - If threshold was 50 → applicant A (score 60) got SHORTLISTED
                    - HR raises threshold to 60
                    - POST with threshold=60:
              → applicant A (score 60) is BELOW new threshold
              → their status is reverted to REVIEWING (so HR sees them)
              → applicant B (score 70) is ABOVE → status set to SHORTLISTED
          - Net result: shortlist always reflects the current threshold exactly.

        Request body:
          job_id    — required
                    threshold — float, default 60
        """
        if not request.user.is_hr:
                        return Response(FORBIDDEN_ERROR, status=403)

        job_id    = request.data.get('job_id')
        threshold = float(request.data.get('threshold', 60))

        if not job_id:
            return Response({'error': 'job_id is required.'}, status=400)

        base_qs = Application.objects.filter(
            job_id=job_id,
            job__posted_by=request.user,
            final_score__isnull=False,
        ).exclude(status__in=['HIRED', 'WITHDRAWN', 'REJECTED'])

        # Step 1: Revert applications BELOW threshold that were previously auto-shortlisted.
        # We only revert SHORTLISTED → REVIEWING (not manual statuses like INTERVIEW/OFFERED).
        reverted = base_qs.filter(
            final_score__lt=threshold,
            status=Application.Status.SHORTLISTED,
        ).update(status=Application.Status.REVIEWING)

        # Step 2: Shortlist applications AT OR ABOVE threshold.
        # Only promote PENDING/REVIEWING — never override INTERVIEW, OFFERED, etc.
        shortlisted = base_qs.filter(
            final_score__gte=threshold,
            status__in=[Application.Status.PENDING, Application.Status.REVIEWING],
        ).update(status=Application.Status.SHORTLISTED)

        return Response({
            'shortlisted': shortlisted,
            'reverted':    reverted,
            'threshold':   threshold,
            'message': (
                f'{shortlisted} candidate{"s" if shortlisted != 1 else ""} shortlisted '
                f'(score ≥ {threshold}). '
                f'{reverted} previously shortlisted candidate{"s" if reverted != 1 else ""} '
                f'moved back to Reviewing (score < {threshold}).'
            ),
        })


class RescoreView(APIView):
    """
    HR: trigger a fresh AI rescore for one or all applications on a job.
    Useful after updating a JD or when you want to verify scores.

    POST /api/shortlist/rescore/
      Body: { "application_id": 5 }              — rescore one
            { "job_id": 3 }                       — rescore all on job
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not request.user.is_hr:
            return Response(FORBIDDEN_ERROR, status=403)

        application_id = request.data.get('application_id')
        job_id         = request.data.get('job_id')

        if not application_id and not job_id:
            return Response({'error': 'Provide application_id or job_id.'}, status=400)

        from shortlist.hybrid_scorer import score_application
        queued = 0

        if application_id:
            from applications.models import Application
            try:
                app = Application.objects.get(id=application_id, job__posted_by=request.user)
                if not app.extracted_text:
                    return Response({'error': 'No text extracted for this application.'}, status=400)
                score_application(app)
                queued = 1
            except Application.DoesNotExist:
                return Response({'error': 'Application not found.'}, status=404)

        elif job_id:
            from applications.models import Application
            apps = Application.objects.filter(
                job_id=job_id,
                job__posted_by=request.user,
            ).exclude(extracted_text='')
            
            for app in apps:
                score_application(app)
                queued += 1

        return Response({
            'queued': queued,
            'message': f'{queued} resume{"s" if queued != 1 else ""} queued for rescoring.',
        })