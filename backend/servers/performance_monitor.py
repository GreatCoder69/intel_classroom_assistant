#!/usr/bin/env python3
"""
Performance Monitor for Intel Classroom Assistant

This script provides real-time monitoring of the ultra-optimized Flask server,
including memory usage, response times, cache performance, and system health.
"""

import time
import json
import requests
import psutil
import threading
import signal
import sys
from datetime import datetime, timedelta
from collections import deque, defaultdict
from typing import Dict, List, Any
import argparse

class PerformanceMonitor:
    """
    Comprehensive performance monitoring system for the Flask server.
    
    Features:
    - Real-time metrics collection
    - Performance trend analysis
    - Alert system for threshold breaches
    - Detailed logging and reporting
    - Interactive dashboard
    """
    
    def __init__(self, server_url: str = "http://localhost:8000", 
                 monitoring_interval: int = 5):
        self.server_url = server_url.rstrip('/')
        self.monitoring_interval = monitoring_interval
        self.running = False
        
        # Data storage
        self.metrics_history = deque(maxlen=1000)  # Keep last 1000 measurements
        self.alerts = deque(maxlen=100)  # Keep last 100 alerts
        
        # Performance thresholds
        self.thresholds = {
            'response_time_ms': 1000,    # 1 second
            'memory_percent': 85,        # 85% memory usage
            'cache_hit_rate': 0.7,       # 70% hit rate
            'error_rate': 0.05,          # 5% error rate
            'cpu_percent': 80            # 80% CPU usage
        }
        
        # Statistics
        self.stats = {
            'total_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'total_alerts': 0,
            'uptime_start': datetime.now()
        }
        
        # Session for HTTP requests
        self.session = requests.Session()
        self.session.timeout = (2, 5)  # Connect, read timeouts
    
    def start_monitoring(self):
        """Start the monitoring loop."""
        self.running = True
        print(f"🚀 Starting performance monitoring for {self.server_url}")
        print(f"📊 Monitoring interval: {self.monitoring_interval} seconds")
        print("Press Ctrl+C to stop monitoring\n")
        
        try:
            while self.running:
                self.collect_metrics()
                time.sleep(self.monitoring_interval)
        except KeyboardInterrupt:
            self.stop_monitoring()
    
    def stop_monitoring(self):
        """Stop monitoring and generate final report."""
        self.running = False
        print("\n🛑 Stopping performance monitoring...")
        self.generate_final_report()
    
    def collect_metrics(self):
        """Collect comprehensive performance metrics."""
        timestamp = datetime.now()
        metrics = {
            'timestamp': timestamp,
            'system': self.get_system_metrics(),
            'server': self.get_server_metrics(),
            'performance': self.get_performance_metrics()
        }
        
        self.metrics_history.append(metrics)
        self.analyze_metrics(metrics)
        self.display_real_time_status(metrics)
    
    def get_system_metrics(self) -> Dict[str, Any]:
        """Get system-level metrics."""
        try:
            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            return {
                'cpu_percent': cpu_percent,
                'memory_percent': memory.percent,
                'memory_available_mb': memory.available / (1024 * 1024),
                'disk_percent': disk.percent,
                'disk_free_gb': disk.free / (1024 * 1024 * 1024)
            }
        except Exception as e:
            return {'error': str(e)}
    
    def get_server_metrics(self) -> Dict[str, Any]:
        """Get server-specific metrics from health endpoint."""
        try:
            response = self.session.get(f"{self.server_url}/api/health")
            if response.status_code == 200:
                return response.json()
            else:
                return {'error': f'HTTP {response.status_code}'}
        except Exception as e:
            return {'error': str(e)}
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get detailed performance metrics."""
        try:
            # Test response time with a simple chat request
            start_time = time.time()
            response = self.session.post(
                f"{self.server_url}/api/chat",
                json={
                    "question": "Test monitoring query",
                    "role": "student",
                    "subject": "General"
                },
                headers={'Content-Type': 'application/json'}
            )
            response_time = (time.time() - start_time) * 1000  # Convert to ms
            
            self.stats['total_requests'] += 1
            
            if response.status_code == 200:
                self.stats['successful_requests'] += 1
                result = response.json()
                return {
                    'response_time_ms': response_time,
                    'success': True,
                    'latency': result.get('latency', 0),
                    'answer_length': len(result.get('answer', '')),
                    'metadata': result.get('metadata', {})
                }
            else:
                self.stats['failed_requests'] += 1
                return {
                    'response_time_ms': response_time,
                    'success': False,
                    'error': f'HTTP {response.status_code}'
                }
                
        except Exception as e:
            self.stats['failed_requests'] += 1
            return {
                'response_time_ms': None,
                'success': False,
                'error': str(e)
            }
    
    def analyze_metrics(self, metrics: Dict[str, Any]):
        """Analyze metrics and generate alerts if thresholds are breached."""
        timestamp = metrics['timestamp']
        
        # Check response time
        perf = metrics.get('performance', {})
        if perf.get('response_time_ms', 0) > self.thresholds['response_time_ms']:
            self.create_alert(
                'HIGH_RESPONSE_TIME',
                f"Response time {perf['response_time_ms']:.0f}ms exceeds threshold {self.thresholds['response_time_ms']}ms",
                timestamp
            )
        
        # Check memory usage
        system = metrics.get('system', {})
        if system.get('memory_percent', 0) > self.thresholds['memory_percent']:
            self.create_alert(
                'HIGH_MEMORY_USAGE',
                f"Memory usage {system['memory_percent']:.1f}% exceeds threshold {self.thresholds['memory_percent']}%",
                timestamp
            )
        
        # Check CPU usage
        if system.get('cpu_percent', 0) > self.thresholds['cpu_percent']:
            self.create_alert(
                'HIGH_CPU_USAGE',
                f"CPU usage {system['cpu_percent']:.1f}% exceeds threshold {self.thresholds['cpu_percent']}%",
                timestamp
            )
        
        # Check cache hit rate
        server = metrics.get('server', {})
        cache_stats = server.get('cache_stats', {})
        hit_rate = cache_stats.get('hit_rate', 1.0)
        if hit_rate < self.thresholds['cache_hit_rate']:
            self.create_alert(
                'LOW_CACHE_HIT_RATE',
                f"Cache hit rate {hit_rate:.2%} below threshold {self.thresholds['cache_hit_rate']:.2%}",
                timestamp
            )
        
        # Check error rate
        total_requests = self.stats['total_requests']
        if total_requests > 10:  # Only check after sufficient requests
            error_rate = self.stats['failed_requests'] / total_requests
            if error_rate > self.thresholds['error_rate']:
                self.create_alert(
                    'HIGH_ERROR_RATE',
                    f"Error rate {error_rate:.2%} exceeds threshold {self.thresholds['error_rate']:.2%}",
                    timestamp
                )
    
    def create_alert(self, alert_type: str, message: str, timestamp: datetime):
        """Create and log an alert."""
        alert = {
            'type': alert_type,
            'message': message,
            'timestamp': timestamp,
            'severity': self.get_alert_severity(alert_type)
        }
        
        self.alerts.append(alert)
        self.stats['total_alerts'] += 1
        
        # Print alert with appropriate emoji
        severity_emoji = {
            'LOW': '🟡',
            'MEDIUM': '🟠', 
            'HIGH': '🔴',
            'CRITICAL': '🚨'
        }
        
        emoji = severity_emoji.get(alert['severity'], '⚠️')
        print(f"\n{emoji} ALERT [{alert['severity']}] {timestamp.strftime('%H:%M:%S')}: {message}")
    
    def get_alert_severity(self, alert_type: str) -> str:
        """Determine alert severity based on type."""
        severity_map = {
            'HIGH_RESPONSE_TIME': 'MEDIUM',
            'HIGH_MEMORY_USAGE': 'HIGH',
            'HIGH_CPU_USAGE': 'MEDIUM',
            'LOW_CACHE_HIT_RATE': 'LOW',
            'HIGH_ERROR_RATE': 'HIGH'
        }
        return severity_map.get(alert_type, 'MEDIUM')
    
    def display_real_time_status(self, metrics: Dict[str, Any]):
        """Display real-time status in a compact format."""
        timestamp = metrics['timestamp']
        system = metrics.get('system', {})
        server = metrics.get('server', {})
        perf = metrics.get('performance', {})
        
        # Calculate uptime
        uptime = timestamp - self.stats['uptime_start']
        uptime_str = str(uptime).split('.')[0]  # Remove microseconds
        
        # Calculate success rate
        total_req = self.stats['total_requests']
        success_rate = (self.stats['successful_requests'] / total_req * 100) if total_req > 0 else 0
        
        # Get cache stats
        cache_stats = server.get('cache_stats', {})
        hit_rate = cache_stats.get('hit_rate', 0) * 100
        
        # Status line
        status_line = (
            f"⏰ {timestamp.strftime('%H:%M:%S')} | "
            f"🔋 CPU: {system.get('cpu_percent', 0):.1f}% | "
            f"💾 MEM: {system.get('memory_percent', 0):.1f}% | "
            f"⚡ Response: {perf.get('response_time_ms', 0):.0f}ms | "
            f"📊 Cache: {hit_rate:.1f}% | "
            f"✅ Success: {success_rate:.1f}% | "
            f"⏱️  Uptime: {uptime_str}"
        )
        
        print(f"\r{status_line}", end="", flush=True)
        
        # Print newline every 12 iterations (1 minute at 5s intervals)
        if len(self.metrics_history) % 12 == 0:
            print()  # New line for readability
    
    def generate_final_report(self):
        """Generate a comprehensive final report."""
        if not self.metrics_history:
            print("No metrics collected.")
            return
        
        print("\n" + "="*80)
        print("📊 PERFORMANCE MONITORING REPORT")
        print("="*80)
        
        # Basic statistics
        total_time = datetime.now() - self.stats['uptime_start']
        print(f"\n📈 SUMMARY")
        print(f"   Monitoring Duration: {total_time}")
        print(f"   Total Requests: {self.stats['total_requests']}")
        print(f"   Successful Requests: {self.stats['successful_requests']}")
        print(f"   Failed Requests: {self.stats['failed_requests']}")
        print(f"   Success Rate: {(self.stats['successful_requests']/max(self.stats['total_requests'],1)*100):.1f}%")
        print(f"   Total Alerts: {self.stats['total_alerts']}")
        
        # Performance statistics
        response_times = [m['performance'].get('response_time_ms', 0) 
                         for m in self.metrics_history 
                         if m['performance'].get('response_time_ms') is not None]
        
        if response_times:
            print(f"\n⚡ RESPONSE TIME STATISTICS")
            print(f"   Average: {sum(response_times)/len(response_times):.1f}ms")
            print(f"   Min: {min(response_times):.1f}ms")
            print(f"   Max: {max(response_times):.1f}ms")
            print(f"   P95: {sorted(response_times)[int(len(response_times)*0.95)]:.1f}ms")
        
        # System resource usage
        memory_usage = [m['system'].get('memory_percent', 0) for m in self.metrics_history]
        cpu_usage = [m['system'].get('cpu_percent', 0) for m in self.metrics_history]
        
        if memory_usage:
            print(f"\n💾 RESOURCE USAGE")
            print(f"   Memory - Avg: {sum(memory_usage)/len(memory_usage):.1f}% | "
                  f"Peak: {max(memory_usage):.1f}%")
            print(f"   CPU - Avg: {sum(cpu_usage)/len(cpu_usage):.1f}% | "
                  f"Peak: {max(cpu_usage):.1f}%")
        
        # Alert summary
        if self.alerts:
            print(f"\n🚨 ALERT SUMMARY")
            alert_counts = defaultdict(int)
            for alert in self.alerts:
                alert_counts[alert['type']] += 1
            
            for alert_type, count in alert_counts.items():
                print(f"   {alert_type}: {count}")
        
        # Recent alerts
        if self.alerts:
            print(f"\n🔔 RECENT ALERTS (Last 5)")
            for alert in list(self.alerts)[-5:]:
                time_str = alert['timestamp'].strftime('%H:%M:%S')
                print(f"   [{time_str}] {alert['type']}: {alert['message']}")
        
        print("\n" + "="*80)
        print("📋 Report generated at:", datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
        print("="*80)
    
    def run_load_test(self, duration: int = 60, concurrent_requests: int = 5):
        """Run a simple load test against the server."""
        print(f"\n🧪 Running load test for {duration} seconds with {concurrent_requests} concurrent requests...")
        
        start_time = time.time()
        results = []
        
        def make_request():
            """Make a single test request."""
            try:
                start = time.time()
                response = self.session.post(
                    f"{self.server_url}/api/chat",
                    json={
                        "question": f"Load test question at {datetime.now().isoformat()}",
                        "role": "student",
                        "subject": "General"
                    }
                )
                elapsed = time.time() - start
                results.append({
                    'response_time': elapsed,
                    'success': response.status_code == 200,
                    'timestamp': time.time()
                })
            except Exception as e:
                results.append({
                    'response_time': None,
                    'success': False,
                    'error': str(e),
                    'timestamp': time.time()
                })
        
        # Run concurrent requests
        import concurrent.futures
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=concurrent_requests) as executor:
            while time.time() - start_time < duration:
                # Submit batch of requests
                futures = [executor.submit(make_request) for _ in range(concurrent_requests)]
                
                # Wait for completion
                concurrent.futures.wait(futures, timeout=10)
                
                time.sleep(0.1)  # Brief pause between batches
        
        # Analyze results
        if results:
            successful = [r for r in results if r['success']]
            response_times = [r['response_time'] for r in successful if r['response_time']]
            
            print(f"\n📊 LOAD TEST RESULTS")
            print(f"   Total Requests: {len(results)}")
            print(f"   Successful: {len(successful)}")
            print(f"   Success Rate: {len(successful)/len(results)*100:.1f}%")
            
            if response_times:
                print(f"   Avg Response Time: {sum(response_times)/len(response_times)*1000:.1f}ms")
                print(f"   Min Response Time: {min(response_times)*1000:.1f}ms")
                print(f"   Max Response Time: {max(response_times)*1000:.1f}ms")
                print(f"   Requests/Second: {len(successful)/duration:.1f}")


def main():
    """Main function with command line argument parsing."""
    parser = argparse.ArgumentParser(description='Performance Monitor for Intel Classroom Assistant')
    parser.add_argument('--url', default='http://localhost:8000', 
                       help='Server URL (default: http://localhost:8000)')
    parser.add_argument('--interval', type=int, default=5,
                       help='Monitoring interval in seconds (default: 5)')
    parser.add_argument('--load-test', action='store_true',
                       help='Run load test instead of monitoring')
    parser.add_argument('--duration', type=int, default=60,
                       help='Load test duration in seconds (default: 60)')
    parser.add_argument('--concurrent', type=int, default=5,
                       help='Concurrent requests for load test (default: 5)')
    
    args = parser.parse_args()
    
    monitor = PerformanceMonitor(args.url, args.interval)
    
    # Set up signal handler for graceful shutdown
    def signal_handler(signum, frame):
        monitor.stop_monitoring()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        if args.load_test:
            monitor.run_load_test(args.duration, args.concurrent)
        else:
            monitor.start_monitoring()
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
