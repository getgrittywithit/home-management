# Deployment Guide - Family Ops

## 🚀 Vercel Deployment Setup

### 1. Environment Variables Setup

In your Vercel project dashboard, add these environment variables:

```
DATABASE_URL=postgresql://postgres.vhqgzgqklwrjmglaezmh:71jd4xNjFaBufBAA@aws-0-us-east-2.pooler.supabase.com:5432/postgres

NEXT_PUBLIC_SUPABASE_URL=https://vhqgzgqklwrjmglaezmh.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZocWd6Z3FrbHdyam1nbGFlem1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ3MDU4NjIsImV4cCI6MjA1MDI4MTg2Mn0.OgcROY8YZqZzUMj7SQJEP9UqNiGz5Pr0z13bz5OBqwQ

NEXTAUTH_URL=https://family-ops.grittysystems.com

NEXTAUTH_SECRET=[GENERATE A SECURE 32-CHARACTER SECRET]

NODE_ENV=production
```

### 2. Domain Setup

- **Production URL**: `https://family-ops.grittysystems.com`
- Make sure your domain is configured in Vercel dashboard
- SSL will be automatically handled by Vercel

### 3. Database Status

✅ **Supabase Database Ready**
- Food inventory tables created with simplified 3-location system
- Meal planning tables with AI integration  
- Row Level Security (RLS) enabled
- Smart bulk import functions deployed

### 4. Features Ready for Production

🍽️ **Food Management System**
- Bulk grocery import with AI categorization
- 3 storage locations: fridge, freezer, pantry
- Expiration tracking and alerts
- Smart meal planning for family of 8

🤖 **AI Integration**
- Real food inventory awareness
- Kid-friendly meal suggestions  
- Waste reduction optimization
- 7-day meal planning

### 5. Post-Deployment Testing

After deployment, test these key features:
1. Bulk food import (paste grocery list)
2. AI meal plan generation
3. Food inventory management
4. Database connectivity

### 6. Next Steps After Deployment

1. **Set Claude API Key** in the app settings
2. **Import your $300 grocery haul** using bulk import
3. **Generate your first AI meal plan**
4. **Verify all family member profiles**

---

🎉 **Your family operations system is ready for production!**