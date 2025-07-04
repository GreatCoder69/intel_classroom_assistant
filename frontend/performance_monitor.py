"""
Performance Monitoring and Benchmarking Tool

This script helps monitor and benchmark the Intel Classroom Assistant
to measure optimization improvements.
"""

import time
import requests
import json
import psutil
import threading
import statistics
from datetime import datetime
from typing import List, Dict, Any
import matplotlib.pyplot as plt
import pandas as pd

class PerformanceMonitor:
    """
    Monitor system performance and API response times.
    
    Features:
    - Real-time memory monitoring
    - API response time tracking
    - Batch request testing
    - Performance visualization
    """
    
    def __init__(self, base_url: str = "http://localhost:8000/api"):
        """
        Initialize performance monitor.
        
        Args:
            base_url (str): Base URL for API endpoints
        """
        self.base_url = base_url
        self.metrics = {
            "memory_usage": [],
            "response_times": [],
            "timestamps": [],
            "request_sizes": [],
            "error_count": 0,
            "success_count": 0
        }
        self.monitoring = False
        self.monitor_thread = None
    
    def start_memory_monitoring(self, interval: float = 1.0):
        """
        Start continuous memory monitoring.
        
        Args:
            interval (float): Monitoring interval in seconds
        """
        self.monitoring = True
        
        def monitor_loop():
            while self.monitoring:
                memory = psutil.virtual_memory()
                self.metrics["memory_usage"].append(memory.percent)
                self.metrics["timestamps"].append(datetime.now())
                time.sleep(interval)
        
        self.monitor_thread = threading.Thread(target=monitor_loop)
        self.monitor_thread.daemon = True
        self.monitor_thread.start()
        print(f"📊 Memory monitoring started (interval: {interval}s)")
    
    def stop_memory_monitoring(self):
        """Stop memory monitoring."""
        self.monitoring = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=2)
        print("📊 Memory monitoring stopped")
    
    def test_single_request(self, question: str, role: str = "student") -> Dict[str, Any]:
        """
        Test a single API request and measure performance.
        
        Args:
            question (str): Question to send
            role (str): User role
            
        Returns:
            Dict[str, Any]: Performance metrics for the request
        """
        start_time = time.time()
        
        try:
            response = requests.post(
                f"{self.base_url}/query",
                json={"question": question, "role": role},
                timeout=30
            )
            
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                self.metrics["success_count"] += 1
                self.metrics["response_times"].append(response_time)
                self.metrics["request_sizes"].append(len(question))
                
                return {
                    "success": True,
                    "response_time": response_time,
                    "server_generation_time": data.get("metadata", {}).get("generation_time", 0),
                    "response_length": len(data.get("answer", "")),
                    "memory_info": data.get("metadata", {}).get("memory_usage", {})
                }
            else:
                self.metrics["error_count"] += 1
                return {
                    "success": False,
                    "response_time": response_time,
                    "error": f"HTTP {response.status_code}"
                }
                
        except Exception as e:
            self.metrics["error_count"] += 1
            return {
                "success": False,
                "response_time": time.time() - start_time,
                "error": str(e)
            }
    
    def benchmark_batch_requests(self, questions: List[str], role: str = "student") -> Dict[str, Any]:
        """
        Benchmark a batch of requests.
        
        Args:
            questions (List[str]): List of questions to test
            role (str): User role
            
        Returns:
            Dict[str, Any]: Batch benchmark results
        """
        print(f"🧪 Starting batch benchmark with {len(questions)} requests...")
        
        results = []
        start_time = time.time()
        
        for i, question in enumerate(questions):
            print(f"  Processing request {i+1}/{len(questions)}: {question[:50]}...")
            result = self.test_single_request(question, role)
            results.append(result)
            
            # Small delay between requests
            time.sleep(0.5)
        
        total_time = time.time() - start_time
        
        # Calculate statistics
        successful_results = [r for r in results if r["success"]]
        response_times = [r["response_time"] for r in successful_results]
        
        if response_times:
            stats = {
                "total_requests": len(questions),
                "successful_requests": len(successful_results),
                "failed_requests": len(results) - len(successful_results),
                "total_time": total_time,
                "average_response_time": statistics.mean(response_times),
                "median_response_time": statistics.median(response_times),
                "min_response_time": min(response_times),
                "max_response_time": max(response_times),
                "requests_per_second": len(questions) / total_time,
                "success_rate": len(successful_results) / len(questions) * 100
            }
        else:
            stats = {
                "total_requests": len(questions),
                "successful_requests": 0,
                "failed_requests": len(results),
                "total_time": total_time,
                "success_rate": 0
            }
        
        print(f"Batch benchmark completed!")
        print(f"Success rate: {stats.get('success_rate', 0):.1f}%")
        print(f"Average response time: {stats.get('average_response_time', 0):.2f}s")
        
        return stats
    
    def stress_test(self, concurrent_requests: int = 5, duration: int = 60):
        """
        Perform stress testing with concurrent requests.
        
        Args:
            concurrent_requests (int): Number of concurrent requests
            duration (int): Test duration in seconds
        """
        print(f"Starting stress test: {concurrent_requests} concurrent requests for {duration}s")
        
        test_questions = [
            "What is photosynthesis?",
            "Explain Newton's laws of motion",
            "How do you solve quadratic equations?",
            "What causes climate change?",
            "Describe the water cycle"
        ]
        
        results = []
        start_time = time.time()
        
        def worker():
            while time.time() - start_time < duration:
                question = test_questions[int(time.time()) % len(test_questions)]
                result = self.test_single_request(question)
                results.append(result)
                time.sleep(0.1)  # Small delay
        
        # Start worker threads
        threads = []
        for _ in range(concurrent_requests):
            thread = threading.Thread(target=worker)
            thread.daemon = True
            thread.start()
            threads.append(thread)
        
        # Wait for completion
        for thread in threads:
            thread.join()
        
        # Analyze results
        successful_results = [r for r in results if r["success"]]
        
        if successful_results:
            response_times = [r["response_time"] for r in successful_results]
            stress_stats = {
                "duration": duration,
                "concurrent_requests": concurrent_requests,
                "total_requests": len(results),
                "successful_requests": len(successful_results),
                "average_response_time": statistics.mean(response_times),
                "max_response_time": max(response_times),
                "requests_per_second": len(results) / duration,
                "success_rate": len(successful_results) / len(results) * 100
            }
        else:
            stress_stats = {
                "duration": duration,
                "concurrent_requests": concurrent_requests,
                "total_requests": len(results),
                "successful_requests": 0,
                "success_rate": 0
            }
        
        print(f"Stress test completed!")
        print(f"Total requests: {stress_stats['total_requests']}")
        print(f"Success rate: {stress_stats['success_rate']:.1f}%")
        print(f"Requests/second: {stress_stats.get('requests_per_second', 0):.2f}")
        
        return stress_stats
    
    def generate_report(self, output_file: str = "performance_report.html"):
        """
        Generate a comprehensive performance report.
        
        Args:
            output_file (str): Output HTML file path
        """
        if not self.metrics["response_times"]:
            print("No performance data available for report generation")
            return
        
        # Create visualizations
        fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(15, 10))
        
        # Response time distribution
        ax1.hist(self.metrics["response_times"], bins=20, alpha=0.7, color='blue')
        ax1.set_title('Response Time Distribution')
        ax1.set_xlabel('Response Time (seconds)')
        ax1.set_ylabel('Frequency')
        
        # Response time over time
        if len(self.metrics["timestamps"]) > 0:
            ax2.plot(range(len(self.metrics["response_times"])), self.metrics["response_times"], 'o-', alpha=0.7)
            ax2.set_title('Response Time Over Requests')
            ax2.set_xlabel('Request Number')
            ax2.set_ylabel('Response Time (seconds)')
        
        # Memory usage over time
        if self.metrics["memory_usage"]:
            ax3.plot(self.metrics["memory_usage"], color='red', alpha=0.7)
            ax3.set_title('Memory Usage Over Time')
            ax3.set_xlabel('Time Points')
            ax3.set_ylabel('Memory Usage (%)')
        
        # Request size vs response time
        if self.metrics["request_sizes"]:
            ax4.scatter(self.metrics["request_sizes"], self.metrics["response_times"], alpha=0.6)
            ax4.set_title('Request Size vs Response Time')
            ax4.set_xlabel('Request Size (characters)')
            ax4.set_ylabel('Response Time (seconds)')
        
        plt.tight_layout()
        plt.savefig('performance_charts.png', dpi=300, bbox_inches='tight')
        plt.close()
        
        # Generate HTML report
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Intel Classroom Assistant - Performance Report</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 40px; }}
                .header {{ background: #f0f0f0; padding: 20px; border-radius: 5px; }}
                .metric {{ display: inline-block; margin: 10px; padding: 15px; background: #e8f4f8; border-radius: 5px; }}
                .chart {{ text-align: center; margin: 20px 0; }}
                table {{ border-collapse: collapse; width: 100%; margin: 20px 0; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #f2f2f2; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Intel Classroom Assistant Performance Report</h1>
                <p>Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            </div>
            
            <h2>Key Metrics</h2>
            <div class="metric">
                <strong>Total Requests:</strong><br>{self.metrics['success_count'] + self.metrics['error_count']}
            </div>
            <div class="metric">
                <strong>Success Rate:</strong><br>{(self.metrics['success_count'] / (self.metrics['success_count'] + self.metrics['error_count']) * 100):.1f}%
            </div>
            <div class="metric">
                <strong>Avg Response Time:</strong><br>{statistics.mean(self.metrics['response_times']):.2f}s
            </div>
            <div class="metric">
                <strong>Median Response Time:</strong><br>{statistics.median(self.metrics['response_times']):.2f}s
            </div>
            
            <div class="chart">
                <h2>Performance Charts</h2>
                <img src="performance_charts.png" alt="Performance Charts" style="max-width: 100%;">
            </div>
            
            <h2>Detailed Statistics</h2>
            <table>
                <tr><th>Metric</th><th>Value</th></tr>
                <tr><td>Min Response Time</td><td>{min(self.metrics['response_times']):.3f}s</td></tr>
                <tr><td>Max Response Time</td><td>{max(self.metrics['response_times']):.3f}s</td></tr>
                <tr><td>Standard Deviation</td><td>{statistics.stdev(self.metrics['response_times']):.3f}s</td></tr>
                <tr><td>Successful Requests</td><td>{self.metrics['success_count']}</td></tr>
                <tr><td>Failed Requests</td><td>{self.metrics['error_count']}</td></tr>
            </table>
        </body>
        </html>
        """
        
        with open(output_file, 'w') as f:
            f.write(html_content)
        
        print(f"Performance report generated: {output_file}")

def main():
    """Main function to run performance tests."""
    monitor = PerformanceMonitor()
    
    print("Intel Classroom Assistant Performance Testing Tool")
    print("=" * 60)
    
    # Sample test questions
    test_questions = [
        "What is photosynthesis and how does it work?",
        "Explain the Pythagorean theorem with an example",
        "How do you calculate the area of a circle?",
        "What are the main causes of World War II?",
        "Describe the process of cellular respiration",
        "How do you solve a system of linear equations?",
        "What is the difference between DNA and RNA?",
        "Explain Newton's three laws of motion"
    ]
    
    # Start memory monitoring
    monitor.start_memory_monitoring(interval=2.0)
    
    try:
        # Test server health
        print("Checking server health...")
        health_response = requests.get(f"{monitor.base_url}/health", timeout=10)
        if health_response.status_code == 200:
            print("Server is healthy")
        else:
            print("Server health check failed")
            return
        
        # Run single request test
        print("\nTesting single request...")
        result = monitor.test_single_request("What is machine learning?", "student")
        print(f"   Response time: {result['response_time']:.2f}s")
        print(f"   Success: {result['success']}")
        
        # Run batch benchmark
        print("\nRunning batch benchmark...")
        batch_stats = monitor.benchmark_batch_requests(test_questions[:5])
        
        # Run stress test (smaller scale for demo)
        print("\nRunning stress test...")
        stress_stats = monitor.stress_test(concurrent_requests=3, duration=30)
        
        # Generate report
        print("\nGenerating performance report...")
        monitor.generate_report()
        
    except KeyboardInterrupt:
        print("\nTesting interrupted by user")
    except Exception as e:
        print(f"\nError during testing: {str(e)}")
    finally:
        monitor.stop_memory_monitoring()
        print("Performance testing completed!")

if __name__ == "__main__":
    main()
