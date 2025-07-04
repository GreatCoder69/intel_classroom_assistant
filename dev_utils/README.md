# Intel Classroom Assistant - Development Utilities

🛠️ **Development tools and utilities** for testing, benchmarking, and monitoring the Intel Classroom Assistant platform.

## 🌟 Overview

This directory contains development tools, performance analysis scripts, and utilities that help with testing, debugging, and optimizing the Intel Classroom Assistant platform. These tools are designed for developers and system administrators.

## 📁 Directory Contents

### 📊 **Performance Analysis**
- **`performance_monitor.py`** - Real-time system performance monitoring
- **`compare_performance.py`** - Benchmark different server implementations
- **Performance benchmarking scripts** - Test various optimization strategies

### 🧪 **Testing Utilities**
- **Model testing scripts** - Validate AI model functionality
- **API testing tools** - Test backend endpoints and responses
- **Load testing scripts** - Stress test the system under load

### 🔧 **Development Tools**
- **Database utilities** - MongoDB management and migration scripts
- **Data conversion tools** - Convert between different data formats
- **Configuration generators** - Generate config files for different environments

### 📈 **Analytics & Reporting**
- **Usage analytics** - Analyze user interaction patterns
- **Error analysis tools** - Debug and analyze system errors
- **Performance reports** - Generate detailed performance reports

## 🚀 Available Tools

### 1. **Performance Monitor** (`performance_monitor.py`)
Real-time monitoring of system performance and resource usage:

```bash
# Start monitoring dashboard
python performance_monitor.py

# Monitor specific components
python performance_monitor.py --component ai-server
python performance_monitor.py --component database
python performance_monitor.py --component frontend

# Export metrics to file
python performance_monitor.py --export performance_report.json

# Set monitoring intervals
python performance_monitor.py --interval 5  # Check every 5 seconds
```

**Features:**
- Real-time CPU, memory, and disk usage
- AI server response time monitoring
- Database query performance tracking
- Network I/O monitoring
- Custom alert thresholds

### 2. **Performance Comparison** (`compare_performance.py`)
Compare different server implementations and configurations:

```bash
# Compare all AI servers
python compare_performance.py

# Compare specific servers
python compare_performance.py --servers standard,optimized,ultra

# Run with custom test parameters
python compare_performance.py --iterations 50 --concurrent 5

# Test with different workloads
python compare_performance.py --workload heavy
python compare_performance.py --workload light
```

**Metrics Compared:**
- Response time (average, median, 95th percentile)
- Memory usage during operation
- CPU utilization
- Throughput (requests per second)
- Error rates

## 🛠️ Development Workflow

### 🧪 **Testing New Features**

1. **Unit Testing**
   ```bash
   # Run AI model tests
   python test_ai_models.py
   
   # Test API endpoints
   python test_api_endpoints.py
   
   # Database integration tests
   python test_database.py
   ```

2. **Performance Testing**
   ```bash
   # Baseline performance test
   python compare_performance.py --baseline
   
   # Test with new optimization
   python compare_performance.py --test-build
   
   # Compare results
   python compare_performance.py --compare baseline test-build
   ```

3. **Load Testing**
   ```bash
   # Simulate high user load
   python load_test.py --users 100 --duration 300
   
   # Test specific endpoints
   python load_test.py --endpoint /api/chat --users 50
   ```

### 📊 **Performance Analysis Workflow**

1. **Collect Baseline Metrics**
   ```bash
   python performance_monitor.py --duration 3600 --export baseline.json
   ```

2. **Apply Optimizations**
   ```bash
   # Test configuration changes
   python test_config_changes.py --config optimized.json
   ```

3. **Compare Results**
   ```bash
   python compare_performance.py --before baseline.json --after optimized.json
   ```

## 🔧 Configuration & Setup

### 📋 **Prerequisites**
```bash
# Install development dependencies
pip install -r requirements_dev.txt

# Additional tools for monitoring
pip install psutil matplotlib seaborn pandas

# Performance profiling tools
pip install memory-profiler line-profiler
```

### ⚙️ **Configuration Files**

Create `dev_config.json` for development settings:
```json
{
  "monitoring": {
    "enabled": true,
    "interval": 10,
    "metrics": ["cpu", "memory", "disk", "network"],
    "alerts": {
      "memory_threshold": 80,
      "cpu_threshold": 90,
      "response_time_threshold": 5.0
    }
  },
  "testing": {
    "default_iterations": 100,
    "concurrent_requests": 10,
    "timeout": 30
  },
  "servers": {
    "ai_server_url": "http://localhost:8000",
    "backend_url": "http://localhost:8080",
    "frontend_url": "http://localhost:5173"
  }
}
```

## 📈 Monitoring & Analytics

### 🎯 **Key Performance Indicators**

1. **Response Time Metrics**
   - Average response time per endpoint
   - 95th percentile response times
   - Response time trends over time

2. **Resource Utilization**
   - CPU usage by component
   - Memory consumption patterns
   - Disk I/O performance
   - Network bandwidth usage

3. **Error Tracking**
   - Error rates by endpoint
   - Error categorization
   - Error resolution time

### 📊 **Visualization Tools**

```bash
# Generate performance charts
python generate_charts.py --data performance_data.json

# Create dashboard
python monitoring_dashboard.py --port 8002

# Export reports
python generate_reports.py --format pdf --output performance_report.pdf
```

## 🐛 Debugging Tools

### 🔍 **Log Analysis**
```bash
# Analyze error patterns
python analyze_logs.py --log-file ../backend/servers/logs/classroom_assistant.log

# Search for specific issues
python log_search.py --pattern "memory error" --timeframe "last 24h"

# Generate error summary
python error_summary.py --output error_report.html
```

### 🧠 **AI Model Debugging**
```bash
# Test model inference
python test_model_inference.py --model-path ../backend/servers/model_cache/

# Analyze model performance
python model_performance_analysis.py

# Test different prompts
python prompt_testing.py --test-file test_prompts.json
```

### 🗄️ **Database Tools**
```bash
# Database health check
python db_health_check.py

# Query performance analysis
python analyze_db_queries.py

# Data integrity check
python data_integrity_check.py
```

## 🚀 Automation Scripts

### 🔄 **Continuous Integration**
```bash
# Pre-commit performance check
python pre_commit_perf_check.py

# Automated testing pipeline
python ci_test_suite.py

# Performance regression detection
python regression_detector.py --baseline baseline.json
```

### 📦 **Deployment Helpers**
```bash
# Environment setup
python setup_dev_environment.py

# Configuration validation
python validate_config.py --config production.json

# Deployment readiness check
python deployment_readiness.py
```

## 📚 Utility Functions

### 🔧 **Common Development Tasks**

1. **Reset Development Environment**
   ```bash
   python reset_dev_env.py
   # Clears caches, resets databases, restarts services
   ```

2. **Generate Test Data**
   ```bash
   python generate_test_data.py --users 100 --subjects 20
   ```

3. **Backup and Restore**
   ```bash
   python backup_data.py --output backup_$(date +%Y%m%d).tar.gz
   python restore_data.py --input backup_20250705.tar.gz
   ```

## 🤝 Contributing

### 📝 **Adding New Tools**

1. **Create Tool Script**
   - Follow naming convention: `tool_name.py`
   - Add comprehensive docstrings
   - Include command-line argument parsing
   - Add error handling and logging

2. **Add Documentation**
   - Update this README with tool description
   - Add usage examples
   - Document configuration options

3. **Testing**
   - Create test cases for the tool
   - Verify tool works in different environments
   - Add integration tests if applicable

### 🎯 **Best Practices**

- **Modular Design** - Create reusable utility functions
- **Error Handling** - Robust error handling and logging
- **Configuration** - Use configuration files for flexibility
- **Documentation** - Clear documentation and examples
- **Testing** - Include unit tests for complex tools

## 📖 Additional Resources

### 🔗 **External Tools**
- **[Grafana](https://grafana.com/)** - Advanced monitoring dashboards
- **[Prometheus](https://prometheus.io/)** - Metrics collection and alerting
- **[JMeter](https://jmeter.apache.org/)** - Load testing tool
- **[New Relic](https://newrelic.com/)** - Application performance monitoring

### 📚 **Documentation**
- **[Python Profiling](https://docs.python.org/3/library/profile.html)** - Performance profiling
- **[MongoDB Profiler](https://docs.mongodb.com/manual/tutorial/manage-the-database-profiler/)** - Database profiling
- **[Flask Testing](https://flask.palletsprojects.com/en/2.0.x/testing/)** - Flask application testing

For more information, see the main project [Contributing Guide](../README.md#contributing).
