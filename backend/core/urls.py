from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),

    # Auth endpoints
    path('api/auth/', include('users.urls')),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/token/verify/',  TokenVerifyView.as_view(),  name='token_verify'),

    # Resource endpoints
    path('api/jobs/',         include('jobs.urls')),
    path('api/applications/', include('applications.urls')),
    path('api/shortlist/',    include('shortlist.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Admin site branding
admin.site.site_header = 'Nueve IT Solutions Admin'
admin.site.site_title  = 'Nueve IT Solutions'
admin.site.index_title = 'HR Portal Administration'
