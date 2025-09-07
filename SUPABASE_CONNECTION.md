# Supabase Connection Guide

This guide explains the exact process to connect to Supabase databases using psql.

## Working Connection Method

### Session Pooler Connection (Recommended)

Use this connection string format with the session pooler:

```bash
PGPASSWORD='your-password' psql "postgresql://postgres.projectid:your-password@aws-0-us-east-2.pooler.supabase.com:5432/postgres"
```

**Example for this project:**
```bash
PGPASSWORD='71jd4xNjFaBufBAA' psql "postgresql://postgres.vhqgzgqklwrjmglaezmh:71jd4xNjFaBufBAA@aws-0-us-east-2.pooler.supabase.com:5432/postgres"
```

### Connection String Components

```
postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE
```

- **USERNAME**: `postgres.projectid` (note the dot separator)
- **PASSWORD**: Your database password (case-sensitive)
- **HOST**: `aws-0-us-east-2.pooler.supabase.com` (or your region)
- **PORT**: `5432`
- **DATABASE**: `postgres`

## Getting Your Connection Details

1. Go to https://app.supabase.com
2. Select your project
3. Go to **Settings** → **Database**  
4. Under **Connection String**, select **Session pooler**
5. Copy the connection string
6. Replace `[YOUR-PASSWORD]` with your actual password

## Common Connection Commands

### Test Connection
```bash
PGPASSWORD='your-password' psql "postgresql://postgres.projectid:password@aws-0-region.pooler.supabase.com:5432/postgres" -c "SELECT 1;"
```

### Run Single Query
```bash
PGPASSWORD='your-password' psql "postgresql://..." -c "SELECT * FROM your_table;"
```

### Run SQL File
```bash
PGPASSWORD='your-password' psql "postgresql://..." -f migration.sql
```

### Multi-line Commands
```bash
PGPASSWORD='your-password' psql "postgresql://..." << 'EOF'
SELECT COUNT(*) FROM brand_profiles;
SELECT id, name, slug FROM brand_profiles;
EOF
```

## Project-Specific Details

**Project ID**: `vhqgzgqklwrjmglaezmh`  
**Connection String**: 
```
postgresql://postgres.vhqgzgqklwrjmglaezmh:71jd4xNjFaBufBAA@aws-0-us-east-2.pooler.supabase.com:5432/postgres
```

## Troubleshooting

### Database Hibernation Error
If you get `{:shutdown, :db_termination}`, the database is waking up from hibernation. Wait 10-30 seconds and retry.

### Password Authentication Failed
- Verify password is exactly correct (case-sensitive)
- Don't URL-encode passwords when using PGPASSWORD method
- Ensure using `postgres.projectid` format for username

### Connection Refused
- Use session pooler (IPv4 compatible) instead of direct connection
- Verify project ID is correct
- Check if database is paused in Supabase dashboard

## Environment Variables

For application use, set these environment variables:

```bash
# Required for Supabase client
NEXT_PUBLIC_SUPABASE_URL=https://vhqgzgqklwrjmglaezmh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: Direct database URL for migrations
DATABASE_URL=postgresql://postgres.vhqgzgqklwrjmglaezmh:71jd4xNjFaBufBAA@aws-0-us-east-2.pooler.supabase.com:5432/postgres
```