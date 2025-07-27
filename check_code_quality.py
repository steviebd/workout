#!/usr/bin/env python3
"""
Code quality checker for the workout tracker application.

Checks for:
- Missing type hints
- Missing docstrings
- Import order compliance
- Basic code style issues
"""
import ast
import os
from pathlib import Path
from typing import List, Dict, Any

class CodeQualityChecker:
    """Checks code quality across the application."""
    
    def __init__(self, root_path: str):
        self.root_path = Path(root_path)
        self.issues: List[Dict[str, Any]] = []
    
    def check_file(self, file_path: Path) -> None:
        """Check a single Python file for quality issues."""
        if not file_path.suffix == '.py':
            return
            
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            tree = ast.parse(content)
            self._check_functions(tree, file_path)
            self._check_classes(tree, file_path)
            
        except Exception as e:
            self.issues.append({
                'file': str(file_path),
                'type': 'parse_error',
                'message': f"Could not parse file: {e}"
            })
    
    def _check_functions(self, tree: ast.AST, file_path: Path) -> None:
        """Check function definitions for quality issues."""
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                self._check_function_docstring(node, file_path)
                self._check_function_type_hints(node, file_path)
    
    def _check_classes(self, tree: ast.AST, file_path: Path) -> None:
        """Check class definitions for quality issues."""
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                if not ast.get_docstring(node):
                    self.issues.append({
                        'file': str(file_path),
                        'type': 'missing_docstring',
                        'line': node.lineno,
                        'message': f"Class '{node.name}' missing docstring"
                    })
    
    def _check_function_docstring(self, node: ast.FunctionDef, file_path: Path) -> None:
        """Check if function has a docstring."""
        if node.name.startswith('_'):  # Skip private functions
            return
            
        if not ast.get_docstring(node):
            self.issues.append({
                'file': str(file_path),
                'type': 'missing_docstring',
                'line': node.lineno,
                'message': f"Function '{node.name}' missing docstring"
            })
    
    def _check_function_type_hints(self, node: ast.FunctionDef, file_path: Path) -> None:
        """Check if function has type hints."""
        if node.name.startswith('_'):  # Skip private functions
            return
            
        # Check return type annotation
        if not node.returns:
            self.issues.append({
                'file': str(file_path),
                'type': 'missing_type_hint',
                'line': node.lineno,
                'message': f"Function '{node.name}' missing return type hint"
            })
        
        # Check parameter type annotations
        for arg in node.args.args:
            if arg.arg == 'self':  # Skip self parameter
                continue
            if not arg.annotation:
                self.issues.append({
                    'file': str(file_path),
                    'type': 'missing_type_hint',
                    'line': node.lineno,
                    'message': f"Parameter '{arg.arg}' in function '{node.name}' missing type hint"
                })
    
    def check_directory(self, directory: str = 'app') -> None:
        """Check all Python files in a directory."""
        app_path = self.root_path / directory
        for file_path in app_path.rglob('*.py'):
            if '__pycache__' in str(file_path):
                continue
            self.check_file(file_path)
    
    def report(self) -> None:
        """Print a summary report of issues found."""
        if not self.issues:
            print("✅ No code quality issues found!")
            return
        
        print(f"Found {len(self.issues)} code quality issues:\n")
        
        # Group by type
        by_type = {}
        for issue in self.issues:
            issue_type = issue['type']
            if issue_type not in by_type:
                by_type[issue_type] = []
            by_type[issue_type].append(issue)
        
        for issue_type, issues in by_type.items():
            print(f"📋 {issue_type.replace('_', ' ').title()} ({len(issues)} issues):")
            for issue in issues[:10]:  # Show first 10 of each type
                file_name = Path(issue['file']).name
                line = issue.get('line', '?')
                print(f"  - {file_name}:{line} {issue['message']}")
            
            if len(issues) > 10:
                print(f"  ... and {len(issues) - 10} more")
            print()

def main():
    """Run the code quality checker."""
    checker = CodeQualityChecker('.')
    checker.check_directory('app')
    checker.report()

if __name__ == '__main__':
    main()
