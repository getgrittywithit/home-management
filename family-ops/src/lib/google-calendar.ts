import { google } from 'googleapis'
import { db } from './database'
import { FamilyEvent, Profile } from '@/types'

// Google Calendar service setup
const calendar = google.calendar('v3')

// Initialize Google Auth
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE, // Path to service account JSON
  scopes: ['https://www.googleapis.com/auth/calendar']
})

export class GoogleCalendarIntegration {
  
  static async getAuthenticatedCalendar() {
    const authClient = await auth.getClient()
    return google.calendar({ version: 'v3', auth: authClient as any })
  }

  // Create calendar event with proper Family Ops format
  static async createFamilyEvent(event: FamilyEvent) {
    try {
      const calendarService = await this.getAuthenticatedCalendar()
      
      // Get profile names for the title
      const [child, captain, backup] = await Promise.all([
        db.query('SELECT first_name FROM profiles WHERE id = $1', [event.child_id]),
        db.query('SELECT first_name FROM profiles WHERE id = $1', [event.captain_id]),
        event.backup_id ? db.query('SELECT first_name FROM profiles WHERE id = $1', [event.backup_id]) : null
      ])

      // Format: "Child — Visit Type | Captain: Name | Backup: Name | Pharmacy: Name"
      let title = `${child[0]?.first_name} — ${event.title}`
      title += ` | Captain: ${captain[0]?.first_name}`
      if (backup && backup[0]) {
        title += ` | Backup: ${backup[0].first_name}`
      }
      if (event.pharmacy) {
        title += ` | Pharmacy: ${event.pharmacy}`
      }

      // Handle swap flag
      if (event.swap_flag) {
        title = title.replace('Captain:', '[SWAP] Captain:')
      }

      const calendarEvent = {
        summary: title,
        description: this.buildEventDescription(event),
        start: {
          dateTime: event.start_time,
          timeZone: 'America/Chicago' // Adjust for your timezone
        },
        end: {
          dateTime: event.end_time || event.start_time,
          timeZone: 'America/Chicago'
        },
        location: event.location || '',
        
        // Add attendees (captain and backup)
        attendees: [
          captain[0] ? { email: `${captain[0].first_name.toLowerCase()}@family.com` } : null,
          backup && backup[0] ? { email: `${backup[0].first_name.toLowerCase()}@family.com` } : null
        ].filter(Boolean) as any,

        // Add reminders
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 24 hours
            { method: 'popup', minutes: 60 },      // 1 hour
            { method: 'popup', minutes: 15 }       // 15 minutes
          ]
        },

        // Custom properties for tracking
        extendedProperties: {
          private: {
            familyEventId: event.id,
            childId: event.child_id,
            eventType: event.event_type,
            tokensUsed: event.tokens_used.toString(),
            swapFlag: event.swap_flag.toString()
          }
        }
      }

      const result = await calendarService.events.insert({
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        requestBody: calendarEvent
      } as any)

      console.log(`Calendar event created: ${result.data.id}`)
      return result.data

    } catch (error) {
      console.error('Error creating calendar event:', error)
      throw error
    }
  }

  private static buildEventDescription(event: FamilyEvent) {
    let description = `Family Ops Event\n\n`
    description += `Type: ${event.event_type}\n`
    if (event.location) description += `Location: ${event.location}\n`
    if (event.contact_info) description += `Contact: ${event.contact_info}\n`
    if (event.gear_needed) description += `Gear Needed: ${event.gear_needed}\n`
    if (event.tokens_used > 0) description += `Ride Tokens: ${event.tokens_used}\n`
    
    description += `\n--- MEDICAL SWAP RULE ---\n`
    description += `To change captain, edit title ≥6h before (2h urgent)\n`
    description += `Format: [SWAP] Captain: NewName\n`
    description += `Post one-liner in family chat\n`
    description += `No confirmed swap = appointment MOVES (doesn't fall to Mom)`
    
    return description
  }

  // Update calendar event when swap occurs
  static async handleMedicalSwap(eventId: string, newCaptainId: string, urgentSwap = false) {
    try {
      const calendarService = await this.getAuthenticatedCalendar()
      
      // Get current event
      const eventResult = await calendarService.events.get({
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        eventId: eventId
      })

      const currentEvent = eventResult.data
      if (!currentEvent) {
        throw new Error('Event not found')
      }

      // Check timing rules
      const eventStart = new Date(currentEvent.start?.dateTime || currentEvent.start?.date!)
      const now = new Date()
      const hoursUntilEvent = (eventStart.getTime() - now.getTime()) / (1000 * 60 * 60)

      const requiredNotice = urgentSwap ? 2 : 6
      if (hoursUntilEvent < requiredNotice) {
        throw new Error(`Swap requires ${requiredNotice}h notice. Event is in ${hoursUntilEvent.toFixed(1)}h.`)
      }

      // Get new captain name
      const newCaptain = await db.query('SELECT first_name FROM profiles WHERE id = $1', [newCaptainId])
      if (!newCaptain[0]) {
        throw new Error('New captain not found')
      }

      // Update title with SWAP flag
      let newTitle = currentEvent.summary || ''
      newTitle = newTitle.replace(/\[SWAP\]\s*Captain:\s*\w+/, '') // Remove existing swap
      newTitle = newTitle.replace(/Captain:\s*\w+/, `[SWAP] Captain: ${newCaptain[0].first_name}`)

      // Update the event
      await calendarService.events.update({
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        eventId: eventId,
        requestBody: {
          ...currentEvent,
          summary: newTitle
        }
      })

      // Update in our database
      await db.query(`
        UPDATE family_events 
        SET captain_id = $1, swap_flag = true, swap_requested_at = NOW()
        WHERE id = $2
      `, [newCaptainId, currentEvent.extendedProperties?.private?.familyEventId])

      return { success: true, newTitle }

    } catch (error) {
      console.error('Error handling medical swap:', error)
      throw error
    }
  }

  // Sync calendar events back to our database
  static async syncCalendarEvents(daysAhead = 30) {
    try {
      const calendarService = await this.getAuthenticatedCalendar()
      
      const timeMin = new Date().toISOString()
      const timeMax = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString()

      const response = await calendarService.events.list({
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        timeMin: timeMin,
        timeMax: timeMax,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 100
      })

      const events = response.data.items || []
      const familyEvents = events.filter(event => 
        event.extendedProperties?.private?.familyEventId
      )

      console.log(`Found ${familyEvents.length} family events to sync`)

      for (const calendarEvent of familyEvents) {
        const familyEventId = calendarEvent.extendedProperties!.private!.familyEventId
        
        // Update our database with any changes from calendar
        await db.query(`
          UPDATE family_events 
          SET 
            title = $1,
            start_time = $2,
            end_time = $3,
            location = $4,
            updated_at = NOW()
          WHERE id = $5
        `, [
          this.extractTitleFromCalendarSummary(calendarEvent.summary || ''),
          calendarEvent.start?.dateTime || calendarEvent.start?.date,
          calendarEvent.end?.dateTime || calendarEvent.end?.date,
          calendarEvent.location || '',
          familyEventId
        ])
      }

      return { synced: familyEvents.length }

    } catch (error) {
      console.error('Error syncing calendar events:', error)
      throw error
    }
  }

  private static extractTitleFromCalendarSummary(summary: string) {
    // Extract the actual event title from "Child — Title | Captain: Name..."
    const match = summary.match(/^\w+\s*—\s*([^|]+)/)
    return match ? match[1].trim() : summary
  }

  // Check for events needing swap confirmation
  static async checkPendingSwaps() {
    try {
      const pendingSwaps = await db.query(`
        SELECT 
          fe.*,
          child.first_name as child_name,
          captain.first_name as captain_name
        FROM family_events fe
        JOIN profiles child ON fe.child_id = child.id
        JOIN profiles captain ON fe.captain_id = captain.id
        WHERE fe.swap_flag = true 
        AND fe.swap_requested_at > NOW() - INTERVAL '15 minutes'
        AND fe.start_time > NOW()
      `)

      // This would integrate with your Telegram bot to ping for confirmation
      for (const swap of pendingSwaps) {
        console.log(`Pending swap confirmation needed for ${swap.child_name} - ${swap.title}`)
        // TelegramBot.sendMessage(`🔄 Swap confirmation needed: ${swap.captain_name} for ${swap.child_name} - ${swap.title}`)
      }

    } catch (error) {
      console.error('Error checking pending swaps:', error)
    }
  }

  // Handle appointment moving when swap isn't confirmed
  static async moveUnconfirmedSwap(eventId: string) {
    try {
      const calendarService = await this.getAuthenticatedCalendar()
      
      // Move event 1 week forward
      const eventResult = await calendarService.events.get({
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        eventId: eventId
      })

      const currentEvent = eventResult.data
      if (!currentEvent) return

      const currentStart = new Date(currentEvent.start?.dateTime || currentEvent.start?.date!)
      const currentEnd = new Date(currentEvent.end?.dateTime || currentEvent.end?.date!)
      
      const newStart = new Date(currentStart.getTime() + 7 * 24 * 60 * 60 * 1000)
      const newEnd = new Date(currentEnd.getTime() + 7 * 24 * 60 * 60 * 1000)

      await calendarService.events.update({
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        eventId: eventId,
        requestBody: {
          ...currentEvent,
          summary: `[MOVED] ${currentEvent.summary}`,
          start: {
            dateTime: newStart.toISOString(),
            timeZone: 'America/Chicago'
          },
          end: {
            dateTime: newEnd.toISOString(), 
            timeZone: 'America/Chicago'
          }
        }
      })

      // Update database
      await db.query(`
        UPDATE family_events 
        SET 
          start_time = $1,
          end_time = $2,
          status = 'moved',
          updated_at = NOW()
        WHERE id = $3
      `, [
        newStart.toISOString(),
        newEnd.toISOString(),
        currentEvent.extendedProperties?.private?.familyEventId
      ])

      return { moved: true, newStart, newEnd }

    } catch (error) {
      console.error('Error moving unconfirmed swap:', error)
      throw error
    }
  }
}

export { GoogleCalendarIntegration as CalendarService }