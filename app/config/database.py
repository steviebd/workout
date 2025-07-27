"""
Database configuration utilities.
"""
import os
import psycopg2
from urllib.parse import urlparse

class DatabaseConfig:
    """Database configuration and connection utilities."""
    
    @staticmethod
    def get_database_uri():
        """
        Get database URI with SSL fallback handling.
        
        Returns:
            str: Database connection URI
        """
        database_url = os.environ.get('DATABASE_URL', 'sqlite:///workout.db')
        
        # Handle PostgreSQL SSL connection with fallback
        if 'postgresql' in database_url and '?sslmode=require' in database_url:
            try:
                # Test SSL connection
                parsed = urlparse(database_url)
                test_conn = psycopg2.connect(
                    host=parsed.hostname,
                    port=parsed.port or 5432,
                    database=parsed.path[1:],  # Remove leading slash
                    user=parsed.username,
                    password=parsed.password,
                    sslmode='require'
                )
                test_conn.close()
                return database_url
            except Exception as e:
                print(f"SSL connection failed, falling back to non-SSL: {e}")
                return os.environ.get('DATABASE_URL_NO_SSL', 
                                    database_url.replace('?sslmode=require', ''))
        
        return database_url
    
    @staticmethod
    def get_test_database_uri():
        """
        Get test database URI.
        
        Returns:
            str: Test database connection URI
        """
        return os.environ.get('TEST_DATABASE_URL', 'sqlite:///test_workout.db')
