from django.urls import path
from .views import ShortlistView, RescoreView

urlpatterns = [
    path('',         ShortlistView.as_view(), name='shortlist'),
    path('rescore/', RescoreView.as_view(),   name='rescore'),
]