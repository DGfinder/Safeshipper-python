#!/usr/bin/env python3
"""
Load testing script for SafeShipper SDS caching performance.
Tests the effectiveness of caching implementation for dangerous goods lookups.
"""

import asyncio
import aiohttp
import time
import json
import statistics
from typing import List, Dict, Any
from concurrent.futures import ThreadPoolExecutor
import argparse
from datetime import datetime


class SDSCacheLoadTester:
    """
    Load tester for SDS caching system.
    """
    
    def __init__(self, base_url: str, auth_token: str):
        self.base_url = base_url.rstrip('/')
        self.auth_token = auth_token
        self.session = None
        self.results = {
            'cache_hits': 0,
            'cache_misses': 0,
            'total_requests': 0,
            'response_times': [],
            'errors': [],
            'test_start': None,
            'test_end': None
        }
    
    async def setup_session(self):
        """Setup aiohttp session with authentication"""
        headers = {
            'Authorization': f'Bearer {self.auth_token}',
            'Content-Type': 'application/json'
        }
        connector = aiohttp.TCPConnector(limit=100)  # Allow more concurrent connections
        self.session = aiohttp.ClientSession(headers=headers, connector=connector)
    
    async def cleanup_session(self):
        """Cleanup aiohttp session"""
        if self.session:
            await self.session.close()
    
    async def test_sds_lookup(self, dangerous_good_id: str, language: str = 'EN', country_code: str = 'US') -> Dict[str, Any]:
        """
        Test SDS lookup with timing.
        """
        url = f"{self.base_url}/api/v1/sds/lookup/"
        payload = {
            'dangerous_good_id': dangerous_good_id,
            'language': language,
            'country_code': country_code
        }
        
        start_time = time.time()
        
        try:
            async with self.session.post(url, json=payload) as response:
                response_time = (time.time() - start_time) * 1000  # Convert to ms
                
                self.results['total_requests'] += 1
                self.results['response_times'].append(response_time)
                
                if response.status == 200:
                    data = await response.json()
                    return {
                        'success': True,
                        'response_time': response_time,
                        'status_code': response.status,
                        'data': data,
                        'cache_hit': response_time < 50  # Assume cache hit if very fast
                    }
                else:
                    error_text = await response.text()
                    self.results['errors'].append({
                        'status_code': response.status,
                        'error': error_text,
                        'payload': payload
                    })
                    return {
                        'success': False,
                        'response_time': response_time,
                        'status_code': response.status,
                        'error': error_text
                    }
                    
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            self.results['errors'].append({
                'exception': str(e),
                'payload': payload
            })
            return {
                'success': False,
                'response_time': response_time,
                'error': str(e)
            }
    
    async def test_un_number_lookup(self, un_number: str, language: str = 'EN') -> Dict[str, Any]:
        """
        Test UN number lookup with timing.
        """
        url = f"{self.base_url}/api/v1/sds/lookup_by_un_number/"
        payload = {
            'un_number': un_number,
            'language': language
        }
        
        start_time = time.time()
        
        try:
            async with self.session.post(url, json=payload) as response:
                response_time = (time.time() - start_time) * 1000
                
                self.results['total_requests'] += 1
                self.results['response_times'].append(response_time)
                
                if response.status == 200:
                    data = await response.json()
                    return {
                        'success': True,
                        'response_time': response_time,
                        'status_code': response.status,
                        'data': data,
                        'cache_hit': response_time < 100  # UN lookup involves more work
                    }
                else:
                    error_text = await response.text()
                    self.results['errors'].append({
                        'status_code': response.status,
                        'error': error_text,
                        'payload': payload
                    })
                    return {
                        'success': False,
                        'response_time': response_time,
                        'status_code': response.status,
                        'error': error_text
                    }
                    
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            self.results['errors'].append({
                'exception': str(e),
                'payload': payload
            })
            return {
                'success': False,
                'response_time': response_time,
                'error': str(e)
            }
    
    async def warm_cache(self) -> Dict[str, Any]:
        """
        Warm the SDS cache before testing.
        """
        url = f"{self.base_url}/api/v1/sds/cache_management/"
        payload = {'action': 'warm'}
        
        try:
            async with self.session.post(url, json=payload) as response:
                if response.status == 200:
                    data = await response.json()
                    return {'success': True, 'data': data}
                else:
                    error_text = await response.text()
                    return {'success': False, 'error': error_text}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def get_cache_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.
        """
        url = f"{self.base_url}/api/v1/sds/cache_management/"
        payload = {'action': 'stats'}
        
        try:
            async with self.session.post(url, json=payload) as response:
                if response.status == 200:
                    data = await response.json()
                    return {'success': True, 'data': data}
                else:
                    error_text = await response.text()
                    return {'success': False, 'error': error_text}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def run_concurrent_lookups(self, test_scenarios: List[Dict], concurrent_users: int = 10, iterations: int = 100):
        """
        Run concurrent SDS lookups to test cache performance.
        """
        print(f"Starting load test with {concurrent_users} concurrent users, {iterations} iterations each")
        print(f"Total requests: {concurrent_users * iterations}")
        
        self.results['test_start'] = datetime.now()
        
        # Create semaphore to limit concurrent requests
        semaphore = asyncio.Semaphore(concurrent_users)
        
        async def run_test_scenario(scenario: Dict):
            async with semaphore:
                if scenario['type'] == 'sds_lookup':
                    return await self.test_sds_lookup(
                        scenario['dangerous_good_id'],
                        scenario.get('language', 'EN'),
                        scenario.get('country_code', 'US')
                    )
                elif scenario['type'] == 'un_lookup':
                    return await self.test_un_number_lookup(
                        scenario['un_number'],
                        scenario.get('language', 'EN')
                    )
        
        # Create tasks for all test scenarios
        tasks = []
        for _ in range(iterations):
            for scenario in test_scenarios:
                task = asyncio.create_task(run_test_scenario(scenario))
                tasks.append(task)
        
        # Execute all tasks
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        self.results['test_end'] = datetime.now()
        
        # Analyze results
        successful_results = [r for r in results if isinstance(r, dict) and r.get('success')]
        cache_hits = len([r for r in successful_results if r.get('cache_hit')])
        
        self.results['cache_hits'] = cache_hits
        self.results['cache_misses'] = len(successful_results) - cache_hits
        
        return results
    
    def generate_performance_report(self) -> Dict[str, Any]:
        """
        Generate comprehensive performance report.
        """
        if not self.results['response_times']:
            return {'error': 'No response times recorded'}
        
        response_times = self.results['response_times']
        
        report = {
            'test_summary': {
                'total_requests': self.results['total_requests'],
                'successful_requests': self.results['total_requests'] - len(self.results['errors']),
                'failed_requests': len(self.results['errors']),
                'success_rate': ((self.results['total_requests'] - len(self.results['errors'])) / max(self.results['total_requests'], 1)) * 100,
                'test_duration_seconds': (self.results['test_end'] - self.results['test_start']).total_seconds() if self.results['test_end'] else 0
            },
            'cache_performance': {
                'cache_hits': self.results['cache_hits'],
                'cache_misses': self.results['cache_misses'],
                'cache_hit_rate': (self.results['cache_hits'] / max(self.results['cache_hits'] + self.results['cache_misses'], 1)) * 100
            },
            'response_time_stats': {
                'min_ms': min(response_times),
                'max_ms': max(response_times),
                'mean_ms': statistics.mean(response_times),
                'median_ms': statistics.median(response_times),
                'p95_ms': self._percentile(response_times, 95),
                'p99_ms': self._percentile(response_times, 99)
            },
            'throughput': {
                'requests_per_second': self.results['total_requests'] / max((self.results['test_end'] - self.results['test_start']).total_seconds(), 1) if self.results['test_end'] else 0
            },
            'errors': self.results['errors'][:10]  # Show first 10 errors
        }
        
        return report
    
    def _percentile(self, data: List[float], percentile: int) -> float:
        """Calculate percentile of data"""
        if not data:
            return 0
        sorted_data = sorted(data)
        index = int((percentile / 100) * len(sorted_data))
        return sorted_data[min(index, len(sorted_data) - 1)]
    
    def print_report(self, report: Dict[str, Any]):
        """
        Print formatted performance report.
        """
        print("\n" + "=" * 60)
        print("SDS CACHING LOAD TEST REPORT")
        print("=" * 60)
        
        # Test summary
        summary = report['test_summary']
        print(f"\nTest Summary:")
        print(f"  Total Requests: {summary['total_requests']}")
        print(f"  Successful: {summary['successful_requests']}")
        print(f"  Failed: {summary['failed_requests']}")
        print(f"  Success Rate: {summary['success_rate']:.1f}%")
        print(f"  Test Duration: {summary['test_duration_seconds']:.1f} seconds")
        
        # Cache performance
        cache = report['cache_performance']
        print(f"\nCache Performance:")
        print(f"  Cache Hits: {cache['cache_hits']}")
        print(f"  Cache Misses: {cache['cache_misses']}")
        print(f"  Cache Hit Rate: {cache['cache_hit_rate']:.1f}%")
        
        # Response times
        rt = report['response_time_stats']
        print(f"\nResponse Time Statistics (ms):")
        print(f"  Min: {rt['min_ms']:.1f}")
        print(f"  Max: {rt['max_ms']:.1f}")
        print(f"  Mean: {rt['mean_ms']:.1f}")
        print(f"  Median: {rt['median_ms']:.1f}")
        print(f"  95th Percentile: {rt['p95_ms']:.1f}")
        print(f"  99th Percentile: {rt['p99_ms']:.1f}")
        
        # Throughput
        throughput = report['throughput']
        print(f"\nThroughput:")
        print(f"  Requests per Second: {throughput['requests_per_second']:.1f}")
        
        # Errors (if any)
        if report['errors']:
            print(f"\nFirst 10 Errors:")
            for i, error in enumerate(report['errors'][:10], 1):
                print(f"  {i}. {error}")
        
        print("\n" + "=" * 60)


async def main():
    parser = argparse.ArgumentParser(description='SDS Caching Load Test')
    parser.add_argument('--base-url', required=True, help='Base URL of SafeShipper API')
    parser.add_argument('--auth-token', required=True, help='Authentication token')
    parser.add_argument('--concurrent-users', type=int, default=10, help='Number of concurrent users')
    parser.add_argument('--iterations', type=int, default=50, help='Number of iterations per user')
    parser.add_argument('--warm-cache', action='store_true', help='Warm cache before testing')
    
    args = parser.parse_args()
    
    # Initialize tester
    tester = SDSCacheLoadTester(args.base_url, args.auth_token)
    await tester.setup_session()
    
    try:
        # Warm cache if requested
        if args.warm_cache:
            print("Warming cache...")
            warm_result = await tester.warm_cache()
            if warm_result['success']:
                print(f"Cache warmed: {warm_result['data'].get('warmed_entries', 0)} entries")
            else:
                print(f"Cache warming failed: {warm_result['error']}")
        
        # Define test scenarios (you'd replace these with real data)
        test_scenarios = [
            {
                'type': 'un_lookup',
                'un_number': 'UN1203',  # Gasoline
                'language': 'EN'
            },
            {
                'type': 'un_lookup',
                'un_number': 'UN1950',  # Aerosols
                'language': 'EN'
            },
            {
                'type': 'un_lookup',
                'un_number': 'UN1993',  # Flammable liquids
                'language': 'EN'
            },
            # Add more test scenarios as needed
        ]
        
        # Run load test
        print("\nStarting load test...")
        await tester.run_concurrent_lookups(
            test_scenarios,
            concurrent_users=args.concurrent_users,
            iterations=args.iterations
        )
        
        # Generate and print report
        report = tester.generate_performance_report()
        tester.print_report(report)
        
        # Get final cache stats
        print("\nFinal cache statistics:")
        cache_stats = await tester.get_cache_stats()
        if cache_stats['success']:
            stats = cache_stats['data']
            print(f"  Cache Hit Rate: {stats.get('cache_hit_rate', 'N/A')}%")
            print(f"  Cached Entries: {stats.get('estimated_cached_entries', 'N/A')}")
            print(f"  Cache Size: {stats.get('cache_size_mb', 'N/A')} MB")
        
    finally:
        await tester.cleanup_session()


if __name__ == '__main__':
    asyncio.run(main())
