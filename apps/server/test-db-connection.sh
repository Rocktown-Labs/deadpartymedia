#!/bin/bash
# Test database connection with different methods

echo "Testing database connection..."
echo ""

# Method 1: Test with psql directly
echo "Method 1: Testing with psql..."
export PGPASSWORD='D*7m&syoqAJX`T#%8Z;X<`rv9t6|8J}Q'
psql -h ls-2b118c054fab6ffee8588a8140b5e71ab5dfb4e6.cp6k6m4q25s5.us-east-2.rds.amazonaws.com \
     -p 5432 \
     -U dbmasteruser \
     -d dbmaster \
     -c "SELECT version();" 2>&1

echo ""
echo "Method 2: Test with Python psycopg2..."
python3 << 'EOF'
import psycopg2
try:
    conn = psycopg2.connect(
        host="ls-2b118c054fab6ffee8588a8140b5e71ab5dfb4e6.cp6k6m4q25s5.us-east-2.rds.amazonaws.com",
        port=5432,
        database="dbmaster",
        user="dbmasteruser",
        password="D*7m&syoqAJX`T#%8Z;X<`rv9t6|8J}Q",
        sslmode="require"
    )
    print("✅ Connection successful!")
    cur = conn.cursor()
    cur.execute("SELECT version();")
    print(cur.fetchone()[0])
    conn.close()
except Exception as e:
    print(f"❌ Connection failed: {e}")
EOF

