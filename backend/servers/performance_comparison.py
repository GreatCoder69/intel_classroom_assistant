#!/usr/bin/env python3
"""
Performance Comparison Script

Compares the performance between the original server and the ultra-optimized server
to demonstrate the improvements achieved through optimization.
"""

import time
import requests
import threading
import statistics
from datetime import datetime
from typing import List, Dict, Tuple
import json
import concurrent.futures

class PerformanceComparison:
    """
    Compare performance between original and optimized servers.
    """
    
    def __init__(self, original_url: str = "http://localhost:8000", 
                 optimized_url: str = "http://localhost:8001"):
        self.original_url = original_url.rstrip('/')
        self.optimized_url = optimized_url.rstrip('/')
        self.session = requests.Session()
        self.session.timeout = (5, 10)
        
    def test_response_time(self, url: str, num_requests: int = 20) -> List[float]:
        """Test response time with multiple requests."""
        response_times = []
        
        test_questions = [
            "What is photosynthesis?",
            "Explain Newton's laws of motion",
            "How does cellular respiration work?",
            "What are the properties of prime numbers?",
            "Describe the water cycle",
            "What is machine learning?",
            "Explain the structure of DNA",
            "How do enzymes work?",
            "What is the theory of relativity?",
            "Describe the process of mitosis"
        ]
        
        for i in range(num_requests):
            question = test_questions[i % len(test_questions)]
            
            try:
                start_time = time.time()
                response = self.session.post(
                    f"{url}/api/chat",
                    json={
                        "question": question,
                        "role": "student",
                        "subject": "General"
                    },
                    headers={'Content-Type': 'application/json'}
                )
                
                if response.status_code == 200:
                    response_time = time.time() - start_time
                    response_times.append(response_time)
                else:
                    print(f"Error response: {response.status_code}")
                    
            except Exception as e:
                print(f"Request failed: {e}")
        
        return response_times
    
    def test_concurrent_requests(self, url: str, concurrent_users: int = 5, 
                               requests_per_user: int = 10) -> List[float]:
        """Test performance under concurrent load."""
        all_response_times = []
        
        def user_requests():
            user_times = []
            for i in range(requests_per_user):
                try:
                    start_time = time.time()
                    response = self.session.post(
                        f"{url}/api/chat",
                        json={
                            "question": f"Test concurrent question {i}",
                            "role": "student",
                            "subject": "General"
                        }
                    )
                    
                    if response.status_code == 200:
                        response_time = time.time() - start_time
                        user_times.append(response_time)
                        
                except Exception as e:
                    print(f"Concurrent request failed: {e}")
            
            return user_times
        
        # Run concurrent users
        with concurrent.futures.ThreadPoolExecutor(max_workers=concurrent_users) as executor:
            future_to_user = {executor.submit(user_requests): i for i in range(concurrent_users)}
            
            for future in concurrent.futures.as_completed(future_to_user):
                user_times = future.result()
                all_response_times.extend(user_times)
        
        return all_response_times
    
    def get_server_stats(self, url: str) -> Dict:
        """Get server statistics if available."""
        try:
            # Try health endpoint
            response = self.session.get(f"{url}/api/health", timeout=3)
            if response.status_code == 200:
                health_data = response.json()
                
                # Try stats endpoint if available
                try:
                    stats_response = self.session.get(f"{url}/api/stats", timeout=3)
                    if stats_response.status_code == 200:
                        stats_data = stats_response.json()
                        health_data.update({"detailed_stats": stats_data})
                except:
                    pass
                
                return health_data
            else:
                return {"error": f"HTTP {response.status_code}"}
                
        except Exception as e:
            return {"error": str(e)}
    
    def calculate_statistics(self, response_times: List[float]) -> Dict:
        """Calculate comprehensive statistics from response times."""
        if not response_times:
            return {"error": "No response times to analyze"}
        
        times_ms = [t * 1000 for t in response_times]  # Convert to milliseconds
        
        return {
            "count": len(times_ms),
            "mean": statistics.mean(times_ms),
            "median": statistics.median(times_ms),
            "min": min(times_ms),
            "max": max(times_ms),
            "std_dev": statistics.stdev(times_ms) if len(times_ms) > 1 else 0,
            "p75": statistics.quantiles(times_ms, n=4)[2] if len(times_ms) >= 4 else max(times_ms),
            "p90": statistics.quantiles(times_ms, n=10)[8] if len(times_ms) >= 10 else max(times_ms),
            "p95": statistics.quantiles(times_ms, n=20)[18] if len(times_ms) >= 20 else max(times_ms),
            "p99": statistics.quantiles(times_ms, n=100)[98] if len(times_ms) >= 100 else max(times_ms)
        }
    
    def run_comprehensive_comparison(self) -> Dict:
        """Run a comprehensive comparison between servers."""
        print("🔬 Starting comprehensive performance comparison...")
        print("This may take several minutes to complete.\n")
        
        results = {
            "timestamp": datetime.now().isoformat(),
            "test_config": {
                "sequential_requests": 20,
                "concurrent_users": 5,
                "requests_per_user": 10
            },
            "servers": {}
        }
        
        # Test both servers
        for server_name, url in [("original", self.original_url), ("optimized", self.optimized_url)]:
            print(f"🧪 Testing {server_name} server ({url})...")
            
            server_results = {"url": url}
            
            # Get initial server stats
            print(f"   📊 Getting server statistics...")
            server_results["initial_stats"] = self.get_server_stats(url)
            
            # Test sequential performance
            print(f"   ⏱️  Testing sequential requests...")
            sequential_times = self.test_response_time(url, num_requests=20)
            server_results["sequential"] = {
                "response_times": sequential_times,
                "statistics": self.calculate_statistics(sequential_times)
            }
            
            # Test concurrent performance
            print(f"   🚀 Testing concurrent requests...")
            concurrent_times = self.test_concurrent_requests(url, concurrent_users=5, requests_per_user=10)
            server_results["concurrent"] = {
                "response_times": concurrent_times,
                "statistics": self.calculate_statistics(concurrent_times)
            }
            
            # Get final server stats
            print(f"   📈 Getting final statistics...")
            server_results["final_stats"] = self.get_server_stats(url)
            
            results["servers"][server_name] = server_results
            print(f"   ✅ {server_name.title()} server testing complete\n")
        
        return results
    
    def generate_comparison_report(self, results: Dict):
        """Generate a detailed comparison report."""
        print("\n" + "="*80)
        print("📊 PERFORMANCE COMPARISON REPORT")
        print("="*80)
        
        original = results["servers"].get("original", {})
        optimized = results["servers"].get("optimized", {})
        
        if not original or not optimized:
            print("❌ Incomplete test results - both servers must be tested")
            return
        
        print(f"\n🕐 Test Time: {results['timestamp']}")
        print(f"📋 Test Configuration:")
        config = results["test_config"]
        print(f"   Sequential Requests: {config['sequential_requests']}")
        print(f"   Concurrent Users: {config['concurrent_users']}")
        print(f"   Requests per User: {config['requests_per_user']}")
        
        # Sequential Performance Comparison
        print(f"\n⏱️  SEQUENTIAL PERFORMANCE")
        print("-" * 40)
        
        orig_seq = original.get("sequential", {}).get("statistics", {})
        opt_seq = optimized.get("sequential", {}).get("statistics", {})
        
        if orig_seq and opt_seq:
            metrics = ["mean", "median", "p95", "max"]
            for metric in metrics:
                orig_val = orig_seq.get(metric, 0)
                opt_val = opt_seq.get(metric, 0)
                improvement = ((orig_val - opt_val) / orig_val * 100) if orig_val > 0 else 0
                
                print(f"{metric.upper():>8}: {orig_val:>8.1f}ms → {opt_val:>8.1f}ms ({improvement:>+6.1f}%)")
        
        # Concurrent Performance Comparison
        print(f"\n🚀 CONCURRENT PERFORMANCE")
        print("-" * 40)
        
        orig_conc = original.get("concurrent", {}).get("statistics", {})
        opt_conc = optimized.get("concurrent", {}).get("statistics", {})
        
        if orig_conc and opt_conc:
            metrics = ["mean", "median", "p95", "max"]
            for metric in metrics:
                orig_val = orig_conc.get(metric, 0)
                opt_val = opt_conc.get(metric, 0)
                improvement = ((orig_val - opt_val) / orig_val * 100) if orig_val > 0 else 0
                
                print(f"{metric.upper():>8}: {orig_val:>8.1f}ms → {opt_val:>8.1f}ms ({improvement:>+6.1f}%)")
        
        # Throughput Comparison
        print(f"\n📈 THROUGHPUT ANALYSIS")
        print("-" * 40)
        
        # Calculate requests per second for concurrent tests
        if orig_conc and opt_conc:
            orig_total_time = sum(original["concurrent"]["response_times"])
            opt_total_time = sum(optimized["concurrent"]["response_times"])
            
            orig_rps = len(original["concurrent"]["response_times"]) / orig_total_time if orig_total_time > 0 else 0
            opt_rps = len(optimized["concurrent"]["response_times"]) / opt_total_time if opt_total_time > 0 else 0
            
            throughput_improvement = ((opt_rps - orig_rps) / orig_rps * 100) if orig_rps > 0 else 0
            
            print(f"Original:  {orig_rps:.2f} requests/second")
            print(f"Optimized: {opt_rps:.2f} requests/second")
            print(f"Improvement: {throughput_improvement:+.1f}%")
        
        # Memory and Resource Usage (if available)
        print(f"\n💾 RESOURCE USAGE")
        print("-" * 40)
        
        orig_stats = original.get("final_stats", {})
        opt_stats = optimized.get("final_stats", {})
        
        if "memory" in orig_stats and "memory" in opt_stats:
            orig_mem = orig_stats["memory"].get("percent_used", 0)
            opt_mem = opt_stats["memory"].get("percent_used", 0)
            mem_improvement = orig_mem - opt_mem
            
            print(f"Memory Usage:")
            print(f"   Original:  {orig_mem:.1f}%")
            print(f"   Optimized: {opt_mem:.1f}%")
            print(f"   Reduction: {mem_improvement:+.1f} percentage points")
        
        # Cache Performance (if available)
        if "cache_stats" in opt_stats:
            cache_stats = opt_stats["cache_stats"]
            print(f"\nCache Performance (Optimized Server):")
            print(f"   Hit Rate: {cache_stats.get('hit_rate', 0) * 100:.1f}%")
            print(f"   Cache Size: {cache_stats.get('cache_size', 0)} items")
            print(f"   Memory Usage: {cache_stats.get('memory_mb', 0):.1f} MB")
        
        # Summary
        print(f"\n🎯 OPTIMIZATION SUMMARY")
        print("-" * 40)
        
        if orig_seq and opt_seq and orig_conc and opt_conc:
            seq_improvement = ((orig_seq.get('mean', 0) - opt_seq.get('mean', 0)) / orig_seq.get('mean', 1) * 100)
            conc_improvement = ((orig_conc.get('mean', 0) - opt_conc.get('mean', 0)) / orig_conc.get('mean', 1) * 100)
            
            print(f"✅ Sequential Response Time: {seq_improvement:+.1f}% improvement")
            print(f"✅ Concurrent Response Time: {conc_improvement:+.1f}% improvement")
            
            if seq_improvement > 0:
                print("🎉 Optimization successful!")
            else:
                print("⚠️  Optimization may need tuning")
        
        print("\n" + "="*80)
    
    def save_results(self, results: Dict, filename: str = None):
        """Save results to a JSON file."""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"performance_comparison_{timestamp}.json"
        
        try:
            with open(filename, 'w') as f:
                json.dump(results, f, indent=2, default=str)
            print(f"📁 Results saved to {filename}")
        except Exception as e:
            print(f"❌ Error saving results: {e}")


def main():
    """Main function for running performance comparison."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Performance Comparison Tool')
    parser.add_argument('--original', default='http://localhost:8000',
                       help='Original server URL (default: http://localhost:8000)')
    parser.add_argument('--optimized', default='http://localhost:8001',
                       help='Optimized server URL (default: http://localhost:8001)')
    parser.add_argument('--output', help='Output filename for results')
    parser.add_argument('--quick', action='store_true',
                       help='Run a quick test with fewer requests')
    
    args = parser.parse_args()
    
    comparison = PerformanceComparison(args.original, args.optimized)
    
    try:
        # Adjust test parameters for quick test
        if args.quick:
            print("🏃 Running quick performance comparison...")
            # Override test methods for quicker execution
            comparison.test_response_time = lambda url, num_requests=5: comparison.test_response_time(url, 5)
            comparison.test_concurrent_requests = lambda url, concurrent_users=2, requests_per_user=3: comparison.test_concurrent_requests(url, 2, 3)
        
        # Run comparison
        results = comparison.run_comprehensive_comparison()
        
        # Generate report
        comparison.generate_comparison_report(results)
        
        # Save results
        if args.output:
            comparison.save_results(results, args.output)
        else:
            comparison.save_results(results)
            
    except KeyboardInterrupt:
        print("\n⚠️  Test interrupted by user")
    except Exception as e:
        print(f"❌ Test failed: {e}")


if __name__ == "__main__":
    main()
