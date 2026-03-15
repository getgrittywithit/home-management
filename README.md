# Family Ops - Greenhouse Playbook 🏠

A comprehensive family management system built for managing 2 adults + 6 kids with systems that actually work. This implements the complete "Greenhouse Playbook" methodology for family operations.

## 🎯 Core Features

### **Family Dashboard**
- Real-time overview of on-call parent, water status, ride tokens, and revenue
- Today's schedule with pickup windows and event management
- Zone completion tracking and overdue alerts
- Critical alerts for low water, overdue zones, and upcoming pickups

### **Ride Token System**
- Daily token allocation per child (Mon-Thu: 1/day, Fri-Sun: 2/day)
- Last-minute penalty system (<24h notice costs extra tokens)
- Automatic approval workflow via Telegram
- Integration with calendar for event creation

### **Medical Appointment Management**
- Strict [SWAP] rule enforcement (≥6h notice, ≥2h urgent)
- Calendar title format: "Child — Visit Type | Captain: Name | Backup: Name | Pharmacy: Name"
- Automatic appointment moving if swap not confirmed (no silent handoffs to Mom)
- Integration with Google Calendar

### **Water Jug Monitoring**
- 6-jug FIFO rotation system with status tracking
- Automatic low-water alerts (≤2 jugs)
- Refill window scheduling (Tue/Fri 5-7pm)
- QR code updates via Telegram bot

### **Money Sprint Tracking**
- Revenue and fulfill sprint tracking
- Real-time daily/weekly/monthly totals
- Plant business sales logging by channel
- Goal tracking and progress monitoring

### **Zone Management System**
- 8 core zones with primary/buddy assignments
- Weekly rotating crews for outdoor/deep cleaning
- Photo verification and quality scoring
- Overdue detection and escalation

### **Pet Care Automation**
- 5 family pets with primary/backup caretakers
- Daily task tracking with 7pm failsafe
- Automatic backup notification system

### **On-Call Parent Rotation**
- Automatic daily assignments (Mon/Wed: Lola, Tue/Thu/Fri: Levi, Weekends: Alternate)
- Manual override capability
- Real-time decision authority within posted rules

### **Telegram Bot Integration**
All family communication happens through structured Telegram commands:

```
# Ride Requests
Who • Ready time • Location • Event + end time • Gear • Contact

# Approvals
OK — Kid: title | start–end | tokens | pickup location | today

# Water Management
/jug 3 full
/jug 5 empty  
/water

# Money Tracking
/sprint revenue 40
/sold $25 pothos #FB

# Daily Permissions
Greenlights Tue — Zoey: JROTC 3:30–5:30 ✅ (no extras) | Kaylee: HW club 4–5:15 ✅ (1 token)
```

## 🏗️ Technical Architecture

### **Stack**
- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Database**: PostgreSQL (Supabase)
- **Integrations**: Telegram Bot API, Google Calendar API
- **Hosting**: Vercel-ready

### **Database Schema**
- **Core**: `profiles`, `family_events`, `family_config`
- **Tokens**: `ride_tokens`, `token_config`, `credits_log`
- **Management**: `zones`, `zone_completions`, `pets`, `pet_care_log`
- **Resources**: `water_jugs`, `water_usage_log`, `money_sprints`, `money_sales`
- **Scheduling**: `on_call_schedule`, `daily_greenlights`

## 🚀 Setup Instructions

### 1. Database Setup
Your Supabase database is already configured with all necessary tables and sample data.

### 2. Install Dependencies
```bash
cd family-ops
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env.local` and update:

```env
# Get from @BotFather on Telegram
TELEGRAM_BOT_TOKEN=your_bot_token

# Get your family group chat ID
FAMILY_CHAT_ID=your_chat_id

# Google service account for calendar integration
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=/path/to/service-account.json

# Your family calendar ID
GOOGLE_CALENDAR_ID=your_calendar_id
```

### 4. Telegram Bot Setup
1. Message @BotFather on Telegram
2. Create new bot: `/newbot`
3. Name it "Family Ops Bot" 
4. Get your bot token
5. Set webhook: `https://your-domain.com/api/telegram/webhook`

### 5. Google Calendar Setup
1. Go to Google Cloud Console
2. Create service account with Calendar API access
3. Download JSON key file
4. Share your family calendar with the service account email

### 6. Run Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` to see your Family Ops dashboard!

## 📱 Family Usage Guide

### **Daily Workflow**
1. **Morning**: Check dashboard for today's on-call parent and schedule
2. **Ride Requests**: Kids post formatted requests to family chat
3. **Approvals**: On-call parent approves with token tracking
4. **Greenlights**: Primary parents post tomorrow's permissions nightly
5. **Updates**: Log water jugs, zone completions, pet care, revenue

### **Weekly Workflow**
1. **Zone Rotations**: Check weekly assignments and crew rotations
2. **Water Refill**: Tuesday/Friday 5-7pm windows
3. **Medical Swaps**: Handle any captain changes with proper notice
4. **Revenue Review**: Check plant business weekly totals

### **Emergency Procedures**
- **Low Water**: System alerts when ≤2 jugs, escalates to Jug Captain
- **Medical Swaps**: Unconfirmed swaps auto-move appointments (no Mom fallback)
- **Token Exhaustion**: Kids without tokens can't get rides (builds planning skills)
- **Zone Overdue**: Escalation to Primary then Buddy

## 🎯 Key Principles

### **One-Answer Rule**
"Ask once. Ask your Primary. We live with the answer."

### **No Silent Handoffs**
All medical appointment changes must be explicit with confirmation.

### **Systems Over Perfection**
Good enough standards with consistent execution beat perfectionism.

### **Token Economy**
Ride tokens teach planning and resource management.

### **Rotation Equity**
6-week pod rotations ensure both parents get balanced responsibilities.

## 🔧 Customization

### **Adding New Zones**
```sql
INSERT INTO zones (name, primary_assignee_id, buddy_id, cadence) 
VALUES ('New Zone', primary_id, buddy_id, 'daily');
```

### **Modifying Token Allowances**
Update `token_config` table for per-child, per-day customization.

### **Changing Rotations**
Modify `on_call_schedule` or let the system auto-generate based on rules.

### **Adding Family Members**
Add to `profiles` table and run setup script to configure zones/tokens.

## 📊 Analytics & Reporting

The dashboard provides real-time insights:
- **Token usage patterns** by child and day
- **Zone completion rates** and quality scores  
- **Revenue tracking** with daily/weekly/monthly views
- **Water consumption** trends and refill scheduling
- **Medical appointment** load balancing between parents

## 🆘 Troubleshooting

### **Telegram Bot Not Responding**
- Check webhook URL is accessible
- Verify bot token is correct
- Ensure chat ID matches your family group

### **Calendar Sync Issues**
- Verify service account permissions
- Check calendar sharing settings
- Confirm API quotas aren't exceeded

### **Database Connection**
- Supabase connection string is in environment
- Check network connectivity
- Verify SSL settings

## 🛣️ Roadmap

- [ ] Mobile app for quick actions
- [ ] Photo verification for zone completions  
- [ ] AI-powered scheduling optimization
- [ ] Integration with school calendars
- [ ] Expense tracking integration
- [ ] Chore completion gamification
- [ ] Voice assistant integration

## 🤝 Contributing

This is a family-specific system, but the patterns and architecture can be adapted for other large family operations. Key principles:
- Systems thinking over ad-hoc solutions
- Clear ownership and accountability
- Automated enforcement of family rules
- Real-time visibility into family operations

---

**Built with ❤️ for families who believe in systems over chaos.**

*"You have creative freedom to tighten bottlenecks or propose simpler alternatives." - The Greenhouse Playbook*