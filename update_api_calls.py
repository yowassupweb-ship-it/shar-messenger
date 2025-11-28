import os
import re

# Directories to process - cover all app subdirectories
DIRS = [
    'frontend/src/app',
    'frontend/src/components'
]

def replace_in_file(filepath):
    """Replace fetch calls with apiFetch"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        
        # Replace fetch('http://localhost:8000/api/...
        content = re.sub(
            r"fetch\('http://localhost:8000(/api/[^']+)'\)",
            r"apiFetch('\1')",
            content
        )
        
        # Replace fetch(`http://localhost:8000/api/...
        content = re.sub(
            r'fetch\(`http://localhost:8000(/api/[^`]+)`\)',
            r'apiFetch(`\1`)',
            content
        )
        
        # Add import if needed and content changed
        if content != original:
            if 'apiFetch' in content and 'from \'@/lib/api\'' not in content:
                # Find import section
                import_match = re.search(r"(import .+ from .+\n)+", content)
                if import_match:
                    last_import = import_match.group(0)
                    content = content.replace(
                        last_import,
                        last_import + "import { apiFetch } from '@/lib/api'\n"
                    )
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            
            return True
        return False
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

def main():
    total_files = 0
    updated_files = 0
    
    for directory in DIRS:
        if not os.path.exists(directory):
            continue
            
        for root, _, files in os.walk(directory):
            for file in files:
                if file.endswith(('.tsx', '.ts')):
                    filepath = os.path.join(root, file)
                    total_files += 1
                    
                    if replace_in_file(filepath):
                        updated_files += 1
                        print(f"✓ Updated: {filepath}")
    
    print(f"\nProcessed {total_files} files, updated {updated_files} files")

if __name__ == '__main__':
    main()
