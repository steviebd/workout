"""
Configuration management for the workout tracker app.

This module provides different configuration classes for different environments
and utilities for loading environment-specific settings.
"""
import os
from typing import Type
from .base import BaseConfig
from .development import DevelopmentConfig
from .production import ProductionConfig
from .testing import TestingConfig

# Configuration mapping
config_map = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}

def get_config(config_name: str = None) -> Type[BaseConfig]:
    """
    Get configuration class based on environment.
    
    Args:
        config_name: Name of the configuration to load
        
    Returns:
        Configuration class for the specified environment
    """
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'default')
    
    return config_map.get(config_name, DevelopmentConfig)
