# locations/views.py
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from .services import list_all_countries  # Import your service function

@login_required
def country_list_page(request):
    """
    View function for displaying the list of countries.
    Requires user authentication.
    
    Args:
        request: The HTTP request object
        
    Returns:
        HttpResponse: Rendered template with country list
    """
    countries = list_all_countries()
    context = {
        'countries': countries,
        'page_title': 'Countries',
        'total_countries': countries.count(),
    }
    return render(request, 'locations/country_list.html', context)

def country_list_view(request):
    countries = list_all_countries()
    return render(request, 'locations/country_list.html', {'countries': countries})
    