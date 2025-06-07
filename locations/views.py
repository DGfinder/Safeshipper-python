    # locations/views.py
    from django.shortcuts import render
    from .services import list_all_countries # Import your service function

    def country_list_page(request):
        """
        A simple view to display a list of countries on a web page.
        """
        countries = list_all_countries()
        context = {
            'countries': countries,
            'page_title': 'List of Countries (ISO 3166-1)'
        }
        return render(request, 'locations/country_list_page.html', context)

    def country_list_view(request):
        countries = list_all_countries()
        return render(request, 'locations/country_list.html', {'countries': countries})
    