# shipments/views.py
from django.shortcuts import render
from django.http import HttpResponse

# This file can be used for Django template-based views if needed in the future.
# For now, most of the logic is in api_views.py for the DRF endpoints.

def index(request):
    # Example placeholder view
    return HttpResponse("This is the shipments app index. API is preferred for interaction.")

# If you had the other ShipmentViewSet here, it's now removed to avoid conflict
# with the one in api_views.py, which is used by your urls.py.
