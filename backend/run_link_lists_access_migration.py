#!/usr/bin/env python3
"""
Миграция: добавляет поля доступа для списков ссылок в PostgreSQL.
"""

import os
from dotenv import load_dotenv

load_dotenv()
os.environ['USE_POSTGRES'] = 'true'

from db_postgres import PostgresConnection


def main():
    conn = PostgresConnection()

    print("Connecting to PostgreSQL...")
    if not conn.connect():
        print("✗ Connection failed")
        return

    statements = [
        "ALTER TABLE link_lists ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);",
        "ALTER TABLE link_lists ADD COLUMN IF NOT EXISTS allowed_users TEXT[] DEFAULT '{}';",
        "ALTER TABLE link_lists ADD COLUMN IF NOT EXISTS allowed_departments TEXT[] DEFAULT '{}';",
        "ALTER TABLE link_lists ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;",
        "UPDATE link_lists SET allowed_users = '{}' WHERE allowed_users IS NULL;",
        "UPDATE link_lists SET allowed_departments = '{}' WHERE allowed_departments IS NULL;",
        "UPDATE link_lists SET is_public = true WHERE is_public IS NULL;",
        "CREATE INDEX IF NOT EXISTS idx_link_lists_is_public ON link_lists(is_public);",
    ]

    print("Applying migration for link_lists access fields...")
    for sql in statements:
        ok = conn.execute_query(sql)
        if ok:
            print(f"✓ {sql}")
        else:
            print(f"✗ Failed: {sql}")

    verify_sql = """
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'link_lists'
      AND column_name IN ('created_by', 'allowed_users', 'allowed_departments', 'is_public')
    ORDER BY column_name;
    """

    print("\nVerifying columns:")
    rows = conn.fetch_all(verify_sql)
    for row in rows:
        print(f"- {row['column_name']}: {row['data_type']} (nullable={row['is_nullable']})")

    conn.disconnect()
    print("\n✓ Migration completed")


if __name__ == '__main__':
    main()
