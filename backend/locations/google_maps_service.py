"""
Google Maps API integration service for SafeShipper dangerous goods logistics.
Provides geocoding, reverse geocoding, and route optimization services.
"""

import logging
import requests
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from django.conf import settings
from django.core.cache import cache
# from django.contrib.gis.geos import Point  # Disabled for now - requires GDAL
from decouple import config

logger = logging.getLogger(__name__)


class GoogleMapsService:
    """
    Google Maps API service for SafeShipper logistics operations.
    Optimized for Australian dangerous goods transport requirements.
    """
    
    def __init__(self):
        self.api_key = config('GOOGLE_MAPS_API_KEY', default='')
        self.base_url = 'https://maps.googleapis.com/maps/api'
        self.session = requests.Session()
        
        if not self.api_key:
            logger.warning("Google Maps API key not configured")
    
    def _make_request(self, endpoint: str, params: Dict[str, Any]) -> Optional[Dict]:
        """Make authenticated request to Google Maps API with error handling."""
        if not self.api_key:
            logger.error("Google Maps API key not configured")
            return None
        
        params['key'] = self.api_key
        url = f"{self.base_url}/{endpoint}"
        
        try:
            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            if data.get('status') != 'OK':
                logger.error(f"Google Maps API error: {data.get('status')} - {data.get('error_message', 'Unknown error')}")
                return None
            
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Google Maps API request failed: {e}")
            return None
        except ValueError as e:
            logger.error(f"Invalid JSON response from Google Maps API: {e}")
            return None
    
    def geocode_address(self, address: str, region: str = 'au') -> Optional[Dict]:
        """
        Geocode an address to coordinates.
        
        Args:
            address: Street address to geocode
            region: Country code for regional bias (default: 'au' for Australia)
            
        Returns:
            Dict with lat, lng, formatted_address, and place_id
        """
        cache_key = f"geocode:{address}:{region}"
        cached_result = cache.get(cache_key)
        if cached_result:
            return cached_result
        
        params = {
            'address': address,
            'region': region,
            'components': f'country:{region.upper()}'  # Restrict to Australia
        }
        
        data = self._make_request('geocode/json', params)
        if not data or not data.get('results'):
            return None
        
        result = data['results'][0]
        location = result['geometry']['location']
        
        geocoded = {
            'lat': location['lat'],
            'lng': location['lng'],
            'formatted_address': result['formatted_address'],
            'place_id': result['place_id'],
            'address_components': result.get('address_components', []),
            'geometry': result['geometry']
        }
        
        # Cache for 24 hours
        cache.set(cache_key, geocoded, 86400)
        return geocoded
    
    def reverse_geocode(self, lat: float, lng: float) -> Optional[Dict]:
        """
        Reverse geocode coordinates to address.
        
        Args:
            lat: Latitude
            lng: Longitude
            
        Returns:
            Dict with formatted_address and address components
        """
        cache_key = f"reverse_geocode:{lat:.6f}:{lng:.6f}"
        cached_result = cache.get(cache_key)
        if cached_result:
            return cached_result
        
        params = {
            'latlng': f"{lat},{lng}",
            'result_type': 'street_address|route|locality|administrative_area_level_1'
        }
        
        data = self._make_request('geocode/json', params)
        if not data or not data.get('results'):
            return None
        
        result = data['results'][0]
        
        reverse_geocoded = {
            'formatted_address': result['formatted_address'],
            'address_components': result.get('address_components', []),
            'place_id': result['place_id'],
            'geometry': result['geometry']
        }
        
        # Cache for 24 hours
        cache.set(cache_key, reverse_geocoded, 86400)
        return reverse_geocoded
    
    def get_directions(self, origin: str, destination: str, 
                      waypoints: Optional[List[str]] = None,
                      avoid_restrictions: bool = True) -> Optional[Dict]:
        """
        Get driving directions between locations.
        
        Args:
            origin: Starting address or coordinates
            destination: Ending address or coordinates
            waypoints: Optional list of intermediate waypoints
            avoid_restrictions: Whether to avoid dangerous goods restrictions
            
        Returns:
            Dict with route information including duration, distance, steps
        """
        params = {
            'origin': origin,
            'destination': destination,
            'mode': 'driving',
            'units': 'metric',
            'region': 'au',
            'alternatives': 'true'
        }
        
        if waypoints:
            params['waypoints'] = '|'.join(waypoints)
        
        if avoid_restrictions:
            # Avoid toll roads and highways that may have dangerous goods restrictions
            params['avoid'] = 'tolls'
        
        data = self._make_request('directions/json', params)
        if not data or not data.get('routes'):
            return None
        
        route = data['routes'][0]  # Primary route
        leg = route['legs'][0]
        
        return {
            'duration': leg['duration'],
            'distance': leg['distance'],
            'start_address': leg['start_address'],
            'end_address': leg['end_address'],
            'steps': leg['steps'],
            'overview_polyline': route['overview_polyline']['points'],
            'bounds': route['bounds'],
            'warnings': route.get('warnings', []),
            'alternative_routes': data['routes'][1:] if len(data['routes']) > 1 else []
        }
    
    def calculate_distance_matrix(self, origins: List[str], 
                                destinations: List[str]) -> Optional[Dict]:
        """
        Calculate travel times and distances between multiple origins and destinations.
        
        Args:
            origins: List of origin addresses
            destinations: List of destination addresses
            
        Returns:
            Distance matrix with durations and distances
        """
        params = {
            'origins': '|'.join(origins),
            'destinations': '|'.join(destinations),
            'mode': 'driving',
            'units': 'metric',
            'avoid': 'tolls'  # Avoid toll roads for dangerous goods
        }
        
        data = self._make_request('distancematrix/json', params)
        if not data:
            return None
        
        return {
            'origin_addresses': data.get('origin_addresses', []),
            'destination_addresses': data.get('destination_addresses', []),
            'rows': data.get('rows', [])
        }
    
    def find_places_nearby(self, lat: float, lng: float, 
                          place_type: str = 'gas_station',
                          radius: int = 5000) -> Optional[List[Dict]]:
        """
        Find nearby places of interest for dangerous goods transport.
        
        Args:
            lat: Latitude
            lng: Longitude
            place_type: Type of place to search for
            radius: Search radius in meters
            
        Returns:
            List of nearby places with details
        """
        params = {
            'location': f"{lat},{lng}",
            'radius': radius,
            'type': place_type
        }
        
        data = self._make_request('place/nearbysearch/json', params)
        if not data or not data.get('results'):
            return []
        
        places = []
        for place in data['results']:
            places.append({
                'name': place['name'],
                'place_id': place['place_id'],
                'rating': place.get('rating'),
                'vicinity': place.get('vicinity'),
                'geometry': place['geometry'],
                'types': place.get('types', []),
                'business_status': place.get('business_status')
            })
        
        return places
    
    def validate_dangerous_goods_route(self, route_coordinates: List[Tuple[float, float]]) -> Dict:
        """
        Validate a route for dangerous goods transport compliance.
        
        Args:
            route_coordinates: List of (lat, lng) coordinate pairs
            
        Returns:
            Validation result with compliance status and warnings
        """
        # This would integrate with Australian Dangerous Goods regulations
        # For now, we'll do basic validation
        
        validation_result = {
            'is_compliant': True,
            'warnings': [],
            'restrictions': [],
            'alternative_suggested': False
        }
        
        # Check route length (dangerous goods have maximum daily driving limits)
        if len(route_coordinates) > 100:  # Rough check for very long routes
            validation_result['warnings'].append(
                "Route may exceed daily driving time limits for dangerous goods transport"
            )
        
        # Check for major urban areas (some dangerous goods restricted)
        for lat, lng in route_coordinates:
            # Sydney CBD rough bounds
            if -33.87 <= lat <= -33.85 and 151.20 <= lng <= 151.22:
                validation_result['warnings'].append(
                    "Route passes through Sydney CBD - check dangerous goods restrictions"
                )
            
            # Melbourne CBD rough bounds  
            if -37.82 <= lat <= -37.80 and 144.95 <= lng <= 144.98:
                validation_result['warnings'].append(
                    "Route passes through Melbourne CBD - check dangerous goods restrictions"
                )
        
        return validation_result


# Service instance
google_maps_service = GoogleMapsService()