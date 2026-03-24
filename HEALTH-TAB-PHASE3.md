# Health Tab - Phase 3: Visit Notes & AI Analyzer

## What's New
Phase 3 unlocks the **Visit Notes & AI** sub-tab. Paste or upload doctor visit notes and let AI analyze them into a plain-English synopsis, diagnoses, follow-up tasks, prescriptions, and next appointment recommendations. Tasks are auto-created and tracked.

## Files Changed (3 files)

### 1. `src/components/HealthTab.tsx` (REPLACE entire file)
- Visit Notes & AI tab fully enabled (no longer grayed out)
- Paste text or upload photos/PDFs of visit notes
- "Analyze with AI" button sends notes to Claude for processing
- Expandable note cards show AI synopsis, diagnoses, tasks, prescriptions, follow-up
- Health Tasks section with complete/delete, priority badges, due date tracking
- Tasks auto-created from AI analysis

### 2. `src/app/api/health/route.ts` (REPLACE entire file)
- GET now also returns `visitNotes` and `healthTasks`
- New POST actions: `add_visit_note`, `update_visit_note`, `delete_visit_note`
- New POST actions: `add_health_task`, `update_health_task`, `delete_health_task`, `complete_health_task`

### 3. `src/app/api/health/analyze/route.ts` (NEW file)
- AI-powered visit note analyzer
- Accepts text (JSON body) or file upload (multipart form)
- Supports images, PDFs, and text files
- Uses Claude API (same ANTHROPIC_API_KEY already in Vercel)
- Returns: synopsis, diagnoses, tasks, prescriptions, followup

## Integration Steps

### Step 1: Copy all 3 files into your project
- Replace `src/components/HealthTab.tsx`
- Replace `src/app/api/health/route.ts`
- Create new folder `src/app/api/health/analyze/` and add `route.ts`

### Step 2: Commit and push
```bash
git add src/app/api/health/ src/components/HealthTab.tsx HEALTH-TAB-PHASE3.md
git commit -m "Add Phase 3: Visit Notes & AI Analyzer"
git push
```

No database migration needed — tables already exist from Phase 1.

## How It Works

1. Click "New Visit Note"
2. Select family member, date, and provider
3. Either paste/type the notes OR upload a photo/PDF of the notes
4. Click "Analyze with AI & Save"
5. AI returns a plain-English breakdown with:
   - Summary of the visit
   - Diagnoses discussed
   - Follow-up tasks (auto-added to Health Tasks)
   - Prescriptions mentioned
   - Next follow-up recommendation
6. Tasks appear in the Health Tasks section below, ready to check off
