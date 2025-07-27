# search/models.py
from django.db import models

# No models needed - search app provides API endpoints for existing search services
# Search functionality uses:
# - dangerous_goods.search_service for dangerous goods search
# - sds.search_service for SDS search  
# - Elasticsearch documents defined in other apps