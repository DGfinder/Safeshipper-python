#!/usr/bin/env python3
"""
Simple cache performance test for SafeShipper SDS system.
Tests cache effectiveness with minimal dependencies.
"""

import requests
import time
import statistics
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any


class SimpleCacheTest:
    def __init__(self, base_url: str, auth_token: str):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {auth_token}',
            'Content-Type': 'application/json'
        })
        self.results = []
    
    def test_single_lookup(self, un_number: str, language: str = 'EN') -> Dict[str, Any]:
        """Test a single SDS lookup"""
        url = f"{self.base_url}/api/v1/sds/lookup_by_un_number/"
        payload = {
            'un_number': un_number,
            'language': language
        }
        
        start_time = time.time()
        
        try:
            response = self.session.post(url, json=payload, timeout=10)
            response_time = (time.time() - start_time) * 1000  # Convert to ms
            
            return {
                'success': response.status_code == 200,
                'status_code': response.status_code,
                'response_time_ms': response_time,
                'un_number': un_number,
                'timestamp': time.time()
            }
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return {
                'success': False,
                'error': str(e),
                'response_time_ms': response_time,
                'un_number': un_number,
                'timestamp': time.time()
            }
    
    def test_cache_effectiveness(self, un_numbers: List[str], repetitions: int = 10) -> Dict[str, Any]:
        """Test cache effectiveness by repeating the same requests"""
        print(f"Testing cache effectiveness with {len(un_numbers)} UN numbers, {repetitions} repetitions each")
        
        all_results = []
        
        # Test each UN number multiple times to see cache effect
        for un_number in un_numbers:
            print(f"Testing {un_number}...")
            
            for i in range(repetitions):
                result = self.test_single_lookup(un_number)
                result['repetition'] = i + 1
                all_results.append(result)
                
                # Small delay between requests
                time.sleep(0.1)
        
        # Analyze results
        successful_results = [r for r in all_results if r['success']]
        
        if not successful_results:
            return {'error': 'No successful requests'}
        
        # Group by UN number to analyze cache effectiveness
        by_un_number = {}
        for result in successful_results:
            un = result['un_number']
            if un not in by_un_number:
                by_un_number[un] = []
            by_un_number[un].append(result)
        
        # Calculate cache effectiveness metrics
        cache_analysis = {}
        for un_number, results in by_un_number.items():
            response_times = [r['response_time_ms'] for r in results]
            
            # First request (cache miss) vs subsequent requests (cache hits)
            first_request_time = response_times[0] if response_times else 0
            subsequent_times = response_times[1:] if len(response_times) > 1 else []
            
            cache_analysis[un_number] = {
                'first_request_ms': first_request_time,
                'subsequent_avg_ms': statistics.mean(subsequent_times) if subsequent_times else 0,
                'cache_improvement': first_request_time - statistics.mean(subsequent_times) if subsequent_times else 0,
                'cache_improvement_percent': ((first_request_time - statistics.mean(subsequent_times)) / first_request_time * 100) if subsequent_times and first_request_time > 0 else 0,
                'total_requests': len(results)
            }
        
        # Overall statistics
        all_response_times = [r['response_time_ms'] for r in successful_results]
        
        return {
            'total_requests': len(all_results),
            'successful_requests': len(successful_results),
            'success_rate': len(successful_results) / len(all_results) * 100,
            'overall_stats': {
                'min_ms': min(all_response_times),
                'max_ms': max(all_response_times),
                'avg_ms': statistics.mean(all_response_times),
                'median_ms': statistics.median(all_response_times)
            },
            'cache_analysis': cache_analysis,
            'raw_results': all_results
        }
    
    def test_concurrent_load(self, un_numbers: List[str], concurrent_users: int = 5, requests_per_user: int = 10) -> Dict[str, Any]:
        """Test concurrent load to simulate real usage"""
        print(f"Testing concurrent load: {concurrent_users} users, {requests_per_user} requests each")
        
        def worker_function(worker_id: int) -> List[Dict[str, Any]]:
            """Worker function for concurrent testing"""
            worker_results = []
            for i in range(requests_per_user):
                # Cycle through UN numbers
                un_number = un_numbers[i % len(un_numbers)]
                result = self.test_single_lookup(un_number)
                result['worker_id'] = worker_id
                result['request_id'] = i + 1
                worker_results.append(result)
            return worker_results
        
        start_time = time.time()
        all_results = []
        
        # Use ThreadPoolExecutor for concurrent requests
        with ThreadPoolExecutor(max_workers=concurrent_users) as executor:
            # Submit all worker tasks
            futures = [executor.submit(worker_function, i) for i in range(concurrent_users)]
            
            # Collect results as they complete
            for future in as_completed(futures):
                try:
                    worker_results = future.result()
                    all_results.extend(worker_results)
                except Exception as e:
                    print(f"Worker failed: {e}")
        
        total_time = time.time() - start_time
        
        # Analyze results
        successful_results = [r for r in all_results if r['success']]
        response_times = [r['response_time_ms'] for r in successful_results]
        
        if not response_times:
            return {'error': 'No successful concurrent requests'}
        
        return {
            'concurrent_users': concurrent_users,
            'requests_per_user': requests_per_user,
            'total_requests': len(all_results),
            'successful_requests': len(successful_results),
            'success_rate': len(successful_results) / len(all_results) * 100,
            'total_test_time_seconds': total_time,
            'requests_per_second': len(all_results) / total_time,
            'response_time_stats': {
                'min_ms': min(response_times),
                'max_ms': max(response_times),
                'avg_ms': statistics.mean(response_times),
                'median_ms': statistics.median(response_times),
                'p95_ms': self._percentile(response_times, 95),
                'p99_ms': self._percentile(response_times, 99)
            },
            'raw_results': all_results
        }
    
    def _percentile(self, data: List[float], percentile: int) -> float:
        """Calculate percentile"""
        if not data:
            return 0
        sorted_data = sorted(data)
        index = int((percentile / 100) * len(sorted_data))
        return sorted_data[min(index, len(sorted_data) - 1)]
    
    def print_cache_analysis(self, results: Dict[str, Any]):
        """Print cache effectiveness analysis"""
        print("\n" + "=" * 50)
        print("CACHE EFFECTIVENESS ANALYSIS")
        print("=" * 50)
        
        print(f"Total Requests: {results['total_requests']}")
        print(f"Successful: {results['successful_requests']}")
        print(f"Success Rate: {results['success_rate']:.1f}%")
        
        print("\nOverall Response Time Statistics:")
        stats = results['overall_stats']
        print(f"  Min: {stats['min_ms']:.1f} ms")
        print(f"  Max: {stats['max_ms']:.1f} ms")
        print(f"  Average: {stats['avg_ms']:.1f} ms")
        print(f"  Median: {stats['median_ms']:.1f} ms")
        
        print("\nCache Effectiveness by UN Number:")
        for un_number, analysis in results['cache_analysis'].items():
            improvement = analysis['cache_improvement_percent']
            print(f"  {un_number}:")
            print(f"    First Request: {analysis['first_request_ms']:.1f} ms")
            print(f"    Subsequent Avg: {analysis['subsequent_avg_ms']:.1f} ms")
            print(f"    Cache Improvement: {improvement:.1f}%")
        
        # Calculate overall cache effectiveness
        improvements = [a['cache_improvement_percent'] for a in results['cache_analysis'].values() if a['cache_improvement_percent'] > 0]
        if improvements:
            avg_improvement = statistics.mean(improvements)
            print(f"\nOverall Cache Effectiveness: {avg_improvement:.1f}% improvement")
    
    def print_concurrent_analysis(self, results: Dict[str, Any]):
        """Print concurrent load analysis"""
        print("\n" + "=" * 50)
        print("CONCURRENT LOAD TEST ANALYSIS")
        print("=" * 50)
        
        print(f"Concurrent Users: {results['concurrent_users']}")
        print(f"Requests per User: {results['requests_per_user']}")
        print(f"Total Requests: {results['total_requests']}")
        print(f"Successful: {results['successful_requests']}")
        print(f"Success Rate: {results['success_rate']:.1f}%")
        print(f"Test Duration: {results['total_test_time_seconds']:.1f} seconds")
        print(f"Throughput: {results['requests_per_second']:.1f} requests/second")
        
        print("\nResponse Time Statistics:")
        stats = results['response_time_stats']
        print(f"  Min: {stats['min_ms']:.1f} ms")
        print(f"  Max: {stats['max_ms']:.1f} ms")
        print(f"  Average: {stats['avg_ms']:.1f} ms")
        print(f"  Median: {stats['median_ms']:.1f} ms")
        print(f"  95th Percentile: {stats['p95_ms']:.1f} ms")
        print(f"  99th Percentile: {stats['p99_ms']:.1f} ms")


def main():
    # Configuration - update these for your environment
    BASE_URL = "http://localhost:8000"  # Update this
    AUTH_TOKEN = "your_auth_token_here"  # Update this
    
    # Common UN numbers for testing
    TEST_UN_NUMBERS = [
        "UN1203",  # Gasoline
        "UN1950",  # Aerosols
        "UN1993",  # Flammable liquids
        "UN2794",  # Batteries
        "UN3480"   # Lithium batteries
    ]
    
    print("SafeShipper SDS Cache Performance Test")
    print("=====================================")
    
    tester = SimpleCacheTest(BASE_URL, AUTH_TOKEN)
    
    # Test 1: Cache effectiveness
    print("\n1. Testing cache effectiveness...")
    cache_results = tester.test_cache_effectiveness(TEST_UN_NUMBERS, repetitions=5)
    
    if 'error' not in cache_results:
        tester.print_cache_analysis(cache_results)
    else:
        print(f"Cache test failed: {cache_results['error']}")
    
    # Test 2: Concurrent load
    print("\n2. Testing concurrent load...")
    concurrent_results = tester.test_concurrent_load(TEST_UN_NUMBERS, concurrent_users=3, requests_per_user=5)
    
    if 'error' not in concurrent_results:
        tester.print_concurrent_analysis(concurrent_results)
    else:
        print(f"Concurrent test failed: {concurrent_results['error']}")
    
    print("\nTest completed!")


if __name__ == '__main__':
    main()
