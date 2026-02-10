import os
import sys

# Override environment
os.environ['PGPASSFILE'] = 'nul'
os.environ['PGSYSCONFDIR'] = 'C:\\tmp'
os.environ['PGCLIENTENCODING'] = 'UTF8'

# Test 1: Check psycopg2 import
try:
    import psycopg2
    print("✓ psycopg2 imported successfully")
except Exception as e:
    print(f"✗ Failed to import psycopg2: {e}")
    sys.exit(1)

# Test 2: Try connection with different methods
print("\nTest 1: DSN string")
try:
    conn = psycopg2.connect("host=127.0.0.1 port=5432 dbname=shar_messenger user=postgres password=postgres")
    print("✓ Connected via DSN")
    conn.close()
except Exception as e:
    print(f"✗ DSN failed: {e}")

print("\nTest 2: Dictionary")
try:
    conn = psycopg2.connect(**{
        'host': '127.0.0.1',
        'port': 5432,
        'database': 'shar_messenger',
        'user': 'postgres',
        'password': 'postgres'
    })
    print("✓ Connected via dict")
    conn.close()
except Exception as e:
    print(f"✗ Dict failed: {e}")

print("\nTest 3: With options parameter")
try:
    conn = psycopg2.connect(
        host='127.0.0.1',
        port=5432,
        database='shar_messenger',
        user='postgres',
        password='postgres',
        options='-c client_encoding=UTF8'
    )
    print("✓ Connected with options")
    conn.close()
except Exception as e:
    print(f"✗ Options failed: {e}")
