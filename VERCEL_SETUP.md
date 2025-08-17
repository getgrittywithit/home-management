# Vercel Environment Variables Setup

To fix the Supabase authentication errors in production, you need to add these environment variables to your Vercel project:

## Required Environment Variables

1. Go to https://vercel.com/your-team/home-management/settings/environment-variables
2. Add the following variables for Production:

### Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=https://vhqgzgqklwrjmglaezmh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZocWd6Z3FrbHdyam1nbGFlem1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ3MDU4NjIsImV4cCI6MjA1MDI4MTg2Mn0.OgcROY8YZqZzUMj7SQJEP9UqNiGz5Pr0z13bz5OBqwQ
```

### Database Configuration
```
DATABASE_URL=postgresql://postgres.vhqgzgqklwrjmglaezmh:71jd4xNjFaBufBAA@aws-0-us-east-2.pooler.supabase.com:5432/postgres
```

### App Configuration
```
NEXTAUTH_URL=https://family-ops.grittysystems.com
NEXTAUTH_SECRET=[generate a secure 32-character secret]
```

## To Generate NEXTAUTH_SECRET

Run this command in your terminal:
```bash
openssl rand -base64 32
```

## After Adding Variables

1. Click "Save" in Vercel
2. Redeploy your project by going to the Deployments tab and clicking "Redeploy"

## Additional Notes

- The `NEXT_PUBLIC_` prefix is required for environment variables that need to be available in the browser
- Make sure to select "Production" environment when adding these variables
- You can also add them for "Preview" and "Development" if needed