#!/usr/bin/env python3
"""
Deployment and Management Script for Ultra-Optimized Intel Classroom Assistant

This script provides easy deployment, management, and monitoring capabilities
for the ultra-optimized Flask server.
"""

import os
import sys
import subprocess
import time
import json
import argparse
import signal
import threading
from pathlib import Path
from typing import Dict, List, Optional

class ServerManager:
    """
    Comprehensive server management system for deployment, monitoring, and maintenance.
    """
    
    def __init__(self, server_dir: str = None):
        self.server_dir = Path(server_dir) if server_dir else Path(__file__).parent
        self.server_process = None
        self.monitor_process = None
        self.config = self.load_config()
        
    def load_config(self) -> Dict:
        """Load configuration from environment and config files."""
        config = {
            'server_port': int(os.environ.get('SERVER_PORT', 8000)),
            'server_host': os.environ.get('SERVER_HOST', '0.0.0.0'),
            'flask_env': os.environ.get('FLASK_ENV', 'production'),
            'log_level': os.environ.get('LOG_LEVEL', 'INFO'),
            'workers': int(os.environ.get('WORKERS', 4)),
            'max_memory_mb': int(os.environ.get('MAX_MEMORY_MB', 2048)),
            'cache_size': int(os.environ.get('CACHE_SIZE', 1000)),
            'model_id': os.environ.get('MODEL_ID', 'OpenVINO/DeepSeek-R1-Distill-Qwen-1.5B-int4-ov')
        }
        
        # Load from config file if exists
        config_file = self.server_dir / 'config.json'
        if config_file.exists():
            with open(config_file, 'r') as f:
                file_config = json.load(f)
                config.update(file_config)
        
        return config
    
    def install_dependencies(self, force: bool = False):
        """Install required dependencies."""
        print("📦 Installing dependencies...")
        
        requirements_file = self.server_dir / 'requirements_ultra_optimized.txt'
        
        if not requirements_file.exists():
            print("❌ Requirements file not found!")
            return False
        
        cmd = [sys.executable, '-m', 'pip', 'install', '-r', str(requirements_file)]
        
        if force:
            cmd.append('--force-reinstall')
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, cwd=self.server_dir)
            
            if result.returncode == 0:
                print("✅ Dependencies installed successfully")
                return True
            else:
                print(f"❌ Dependency installation failed: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"❌ Error installing dependencies: {e}")
            return False
    
    def check_dependencies(self) -> bool:
        """Check if all required dependencies are installed."""
        print("🔍 Checking dependencies...")
        
        required_packages = [
            'flask', 'flask-cors', 'requests', 'psutil', 
            'transformers', 'optimum', 'torch', 'numpy'
        ]
        
        missing_packages = []
        
        for package in required_packages:
            try:
                __import__(package.replace('-', '_'))
            except ImportError:
                missing_packages.append(package)
        
        if missing_packages:
            print(f"❌ Missing packages: {', '.join(missing_packages)}")
            return False
        else:
            print("✅ All dependencies are installed")
            return True
    
    def start_server(self, background: bool = False, with_monitor: bool = False):
        """Start the ultra-optimized server."""
        if self.server_process and self.server_process.poll() is None:
            print("⚠️  Server is already running")
            return True
        
        print("🚀 Starting ultra-optimized server...")
        
        # Prepare environment
        env = os.environ.copy()
        env.update({
            'FLASK_ENV': self.config['flask_env'],
            'SERVER_PORT': str(self.config['server_port']),
            'SERVER_HOST': self.config['server_host'],
            'PYTHONPATH': str(self.server_dir)
        })
        
        # Server command
        server_script = self.server_dir / 'ultra_optimized_server.py'
        if not server_script.exists():
            print(f"❌ Server script not found: {server_script}")
            return False
        
        cmd = [sys.executable, str(server_script)]
        
        try:
            if background:
                # Start in background
                self.server_process = subprocess.Popen(
                    cmd,
                    env=env,
                    cwd=self.server_dir,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE
                )
                print(f"✅ Server started in background (PID: {self.server_process.pid})")
                
                # Wait a moment and check if it's still running
                time.sleep(2)
                if self.server_process.poll() is not None:
                    stdout, stderr = self.server_process.communicate()
                    print(f"❌ Server failed to start: {stderr.decode()}")
                    return False
                
            else:
                # Start in foreground
                self.server_process = subprocess.Popen(cmd, env=env, cwd=self.server_dir)
                print(f"✅ Server started (PID: {self.server_process.pid})")
                
                # Start monitor if requested
                if with_monitor:
                    time.sleep(3)  # Give server time to start
                    self.start_monitor(background=True)
                
                # Wait for server
                self.server_process.wait()
            
            return True
            
        except Exception as e:
            print(f"❌ Error starting server: {e}")
            return False
    
    def stop_server(self):
        """Stop the running server."""
        if not self.server_process or self.server_process.poll() is not None:
            print("⚠️  Server is not running")
            return True
        
        print("🛑 Stopping server...")
        
        try:
            # Graceful shutdown
            self.server_process.terminate()
            
            # Wait for graceful shutdown
            try:
                self.server_process.wait(timeout=10)
                print("✅ Server stopped gracefully")
            except subprocess.TimeoutExpired:
                # Force kill if necessary
                print("⚠️  Forcing server shutdown...")
                self.server_process.kill()
                self.server_process.wait()
                print("✅ Server force stopped")
            
            self.server_process = None
            return True
            
        except Exception as e:
            print(f"❌ Error stopping server: {e}")
            return False
    
    def restart_server(self, with_monitor: bool = False):
        """Restart the server."""
        print("🔄 Restarting server...")
        self.stop_server()
        time.sleep(2)
        return self.start_server(background=True, with_monitor=with_monitor)
    
    def start_monitor(self, background: bool = False):
        """Start the performance monitor."""
        if self.monitor_process and self.monitor_process.poll() is None:
            print("⚠️  Monitor is already running")
            return True
        
        print("📊 Starting performance monitor...")
        
        monitor_script = self.server_dir / 'performance_monitor.py'
        if not monitor_script.exists():
            print(f"❌ Monitor script not found: {monitor_script}")
            return False
        
        server_url = f"http://{self.config['server_host']}:{self.config['server_port']}"
        cmd = [sys.executable, str(monitor_script), '--url', server_url]
        
        try:
            if background:
                self.monitor_process = subprocess.Popen(
                    cmd,
                    cwd=self.server_dir,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE
                )
                print(f"✅ Monitor started in background (PID: {self.monitor_process.pid})")
            else:
                self.monitor_process = subprocess.Popen(cmd, cwd=self.server_dir)
                print(f"✅ Monitor started (PID: {self.monitor_process.pid})")
                self.monitor_process.wait()
            
            return True
            
        except Exception as e:
            print(f"❌ Error starting monitor: {e}")
            return False
    
    def stop_monitor(self):
        """Stop the performance monitor."""
        if not self.monitor_process or self.monitor_process.poll() is not None:
            print("⚠️  Monitor is not running")
            return True
        
        print("🛑 Stopping monitor...")
        
        try:
            self.monitor_process.terminate()
            self.monitor_process.wait(timeout=5)
            print("✅ Monitor stopped")
            self.monitor_process = None
            return True
            
        except subprocess.TimeoutExpired:
            self.monitor_process.kill()
            self.monitor_process.wait()
            print("✅ Monitor force stopped")
            self.monitor_process = None
            return True
            
        except Exception as e:
            print(f"❌ Error stopping monitor: {e}")
            return False
    
    def get_status(self) -> Dict:
        """Get comprehensive status of all components."""
        status = {
            'server': {
                'running': self.server_process and self.server_process.poll() is None,
                'pid': self.server_process.pid if self.server_process else None
            },
            'monitor': {
                'running': self.monitor_process and self.monitor_process.poll() is None,
                'pid': self.monitor_process.pid if self.monitor_process else None
            },
            'config': self.config
        }
        
        # Try to get server health
        if status['server']['running']:
            try:
                import requests
                response = requests.get(
                    f"http://{self.config['server_host']}:{self.config['server_port']}/api/health",
                    timeout=3
                )
                if response.status_code == 200:
                    status['health'] = response.json()
                else:
                    status['health'] = {'error': f'HTTP {response.status_code}'}
            except Exception as e:
                status['health'] = {'error': str(e)}
        
        return status
    
    def print_status(self):
        """Print formatted status information."""
        status = self.get_status()
        
        print("\n" + "="*50)
        print("🔍 INTEL CLASSROOM ASSISTANT STATUS")
        print("="*50)
        
        # Server status
        server_emoji = "🟢" if status['server']['running'] else "🔴"
        print(f"\n🖥️  SERVER: {server_emoji}")
        if status['server']['running']:
            print(f"   PID: {status['server']['pid']}")
            print(f"   URL: http://{self.config['server_host']}:{self.config['server_port']}")
        else:
            print("   Status: Not running")
        
        # Monitor status
        monitor_emoji = "🟢" if status['monitor']['running'] else "🔴"
        print(f"\n📊 MONITOR: {monitor_emoji}")
        if status['monitor']['running']:
            print(f"   PID: {status['monitor']['pid']}")
        else:
            print("   Status: Not running")
        
        # Health status
        if 'health' in status:
            health = status['health']
            if 'error' in health:
                print(f"\n❌ HEALTH: Error - {health['error']}")
            else:
                health_emoji = "🟢" if health.get('status') == 'healthy' else "🟡"
                print(f"\n💚 HEALTH: {health_emoji} {health.get('status', 'unknown')}")
                
                if 'memory' in health:
                    mem = health['memory']
                    print(f"   Memory: {mem.get('percent_used', 0):.1f}% used")
                
                if 'components' in health:
                    comp = health['components']
                    print(f"   LLM: {comp.get('llm', 'unknown')}")
        
        print("\n" + "="*50)
    
    def run_load_test(self, duration: int = 60, concurrent: int = 5):
        """Run a load test against the server."""
        monitor_script = self.server_dir / 'performance_monitor.py'
        if not monitor_script.exists():
            print(f"❌ Monitor script not found: {monitor_script}")
            return False
        
        server_url = f"http://{self.config['server_host']}:{self.config['server_port']}"
        cmd = [
            sys.executable, str(monitor_script),
            '--url', server_url,
            '--load-test',
            '--duration', str(duration),
            '--concurrent', str(concurrent)
        ]
        
        try:
            subprocess.run(cmd, cwd=self.server_dir)
            return True
        except Exception as e:
            print(f"❌ Error running load test: {e}")
            return False
    
    def cleanup(self):
        """Clean up processes and resources."""
        print("🧹 Cleaning up...")
        self.stop_monitor()
        self.stop_server()
        print("✅ Cleanup complete")


def main():
    """Main function with command line interface."""
    parser = argparse.ArgumentParser(description='Intel Classroom Assistant Server Manager')
    parser.add_argument('--server-dir', help='Server directory path')
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Install command
    install_parser = subparsers.add_parser('install', help='Install dependencies')
    install_parser.add_argument('--force', action='store_true', help='Force reinstall')
    
    # Start command
    start_parser = subparsers.add_parser('start', help='Start server')
    start_parser.add_argument('--background', '-b', action='store_true', help='Run in background')
    start_parser.add_argument('--with-monitor', '-m', action='store_true', help='Start with monitor')
    
    # Stop command
    subparsers.add_parser('stop', help='Stop server')
    
    # Restart command
    restart_parser = subparsers.add_parser('restart', help='Restart server')
    restart_parser.add_argument('--with-monitor', '-m', action='store_true', help='Start with monitor')
    
    # Status command
    subparsers.add_parser('status', help='Show status')
    
    # Monitor command
    monitor_parser = subparsers.add_parser('monitor', help='Start performance monitor')
    monitor_parser.add_argument('--background', '-b', action='store_true', help='Run in background')
    
    # Load test command
    loadtest_parser = subparsers.add_parser('loadtest', help='Run load test')
    loadtest_parser.add_argument('--duration', type=int, default=60, help='Test duration (seconds)')
    loadtest_parser.add_argument('--concurrent', type=int, default=5, help='Concurrent requests')
    
    # Check command
    subparsers.add_parser('check', help='Check dependencies')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # Initialize manager
    manager = ServerManager(args.server_dir)
    
    # Set up signal handlers for cleanup
    def signal_handler(signum, frame):
        print(f"\n🛑 Received signal {signum}, cleaning up...")
        manager.cleanup()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        # Execute commands
        if args.command == 'install':
            success = manager.install_dependencies(force=args.force)
            sys.exit(0 if success else 1)
            
        elif args.command == 'check':
            success = manager.check_dependencies()
            sys.exit(0 if success else 1)
            
        elif args.command == 'start':
            success = manager.start_server(
                background=args.background, 
                with_monitor=args.with_monitor
            )
            sys.exit(0 if success else 1)
            
        elif args.command == 'stop':
            success = manager.stop_server()
            sys.exit(0 if success else 1)
            
        elif args.command == 'restart':
            success = manager.restart_server(with_monitor=args.with_monitor)
            sys.exit(0 if success else 1)
            
        elif args.command == 'status':
            manager.print_status()
            
        elif args.command == 'monitor':
            success = manager.start_monitor(background=args.background)
            sys.exit(0 if success else 1)
            
        elif args.command == 'loadtest':
            success = manager.run_load_test(
                duration=args.duration,
                concurrent=args.concurrent
            )
            sys.exit(0 if success else 1)
            
    except Exception as e:
        print(f"❌ Command failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
