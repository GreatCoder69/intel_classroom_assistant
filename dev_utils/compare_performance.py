"""
Model Optimization Comparison Script

This script helps you compare performance between the original and optimized
versions of the Intel Classroom Assistant.
"""

import subprocess
import time
import requests
import json
import psutil
import sys
from datetime import datetime
from typing import Dict, List, Tuple

class PerformanceComparator:
    """
    Compare performance between original and optimized servers.
    """
    
    def __init__(self):
        """Initialize the performance comparator."""
        self.original_port = 8000
        self.optimized_port = 8001
        self.test_questions = [
            "What is photosynthesis?",
            "Explain Newton's first law of motion",
            "How do you calculate the area of a triangle?",
            "What causes the seasons to change?",
            "Describe the water cycle process"
        ]
    
    def test_server_performance(self, port: int, server_name: str) -> Dict:
        """
        Test performance of a specific server.
        
        Args:
            port (int): Server port number
            server_name (str): Name identifier for the server
            
        Returns:
            Dict: Performance metrics
        """
        print(f"\n🧪 Testing {server_name} server on port {port}...")
        
        base_url = f"http://localhost:{port}/api"
        metrics = {
            "server_name": server_name,
            "port": port,
            "response_times": [],
            "memory_usage": [],
            "success_count": 0,
            "error_count": 0,
            "total_response_length": 0
        }
        
        # Check if server is running
        try:
            health_response = requests.get(f"{base_url}/health", timeout=5)
            if health_response.status_code != 200:
                print(f"❌ {server_name} server health check failed")
                return metrics
        except requests.exceptions.RequestException:
            print(f"❌ {server_name} server is not responding")
            return metrics
        
        print(f"✅ {server_name} server is healthy")
        
        # Test each question
        for i, question in enumerate(self.test_questions):
            print(f"  📝 Testing question {i+1}/{len(self.test_questions)}: {question[:30]}...")
            
            # Record memory before request
            mem_before = psutil.virtual_memory().percent
            
            start_time = time.time()
            try:
                response = requests.post(
                    f"{base_url}/query",
                    json={"question": question, "role": "student"},
                    timeout=30
                )
                response_time = time.time() - start_time
                
                if response.status_code == 200:
                    data = response.json()
                    answer = data.get("answer", "")
                    
                    metrics["response_times"].append(response_time)
                    metrics["success_count"] += 1
                    metrics["total_response_length"] += len(answer)
                    
                    print(f"    ✅ Success in {response_time:.2f}s ({len(answer)} chars)")
                else:
                    metrics["error_count"] += 1
                    print(f"    ❌ HTTP {response.status_code}")
                    
            except requests.exceptions.Timeout:
                metrics["error_count"] += 1
                print(f"    ⏰ Timeout after 30s")
            except Exception as e:
                metrics["error_count"] += 1
                print(f"    ❌ Error: {str(e)}")
            
            # Record memory after request
            mem_after = psutil.virtual_memory().percent
            metrics["memory_usage"].append(mem_after - mem_before)
            
            # Small delay between requests
            time.sleep(1)
        
        # Calculate summary statistics
        if metrics["response_times"]:
            metrics["avg_response_time"] = sum(metrics["response_times"]) / len(metrics["response_times"])
            metrics["min_response_time"] = min(metrics["response_times"])
            metrics["max_response_time"] = max(metrics["response_times"])
            metrics["success_rate"] = metrics["success_count"] / (metrics["success_count"] + metrics["error_count"]) * 100
            metrics["avg_response_length"] = metrics["total_response_length"] / metrics["success_count"] if metrics["success_count"] > 0 else 0
            metrics["avg_memory_delta"] = sum(metrics["memory_usage"]) / len(metrics["memory_usage"]) if metrics["memory_usage"] else 0
        
        print(f"📊 {server_name} Results:")
        print(f"   Success Rate: {metrics.get('success_rate', 0):.1f}%")
        print(f"   Avg Response Time: {metrics.get('avg_response_time', 0):.2f}s")
        print(f"   Avg Response Length: {metrics.get('avg_response_length', 0):.0f} chars")
        
        return metrics
    
    def compare_servers(self) -> Dict:
        """
        Compare performance between original and optimized servers.
        
        Returns:
            Dict: Comparison results
        """
        print("🔄 Starting Performance Comparison")
        print("=" * 50)
        
        # Test original server
        original_metrics = self.test_server_performance(self.original_port, "Original")
        
        # Test optimized server
        optimized_metrics = self.test_server_performance(self.optimized_port, "Optimized")
        
        # Generate comparison
        comparison = {
            "original": original_metrics,
            "optimized": optimized_metrics,
            "timestamp": datetime.now().isoformat()
        }
        
        # Calculate improvements
        if (original_metrics.get("avg_response_time", 0) > 0 and 
            optimized_metrics.get("avg_response_time", 0) > 0):
            
            speed_improvement = (
                (original_metrics["avg_response_time"] - optimized_metrics["avg_response_time"]) /
                original_metrics["avg_response_time"] * 100
            )
            
            comparison["improvements"] = {
                "speed_improvement_percent": speed_improvement,
                "memory_efficiency": (
                    original_metrics.get("avg_memory_delta", 0) - 
                    optimized_metrics.get("avg_memory_delta", 0)
                )
            }
        
        return comparison
    
    def print_comparison_report(self, comparison: Dict):
        """
        Print a formatted comparison report.
        
        Args:
            comparison (Dict): Comparison results
        """
        print("\n" + "=" * 60)
        print("📊 PERFORMANCE COMPARISON REPORT")
        print("=" * 60)
        
        original = comparison["original"]
        optimized = comparison["optimized"]
        
        print(f"\n📈 RESPONSE TIME COMPARISON:")
        print(f"   Original:  {original.get('avg_response_time', 0):.2f}s (avg)")
        print(f"   Optimized: {optimized.get('avg_response_time', 0):.2f}s (avg)")
        
        if "improvements" in comparison:
            improvements = comparison["improvements"]
            speed_improvement = improvements.get("speed_improvement_percent", 0)
            
            if speed_improvement > 0:
                print(f"   🚀 IMPROVEMENT: {speed_improvement:.1f}% faster!")
            elif speed_improvement < 0:
                print(f"   ⚠️  REGRESSION: {abs(speed_improvement):.1f}% slower")
            else:
                print(f"   ➡️  Similar performance")
        
        print(f"\n📊 SUCCESS RATE COMPARISON:")
        print(f"   Original:  {original.get('success_rate', 0):.1f}%")
        print(f"   Optimized: {optimized.get('success_rate', 0):.1f}%")
        
        print(f"\n💾 MEMORY USAGE COMPARISON:")
        print(f"   Original:  {original.get('avg_memory_delta', 0):.1f}% delta")
        print(f"   Optimized: {optimized.get('avg_memory_delta', 0):.1f}% delta")
        
        print(f"\n📝 RESPONSE QUALITY COMPARISON:")
        print(f"   Original:  {original.get('avg_response_length', 0):.0f} chars (avg)")
        print(f"   Optimized: {optimized.get('avg_response_length', 0):.0f} chars (avg)")
        
        print("\n" + "=" * 60)
        print(f"Report generated at: {comparison['timestamp']}")
        print("=" * 60)
    
    def save_comparison_report(self, comparison: Dict, filename: str = "performance_comparison.json"):
        """
        Save comparison results to a JSON file.
        
        Args:
            comparison (Dict): Comparison results
            filename (str): Output filename
        """
        with open(filename, 'w') as f:
            json.dump(comparison, f, indent=2)
        print(f"\n💾 Detailed results saved to: {filename}")

def main():
    """Main function to run the performance comparison."""
    print("🔧 Intel Classroom Assistant - Performance Comparison Tool")
    print("This tool compares the original vs optimized server performance")
    print("\nIMPORTANT: Make sure both servers are running before starting!")
    print("- Original server should be running on port 8000")
    print("- Optimized server should be running on port 8001")
    
    input("\nPress Enter to continue when both servers are ready...")
    
    comparator = PerformanceComparator()
    
    try:
        # Run comparison
        comparison_results = comparator.compare_servers()
        
        # Print report
        comparator.print_comparison_report(comparison_results)
        
        # Save detailed results
        comparator.save_comparison_report(comparison_results)
        
    except KeyboardInterrupt:
        print("\n⏹️ Comparison interrupted by user")
    except Exception as e:
        print(f"\n❌ Error during comparison: {str(e)}")
    
    print("\n🏁 Performance comparison completed!")

if __name__ == "__main__":
    main()
