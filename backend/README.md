## Integrating drf-spectacular for OpenAPI/Swagger Documentation

1. **Install drf-spectacular**
   (Already in requirements.txt)

2. **Add to INSTALLED_APPS in settings.py:**
   ```python
   INSTALLED_APPS = [
       # ...
       'drf_spectacular',
   ]
   ```

3. **Update REST_FRAMEWORK settings in settings.py:**
   ```python
   REST_FRAMEWORK = {
       # ...
       'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
   }
   ```

4. **Add SPECTACULAR_SETTINGS to settings.py (optional, for customization):**
   ```python
   SPECTACULAR_SETTINGS = {
       'TITLE': 'SafeShipper API',
       'DESCRIPTION': 'API for SafeShipper logistics and dangerous goods management system',
       'VERSION': '1.0.0',
   }
   ```

5. **Update safeshipper_core/urls.py:**
   ```python
   from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

   urlpatterns += [
       path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
       path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
       path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
   ]
   ```

6. **Access the documentation:**
   - OpenAPI schema: `/api/schema/`
   - Swagger UI: `/api/docs/`
   - ReDoc: `/api/redoc/` 