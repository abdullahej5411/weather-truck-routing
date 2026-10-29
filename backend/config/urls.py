from django.urls import path
from routing.views import checkpoints, plan

urlpatterns = [path("api/checkpoints", checkpoints), path("api/plan", plan)]
