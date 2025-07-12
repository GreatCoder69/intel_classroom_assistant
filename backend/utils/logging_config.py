import logging
import logging.config
import os
from logging.handlers import RotatingFileHandler
from datetime import datetime

def setup_logging():
    """Configure optimized logging for Intel Classroom Assistant"""
    
    # Create logs directory if it doesn't exist
    log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs')
    os.makedirs(log_dir, exist_ok=True)
    
    # Logging configuration
    LOGGING_CONFIG = {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'detailed': {
                'format': '%(asctime)s [%(levelname)s] %(name)s: %(message)s',
                'datefmt': '%Y-%m-%d %H:%M:%S'
            },
            'simple': {
                'format': '%(levelname)s: %(message)s'
            },
            'json': {
                'format': '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "message": "%(message)s"}',
                'datefmt': '%Y-%m-%d %H:%M:%S'
            }
        },
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
                'level': 'INFO',
                'formatter': 'detailed',
                'stream': 'ext://sys.stdout'
            },
            'file': {
                'class': 'logging.handlers.RotatingFileHandler',
                'level': 'DEBUG',
                'formatter': 'detailed',
                'filename': os.path.join(log_dir, 'app.log'),
                'maxBytes': 10485760,  # 10MB
                'backupCount': 5
            },
            'chat_file': {
                'class': 'logging.handlers.RotatingFileHandler',
                'level': 'INFO',
                'formatter': 'json',
                'filename': os.path.join(log_dir, 'chat_activity.log'),
                'maxBytes': 10485760,  # 10MB
                'backupCount': 3
            },
            'error_file': {
                'class': 'logging.handlers.RotatingFileHandler',
                'level': 'ERROR',
                'formatter': 'detailed',
                'filename': os.path.join(log_dir, 'errors.log'),
                'maxBytes': 10485760,  # 10MB
                'backupCount': 5
            }
        },
        'loggers': {
            '': {  # Root logger
                'handlers': ['console', 'file', 'error_file'],
                'level': 'INFO',
                'propagate': False
            },
            'chat': {
                'handlers': ['chat_file', 'console'],
                'level': 'INFO',
                'propagate': False
            },
            'flask': {
                'handlers': ['file'],
                'level': 'WARNING',
                'propagate': False
            },
            'werkzeug': {
                'handlers': ['file'],
                'level': 'WARNING',
                'propagate': False
            },
            'transformers': {
                'handlers': ['file'],
                'level': 'ERROR',
                'propagate': False
            },
            'optimum': {
                'handlers': ['file'],
                'level': 'ERROR',
                'propagate': False
            },
            'urllib3': {
                'handlers': ['file'],
                'level': 'WARNING',
                'propagate': False
            }
        }
    }
    
    logging.config.dictConfig(LOGGING_CONFIG)
    
    # Create specialized loggers
    main_logger = logging.getLogger('intel_classroom_assistant')
    chat_logger = logging.getLogger('chat')
    
    main_logger.info("🚀 Intel Classroom Assistant logging initialized")
    return main_logger, chat_logger

def get_logger(name='intel_classroom_assistant'):
    """Get a logger instance"""
    return logging.getLogger(name)

def log_chat_message(user_email, subject, question, response_time=None, success=True):
    """Log chat message activity"""
    chat_logger = logging.getLogger('chat')
    
    log_data = {
        'timestamp': datetime.now().isoformat(),
        'user_email': user_email[:3] + '***' if user_email else 'unknown',
        'subject': subject,
        'question_length': len(question) if question else 0,
        'response_time': response_time,
        'success': success,
        'event': 'chat_message'
    }
    
    if success:
        chat_logger.info(f"💬 Chat message sent: {log_data}")
    else:
        chat_logger.error(f"❌ Chat message failed: {log_data}")

def log_ai_response(response_length, processing_time=None, model_used=None):
    """Log AI response generation"""
    chat_logger = logging.getLogger('chat')
    
    log_data = {
        'timestamp': datetime.now().isoformat(),
        'response_length': response_length,
        'processing_time': processing_time,
        'model_used': model_used,
        'event': 'ai_response_generated'
    }
    
    chat_logger.info(f"🤖 AI response generated: {log_data}")
