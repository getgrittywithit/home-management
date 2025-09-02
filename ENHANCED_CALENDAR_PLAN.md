# Enhanced Family Calendar System Plan

## Overview
Build a sophisticated calendar system that combines the best of local control with Google Calendar integration, giving each family member personalized views while maintaining family coordination.

## Core Features

### 1. **Multi-Layer Event System**
```typescript
interface FamilyEvent {
  id: string
  title: string
  category: 'medical' | 'school' | 'activities' | 'chores' | 'personal' | 'family'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  
  // Attendance
  assignedTo: string[] // Family member IDs
  requiredAttendees?: string[] // Must attend
  optionalAttendees?: string[] // Can attend
  
  // Scheduling
  startTime: Date
  endTime?: Date
  allDay: boolean
  recurring?: RecurrencePattern
  
  // Location & Details
  location?: string
  virtualLink?: string
  description?: string
  attachments?: string[]
  
  // Family Ops Integration
  rideTokensRequired?: number
  captainId?: string
  backupId?: string
  gearNeeded?: string[]
  
  // Sync Controls
  syncToGoogle: boolean
  googleEventId?: string
  lastSynced?: Date
  
  // Smart Features
  autoReschedule?: boolean
  conflictResolution?: 'move' | 'notify' | 'split'
  weatherDependent?: boolean
}
```

### 2. **Per-Child Calendar Views**
Each child sees a personalized calendar with:

#### **Smart Filtering**
- **My Events**: Events assigned to them
- **Family Events**: Events involving the whole family  
- **School Schedule**: Their actual class schedule (already implemented!)
- **Chore Calendar**: Their daily/weekly responsibilities
- **Optional Events**: Things they can choose to attend

#### **Age-Appropriate Display**
- **Elementary (6-10)**: Simple day view, big icons, color-coded
- **Middle School (11-13)**: Week view, homework tracking, activity signup
- **High School (14-18)**: Full calendar, event creation, schedule coordination

### 3. **Enhanced Google Calendar Integration**

#### **Selective Sync Rules**
```typescript
const SYNC_RULES = {
  // Always sync to Google
  alwaysSync: ['medical', 'school_events', 'family_trips'],
  
  // Sync based on priority
  prioritySync: {
    high: true,
    medium: true, // if involves multiple people
    low: false
  },
  
  // Sync based on attendees
  attendeeSync: {
    multipleFamily: true, // More than one family member
    parentsOnly: true,
    kidsOnly: false // Keep internal
  },
  
  // Per-person Google calendars
  individualCalendars: {
    'mom': 'primary',
    'dad': 'dad@family.com', 
    'amos': 'amos@family.com',
    'zoey': 'zoey@family.com'
    // Kids get their own Google calendars for important events
  }
}
```

#### **Smart Conflict Detection**
- **School schedule conflicts**: Automatic detection with class schedules
- **Transportation conflicts**: Who's driving what when
- **Token conflicts**: Not enough ride tokens for simultaneous events
- **Captain availability**: Ensure assigned parents are available

### 4. **Toggle-Based Visibility System**

#### **Kids Portal Toggles**
```typescript
interface CalendarToggles {
  // Event Categories
  myEvents: boolean
  familyEvents: boolean
  schoolSchedule: boolean
  chores: boolean
  activities: boolean
  
  // Time Ranges  
  showWeekends: boolean
  showPastEvents: boolean
  showNextMonth: boolean
  
  // Detail Levels
  showTimes: boolean
  showLocations: boolean
  showDescriptions: boolean
  showAttendees: boolean
  
  // Smart Features
  compactView: boolean
  highlightConflicts: boolean
  showRideTokens: boolean
}
```

#### **Parent Admin Toggles**
- **Sync Controls**: Which events sync to Google
- **Visibility Controls**: What each child can see/edit
- **Notification Controls**: Who gets reminded about what
- **Permission Controls**: Who can create/modify events

## Implementation Phases

### Phase 1: Enhanced Local Calendar (2-3 days)
1. **Expand event categories** beyond current school/chores/family/personal
2. **Add per-child filtering** to existing FilterableCalendar
3. **Integrate with real family data** (profiles, schedules)
4. **Add toggle controls** for each child's view

### Phase 2: Smart Event Management (3-4 days)
1. **Recurring events system** for chores, activities
2. **Conflict detection** with school schedules
3. **Ride token integration** with calendar events
4. **Captain/backup assignment** for activities

### Phase 3: Enhanced Google Sync (2-3 days)
1. **Selective sync rules** based on event properties
2. **Individual Google calendars** for family members
3. **Bidirectional conflict resolution**
4. **Smart notification system**

### Phase 4: Advanced Features (ongoing)
1. **Weather integration** for outdoor events
2. **Automatic rescheduling** for conflicts
3. **AI-powered suggestions** for optimal scheduling
4. **Integration with school district calendars**

## Benefits of This Approach

### **For Kids**
- **Clean, focused view** of their responsibilities and activities
- **Age-appropriate complexity** that grows with them
- **Ownership** of their schedule while maintaining family coordination
- **Clear expectations** about attendance and responsibilities

### **For Parents**
- **Granular control** over what syncs where
- **Automatic conflict detection** before problems arise
- **Flexible visibility** - kids see what they need, parents see everything
- **Integration** with existing family operations (tokens, captains, etc.)

### **For Family Operations**
- **Single source of truth** for all family scheduling
- **Automated coordination** of complex logistics
- **Scalable system** that grows with changing family needs
- **Data ownership** with optional cloud sync

## Technical Implementation

### Database Schema Extension
```sql
-- Extend existing family_events table
ALTER TABLE family_events ADD COLUMN category VARCHAR(50);
ALTER TABLE family_events ADD COLUMN priority VARCHAR(20);
ALTER TABLE family_events ADD COLUMN sync_to_google BOOLEAN DEFAULT false;
ALTER TABLE family_events ADD COLUMN recurring_pattern JSONB;
ALTER TABLE family_events ADD COLUMN assigned_to JSONB; -- Array of profile IDs

-- New table for calendar preferences
CREATE TABLE calendar_preferences (
  profile_id UUID REFERENCES profiles(id),
  view_settings JSONB,
  toggle_settings JSONB,
  sync_settings JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- New table for recurring event templates
CREATE TABLE recurring_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),
  category VARCHAR(50),
  pattern JSONB, -- {frequency: 'weekly', days: [1,3,5], etc}
  assigned_to JSONB,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

This approach gives you the best of both worlds: a powerful local system with smart Google integration that scales with your family's complexity while keeping kids focused on what matters to them.

What aspects would you like to implement first?