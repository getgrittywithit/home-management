import TelegramBot from 'node-telegram-bot-api'
import { db } from './database'

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

  // Handle incoming messages
  static async processMessage(message: string, fromUser: string) {
    try {
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

}

// Export for use in API routes
export { FamilyTelegramBot as TelegramBot }