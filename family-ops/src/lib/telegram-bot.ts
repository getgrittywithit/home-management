import TelegramBot from 'node-telegram-bot-api'
import { db } from './database'
import { RideRequest, ApprovalReceipt } from '@/types'

// Initialize bot (you'll need to get token from @BotFather)
const bot = process.env.TELEGRAM_BOT_TOKEN 
  ? new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false })
  : null

// Chat ID for family group (you'll need to get this)
const FAMILY_CHAT_ID = process.env.FAMILY_CHAT_ID || ''

export class FamilyTelegramBot {
  
  static async sendMessage(text: string, chatId?: string) {
    if (!bot) {
      console.log('Telegram bot not configured, would send:', text)
      return
    }
    
    try {
      await bot.sendMessage(chatId || FAMILY_CHAT_ID, text)
    } catch (error) {
      console.error('Failed to send Telegram message:', error)
    }
  }

  // Parse ride ticket format: "Who • Ready time • Location • Event + end time • Gear • Contact"
  static parseRideTicket(message: string): RideRequest | null {
    const parts = message.split('•').map(p => p.trim())
    
    if (parts.length !== 6) {
      return null
    }

    const [who, ready_time, location, eventWithEndTime, gear, contact] = parts
    const eventParts = eventWithEndTime.split('+').map(p => p.trim())
    const event = eventParts[0] || eventWithEndTime
    const end_time = eventParts[1] || ''

    return {
      who: who.trim(),
      ready_time: ready_time.trim(),
      location: location.trim(), 
      event: event.trim(),
      end_time: end_time.trim(),
      gear: gear.trim(),
      contact: contact.trim()
    }
  }

  // Parse "OK — Kid: title | start–end | tokens | pickup location | date"
  static parseApprovalReceipt(message: string): ApprovalReceipt | null {
    if (!message.startsWith('OK —')) {
      return null
    }

    const content = message.replace('OK —', '').trim()
    const parts = content.split('|').map(p => p.trim())
    
    if (parts.length < 5) {
      return null
    }

    const [kidAndTitle, timeRange, tokensStr, pickup_location, date] = parts
    
    // Parse "Kid: title"
    const kidTitleParts = kidAndTitle.split(':').map(p => p.trim())
    if (kidTitleParts.length < 2) {
      return null
    }
    
    const kid = kidTitleParts[0]
    const title = kidTitleParts.slice(1).join(':').trim()
    
    // Parse "start–end"
    const timeParts = timeRange.split('–').map(p => p.trim())
    const start = timeParts[0] || timeRange
    const end = timeParts[1] || ''
    
    // Parse tokens
    const tokens = parseInt(tokensStr.replace(/\D/g, '')) || 1

    return {
      kid,
      title,
      start,
      end,
      tokens,
      pickup_location,
      date: date.toLowerCase().includes('today') ? 'today' : date
    }
  }

  // Handle incoming messages
  static async processMessage(message: string, fromUser: string) {
    try {
      // Check if it's a ride ticket
      const rideRequest = this.parseRideTicket(message)
      if (rideRequest) {
        await this.handleRideRequest(rideRequest, fromUser)
        return
      }

      // Check if it's an approval receipt
      const approval = this.parseApprovalReceipt(message)
      if (approval) {
        await this.handleApprovalReceipt(approval, fromUser)
        return
      }

      // Handle water jug updates "/jug 3 full"
      if (message.startsWith('/jug ')) {
        await this.handleWaterJugCommand(message, fromUser)
        return
      }

      // Handle water status "/water"
      if (message === '/water') {
        await this.handleWaterStatusCommand()
        return
      }

      // Handle money sprint commands "/sprint revenue 40"
      if (message.startsWith('/sprint ')) {
        await this.handleSprintCommand(message, fromUser)
        return
      }

      // Handle sale logging "/sold $25 pothos #FB"
      if (message.startsWith('/sold ')) {
        await this.handleSaleCommand(message, fromUser)
        return
      }

      // Handle greenlights posting
      if (message.startsWith('Greenlights ')) {
        await this.handleGreenlightPost(message, fromUser)
        return
      }

    } catch (error) {
      console.error('Error processing message:', error)
      await this.sendMessage(`❌ Error processing message: ${error}`)
    }
  }

  static async handleRideRequest(request: RideRequest, fromUser: string) {
    // Find the child profile
    const children = await db.getChildren()
    const child = children.find(c => 
      c.first_name.toLowerCase() === request.who.toLowerCase()
    )

    if (!child) {
      await this.sendMessage(`❌ Child "${request.who}" not found in system`)
      return
    }

    // Check token availability
    const tokensToday = await db.getTokensToday()
    const childTokens = tokensToday.find(t => t.child_id === child.id)
    
    if (!childTokens || childTokens.tokens_remaining <= 0) {
      await this.sendMessage(`❌ ${request.who} has no ride tokens left today`)
      return
    }

    // Create inline keyboard for approval
    const approvalMessage = `🚗 **RIDE REQUEST**\n\n` +
      `**Who:** ${request.who}\n` +
      `**Ready:** ${request.ready_time}\n` +
      `**Location:** ${request.location}\n` +
      `**Event:** ${request.event} → ${request.end_time}\n` +
      `**Gear:** ${request.gear}\n` +
      `**Contact:** ${request.contact}\n\n` +
      `**Tokens Available:** ${childTokens.tokens_remaining}\n\n` +
      `Reply with: \`OK — ${request.who}: ${request.event} | ${request.ready_time}–${request.end_time} | 1 token | ${request.location} | today\``

    await this.sendMessage(approvalMessage)
  }

  static async handleApprovalReceipt(approval: ApprovalReceipt, fromUser: string) {
    try {
      // Find child
      const children = await db.getChildren()
      const child = children.find(c => 
        c.first_name.toLowerCase() === approval.kid.toLowerCase()
      )

      if (!child) {
        await this.sendMessage(`❌ Child "${approval.kid}" not found`)
        return
      }

      // Use tokens
      await db.useTokens(child.id, approval.tokens)

      // Create calendar event (simplified - you'll enhance this)
      const eventDate = approval.date === 'today' ? new Date() : new Date(approval.date)
      const startTime = new Date(`${eventDate.toDateString()} ${approval.start}`)
      
      // Find on-call parent as captain
      const onCallParent = await db.getTodaysOnCall()
      const parents = await db.getParents()
      const captain = parents.find(p => p.first_name === onCallParent)

      if (captain) {
        // This would integrate with your calendar system
        // For now, just log it
        console.log('Would create calendar event:', {
          child_id: child.id,
          title: approval.title,
          start_time: startTime.toISOString(),
          captain_id: captain.id,
          location: approval.pickup_location,
          tokens_used: approval.tokens
        })
      }

      // Get updated token count
      const updatedTokens = await db.getTokensToday()
      const childUpdatedTokens = updatedTokens.find(t => t.child_id === child.id)

      const confirmationMessage = `✅ **RIDE APPROVED**\n\n` +
        `**${approval.kid}:** ${approval.title}\n` +
        `**Time:** ${approval.start}–${approval.end}\n` +
        `**Pickup:** ${approval.pickup_location}\n` +
        `**Tokens Used:** ${approval.tokens}\n` +
        `**Remaining Today:** ${childUpdatedTokens?.tokens_remaining || 0}\n` +
        `**Date:** ${approval.date}`

      await this.sendMessage(confirmationMessage)

    } catch (error) {
      console.error('Error handling approval:', error)
      await this.sendMessage(`❌ Error processing approval: ${error}`)
    }
  }

  static async handleWaterJugCommand(message: string, fromUser: string) {
    // Parse "/jug 3 full" or "/jug 5 empty"
    const parts = message.split(' ')
    if (parts.length !== 3) {
      await this.sendMessage('❌ Usage: `/jug [number] [full/empty]`')
      return
    }

    const jugNumber = parseInt(parts[1])
    const status = parts[2].toLowerCase()

    if (jugNumber < 1 || jugNumber > 6) {
      await this.sendMessage('❌ Jug number must be 1-6')
      return
    }

    if (!['full', 'empty', 'in_use'].includes(status)) {
      await this.sendMessage('❌ Status must be: full, empty, or in_use')
      return
    }

    try {
      await db.updateWaterJug(jugNumber, status as any)
      const waterStatus = await db.getWaterStatus()

      await this.sendMessage(
        `✅ Jug #${jugNumber} marked as **${status}**\n\n` +
        `💧 **Water Status:**\n` +
        `• Full: ${waterStatus.jugs_full}/6\n` +
        `• Empty: ${waterStatus.jugs_empty}/6\n` +
        `• Est. days left: ${waterStatus.estimated_days_left}`
      )

      // Check if we need to alert about low water
      if (waterStatus.jugs_full <= 2) {
        const jugCaptainId = await db.getConfig('jug_captain_id')
        if (jugCaptainId) {
          await this.sendMessage(`🚨 **LOW WATER ALERT** - Only ${waterStatus.jugs_full} jugs remaining!`)
        }
      }

    } catch (error) {
      await this.sendMessage(`❌ Error updating jug: ${error}`)
    }
  }

  static async handleWaterStatusCommand() {
    try {
      const waterStatus = await db.getWaterStatus()
      
      await this.sendMessage(
        `💧 **WATER STATUS**\n\n` +
        `• Full: ${waterStatus.jugs_full}/6 jugs\n` +
        `• Empty: ${waterStatus.jugs_empty}/6 jugs\n` +
        `• In Use: ${waterStatus.jugs_in_use}/6 jugs\n` +
        `• Est. Days Left: ${waterStatus.estimated_days_left}\n\n` +
        `**Next Refill Window:** Tue/Fri 5-7pm`
      )
    } catch (error) {
      await this.sendMessage(`❌ Error getting water status: ${error}`)
    }
  }

  static async handleSprintCommand(message: string, fromUser: string) {
    // Parse "/sprint revenue 40" or "/sprint fulfill 35"
    const parts = message.split(' ')
    if (parts.length !== 3) {
      await this.sendMessage('❌ Usage: `/sprint [revenue/fulfill] [target_amount]`')
      return
    }

    const sprintType = parts[1].toLowerCase()
    const targetAmount = parseFloat(parts[2])

    if (!['revenue', 'fulfill'].includes(sprintType)) {
      await this.sendMessage('❌ Sprint type must be: revenue or fulfill')
      return
    }

    if (isNaN(targetAmount) || targetAmount <= 0) {
      await this.sendMessage('❌ Target amount must be a positive number')
      return
    }

    try {
      // This would create a sprint tracking entry
      console.log('Would log sprint:', {
        type: sprintType,
        target: targetAmount,
        user: fromUser
      })

      const todayRevenue = await db.getTodaysRevenue()
      
      await this.sendMessage(
        `🎯 **${sprintType.toUpperCase()} SPRINT STARTED**\n\n` +
        `• Target: $${targetAmount}\n` +
        `• Current Revenue Today: $${todayRevenue}\n` +
        `• Time: ${new Date().toLocaleTimeString()}`
      )

    } catch (error) {
      await this.sendMessage(`❌ Error starting sprint: ${error}`)
    }
  }

  static async handleSaleCommand(message: string, fromUser: string) {
    // Parse "/sold $25 pothos #FB"
    const match = message.match(/\/sold\s+\$?(\d+(?:\.\d{2})?)\s+(.+)\s+#(\w+)/)
    
    if (!match) {
      await this.sendMessage('❌ Usage: `/sold $amount product_name #channel`')
      return
    }

    const [, amount, product, channel] = match
    const grossAmount = parseFloat(amount)

    try {
      await db.logSale(channel.toUpperCase(), product, grossAmount, 0)
      
      const todayRevenue = await db.getTodaysRevenue()
      
      await this.sendMessage(
        `💰 **SALE LOGGED**\n\n` +
        `• Product: ${product}\n` +
        `• Amount: $${grossAmount}\n` +
        `• Channel: #${channel}\n` +
        `• Today's Total: $${todayRevenue}`
      )

    } catch (error) {
      await this.sendMessage(`❌ Error logging sale: ${error}`)
    }
  }

  static async handleGreenlightPost(message: string, fromUser: string) {
    // Parse "Greenlights Tue — Zoey: JROTC 3:30–5:30 ✅ (no extras) | Kaylee: HW club 4–5:15 ✅ (1 token)"
    try {
      const dayMatch = message.match(/Greenlights\s+(\w+)\s+—\s+(.+)/)
      if (!dayMatch) {
        await this.sendMessage('❌ Invalid greenlights format')
        return
      }

      const [, day, content] = dayMatch
      const childEntries = content.split('|').map(entry => entry.trim())

      let processedCount = 0
      
      for (const entry of childEntries) {
        // Parse "Zoey: JROTC 3:30–5:30 ✅ (1 token)"
        const childMatch = entry.match(/^(\w+):\s+(.+)/)
        if (childMatch) {
          const [, childName, activities] = childMatch
          console.log(`Would store greenlights for ${childName}: ${activities}`)
          processedCount++
        }
      }

      await this.sendMessage(
        `✅ **GREENLIGHTS POSTED**\n\n` +
        `• Day: ${day}\n` +
        `• Children: ${processedCount}\n` +
        `• Posted by: ${fromUser}`
      )

    } catch (error) {
      await this.sendMessage(`❌ Error processing greenlights: ${error}`)
    }
  }

  // Daily automated messages
  static async sendDailyOnCallAnnouncement() {
    try {
      const onCallParent = await db.getTodaysOnCall()
      await this.sendMessage(`📅 **On-Call Today:** ${onCallParent}`)
    } catch (error) {
      console.error('Error sending on-call announcement:', error)
    }
  }

  static async sendWaterReminder() {
    try {
      const waterStatus = await db.getWaterStatus()
      if (waterStatus.jugs_full <= 2) {
        await this.sendMessage(
          `🚨 **WATER REFILL NEEDED**\n\n` +
          `Only ${waterStatus.jugs_full} jugs remaining!\n` +
          `Refill window: Today 5-7pm`
        )
      }
    } catch (error) {
      console.error('Error sending water reminder:', error)
    }
  }
}

// Export for use in API routes
export { FamilyTelegramBot as TelegramBot }