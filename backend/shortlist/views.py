from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from applications.models import Application
from applications.serializers import ApplicationHRSerializer


FORBIDDEN_ERROR = {"error": "Forbidden."}
MISSING_JOB_ERROR = {"error": "job_id is required."}
MISSING_RESCORE_TARGET_ERROR = {"error": "Provide application_id or job_id."}
MISSING_EXTRACTED_TEXT_ERROR = {"error": "No text extracted for this application."}
APPLICATION_NOT_FOUND_ERROR = {"error": "Application not found."}
EXCLUDED_SHORTLIST_STATUSES = ["HIRED", "WITHDRAWN", "REJECTED"]
PROMOTABLE_STATUSES = [Application.Status.PENDING, Application.Status.REVIEWING]


def _hr_scored_applications(user):
    return (
        Application.objects.filter(
            job__posted_by=user,
            final_score__isnull=False,
        )
        .select_related("applicant", "job")
        .order_by("-final_score")
    )


class ShortlistView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_hr:
            return Response(FORBIDDEN_ERROR, status=403)

        job_id = request.query_params.get("job_id")
        min_score = float(request.query_params.get("min_score", 0))
        recommendation = request.query_params.get("recommendation", "")

        qs = _hr_scored_applications(request.user)
        if job_id:
            qs = qs.filter(job_id=job_id)
        if min_score:
            qs = qs.filter(final_score__gte=min_score)
        if recommendation:
            qs = qs.filter(ai_recommendation=recommendation)

        data = ApplicationHRSerializer(
            qs,
            many=True,
            context={"request": request},
        ).data
        return Response(data)

    def post(self, request):
        if not request.user.is_hr:
            return Response(FORBIDDEN_ERROR, status=403)

        job_id = request.data.get("job_id")
        threshold = float(request.data.get("threshold", 60))

        if not job_id:
            return Response(MISSING_JOB_ERROR, status=400)

        base_qs = _hr_scored_applications(request.user).filter(job_id=job_id).exclude(
            status__in=EXCLUDED_SHORTLIST_STATUSES
        )

        reverted = base_qs.filter(
            final_score__lt=threshold,
            status=Application.Status.SHORTLISTED,
        ).update(status=Application.Status.REVIEWING)

        shortlisted = base_qs.filter(
            final_score__gte=threshold,
            status__in=PROMOTABLE_STATUSES,
        ).update(status=Application.Status.SHORTLISTED)

        return Response(
            {
                "shortlisted": shortlisted,
                "reverted": reverted,
                "threshold": threshold,
                "message": (
                    f'{shortlisted} candidate{"s" if shortlisted != 1 else ""} shortlisted '
                    f"(score >= {threshold}). "
                    f'{reverted} previously shortlisted candidate{"s" if reverted != 1 else ""} '
                    f"moved back to Reviewing (score < {threshold})."
                ),
            }
        )


class RescoreView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not request.user.is_hr:
            return Response(FORBIDDEN_ERROR, status=403)

        application_id = request.data.get("application_id")
        job_id = request.data.get("job_id")

        if not application_id and not job_id:
            return Response(MISSING_RESCORE_TARGET_ERROR, status=400)

        from shortlist.hybrid_scorer import score_application

        queued = 0

        if application_id:
            try:
                application = Application.objects.get(
                    id=application_id,
                    job__posted_by=request.user,
                )
            except Application.DoesNotExist:
                return Response(APPLICATION_NOT_FOUND_ERROR, status=404)

            if not application.extracted_text:
                return Response(MISSING_EXTRACTED_TEXT_ERROR, status=400)

            score_application(application)
            queued = 1
        else:
            applications = Application.objects.filter(
                job_id=job_id,
                job__posted_by=request.user,
            ).exclude(extracted_text="")

            for application in applications:
                score_application(application)
                queued += 1

        return Response(
            {
                "queued": queued,
                "message": f'{queued} resume{"s" if queued != 1 else ""} queued for rescoring.',
            }
        )
