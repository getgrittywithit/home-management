import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { createNotification } from '@/lib/notifications'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

// ============================================================================
// SAFETY-1: Crisis & Concern Detection
// ============================================================================
const CRISIS_KEYWORDS = [
  'want to die', 'kill myself', 'end it all', 'better off dead',
  'nobody would care', 'wish i was dead', 'hurt myself', 'self harm',
  'cut myself', 'suicide', 'dont want to be here', "don't want to be here",
  'dont want to live', "don't want to live", 'hate myself so much',
  'want to disappear', 'give up on everything', 'no reason to live',
  'better off without me', 'want it to stop', 'end my life',
]

const CONCERN_KEYWORDS = [
  'hate myself', "i'm stupid", 'im stupid', "can't do anything right",
  "can't do anything", 'ugly', 'i am fat', "i'm fat", 'im fat',
  'dumb', 'useless', 'broken', 'hate my life', 'nobody likes me',
  'wish i was someone else', 'not good enough', 'always mess up',
  "can't do this", "what's the point", 'whats the point',
  "don't care anymore", 'nothing matters', 'everyone hates me',
  'i am worthless', "i'm worthless", 'im worthless', 'no one cares',
]

function detectSafetyLevel(message: string): 'crisis' | 'concern' | 'safe' {
  const lower = message.toLowerCase().replace(/['']/g, "'")
  if (CRISIS_KEYWORDS.some(kw => lower.includes(kw))) return 'crisis'
  if (CONCERN_KEYWORDS.some(kw => lower.includes(kw))) return 'concern'
  return 'safe'
}

async function ensureSafetyTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS safety_events (
      id SERIAL PRIMARY KEY,
      kid_name TEXT NOT NULL,
      event_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      source TEXT DEFAULT 'ai_buddy',
      message_snippet TEXT,
      context_data JSONB,
      ai_response_given BOOLEAN DEFAULT TRUE,
      parent_notified BOOLEAN DEFAULT TRUE,
      parent_acknowledged BOOLEAN DEFAULT FALSE,
      acknowledged_at TIMESTAMPTZ,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {})
}

async function logSafetyEvent(kidName: string, level: 'crisis' | 'concern', message: string) {
  const kid = kidName.toLowerCase()
  const kidDisplay = kidName.charAt(0).toUpperCase() + kidName.slice(1).toLowerCase()

  await ensureSafetyTable()

  // Log event
  await db.query(
    `INSERT INTO safety_events (kid_name, event_type, severity, source, message_snippet, parent_notified)
     VALUES ($1, $2, $3, 'ai_buddy', $4, TRUE)`,
    [kid, `${level}_keyword`, level === 'crisis' ? 'high' : 'medium', message.substring(0, 100)]
  ).catch(e => console.error('Safety event log failed:', e))

  // Notify parent
  if (level === 'crisis') {
    await createNotification({
      title: `URGENT: Check on ${kidDisplay} now`,
      message: `${kidDisplay} expressed something concerning in AI Buddy. Please check in with them immediately.`,
      source_type: 'crisis_detection',
      source_ref: `safety-crisis-${kid}-${Date.now()}`,
      link_tab: 'health',
      icon: '🚨',
    }).catch(e => console.error('Crisis notification failed:', e))
  } else {
    await createNotification({
      title: `${kidDisplay} might need encouragement`,
      message: `${kidDisplay} expressed some negative feelings in AI Buddy. May be worth a check-in.`,
      source_type: 'concern_detection',
      source_ref: `safety-concern-${kid}-${Date.now()}`,
      link_tab: 'health',
      icon: '💛',
    }).catch(e => console.error('Concern notification failed:', e))
  }
}

const KID_AGES: Record<string, number> = {
  amos: 17, zoey: 15, kaylee: 13, ellie: 12, wyatt: 10, hannah: 8,
}

const KID_SYSTEM_PROMPT = (kidName: string, grade: string, age?: number, safetyLevel?: string) => {
  const kidAge = age || 10
  const baseRules = `You help ${kidName} navigate their family portal, understand their tasks, find things, and stay encouraged.
Answer questions using their portal data AND the household knowledge provided below.

WHEN DATA IS MISSING — read carefully:
- If you have PARTIAL data (e.g. some tasks but not all), share what you DO know and be honest about the rest.
- For "how many stars do I need" / "am I done for the day" questions: look at the daily checklist. Each uncompleted item ≈ 1 star. Count the remaining items. The context already tells you "Stars to finish today: N".
- For questions about routines, zones, Belle care, meals, bedtime, pets: use the HOUSEHOLD KNOWLEDGE block below — it is always true, even when a specific DB query returned nothing.
- ONLY suggest "send Mom a note from Requests" as a LAST RESORT, when (a) you truly have zero relevant data AND (b) the question isn't about anything in the household system.
- NEVER say "ask Mom" for: daily checklist, zone chores, Belle care schedule, meal duties, bedtime, pet care. Those live in the data below — use them.
- For fun, learning, or general knowledge questions: just answer. You don't need portal data for those.

FIRST MESSAGE OF THE DAY:
When ${kidName} first says "good morning" / "hi" / "hello" / "what's my day look like" / "what do I need to do today", give a brief daily rundown in 4–5 sentences:
1. Greet them by name and name today's weekday.
2. Highlight their top 3–5 real items for today — pulled from the data block (checklist remaining, zone, Belle status, meal duty if their night).
3. Mention their star balance.
4. Keep it SHORT and close with one friendly nudge ("What do you want to tackle first?").

Never share information about other family members' private data (mood, health, concerns), finances, or parent-only settings.
Never talk down. ${kidName} is capable and smart. Encourage problem-solving, not dependence.

CRITICAL SAFETY RULES — follow these exactly:
If ${kidName} expresses self-harm, suicidal thoughts, or wanting to die:
- Take it seriously. Do NOT dismiss it. Do NOT change the subject.
- Say something like: "I hear you, and I'm glad you told me. These feelings are real and they matter."
- ALWAYS say: "This is really important — please go talk to Mom or Dad right now. They love you and want to help."
- Do NOT try to be a therapist. Do NOT give coping strategies for crisis. Direct them to a person.
- Keep your response short and warm. Don't lecture.

If ${kidName} engages in negative self-talk (calling themselves stupid, ugly, worthless, etc.):
- Do NOT agree or validate the negative belief.
- Do NOT dismiss their feelings with "You're not stupid!" — that invalidates how they feel.
- Acknowledge the feeling, then gently challenge the belief:
  "It sounds like you're being really hard on yourself. That's a feeling, not a fact."
  "Having a tough time doesn't mean you can't do it. It means it's hard right now."
- Reference real achievements from their data when possible.
- If negative talk persists, suggest: "I think talking to Mom would really help. Want to send her a note?"

NEVER agree that a child is stupid, ugly, worthless, or hopeless.
NEVER suggest they "just think positive" — that's dismissive.
NEVER roleplay as a therapist or provide clinical mental health advice.
NEVER ignore warning signs to keep the conversation "fun."
${safetyLevel === 'crisis' ? `\nIMPORTANT: ${kidName}'s last message contained very concerning language. Respond with warmth and immediately direct them to talk to Mom or Dad. Keep it short, caring, and clear.` : ''}
${safetyLevel === 'concern' ? `\nNOTE: ${kidName}'s message contained some negative self-talk. Be especially warm and encouraging. Gently challenge any negative beliefs using their real achievements.` : ''}`

  const learningRules = `
You are also a learning companion. When ${kidName} asks about science, history, social studies, geography, art, music, or any school subject:
- Use Socratic prompting: ask follow-up questions to make them think
- Adapt to ${grade}-level vocabulary and complexity
- Connect to their interests when possible
- Encourage deeper exploration: "Want to dig deeper?"
- For hands-on learners, suggest a simple activity or experiment
- You can use your full knowledge for learning topics — not limited to portal data`

  const taskRules = `
If ${kidName} has uncompleted important tasks visible in their data:
- On the first message, casually mention ONE undone task: "Hey, looks like you still have [task] on your list. No rush — just making sure it's on your radar."
- Do NOT list ALL undone tasks. Do NOT repeat the reminder in the same conversation.
- If they say they'll do it later, say "Sounds good" and move on.`

  if (kidAge >= 15) {
    return `You're ${kidName}'s portal assistant. ${kidName} is in ${grade}.
${baseRules}
${learningRules}
${taskRules}
Talk to ${kidName} like a capable young adult. Be direct, clear, and respectful — no fluff.
If they ask about something complex, give them a real answer. They can handle it.
Help them think through problems rather than just giving answers.
Keep responses concise.`
  } else if (kidAge >= 11) {
    return `You're ${kidName}'s portal helper. ${kidName} is in ${grade}.
${baseRules}
${learningRules}
${taskRules}
Be warm and encouraging but not cutesy. ${kidName} is growing up — talk to them like it.
Use clear language. Celebrate their wins. If they're stuck, help them figure it out step by step.
Keep responses short and focused.`
  } else {
    return `You're ${kidName}'s friendly helper! ${kidName} is in ${grade}.
${baseRules}
${learningRules}
${taskRules}
Be warm, patient, and encouraging. Use simple, clear sentences.
Celebrate small wins. If they're confused, break things into smaller steps.
Keep responses short — 2-3 sentences is perfect.`
  }
}

const HOUSEHOLD_KNOWLEDGE = `
HOUSEHOLD SYSTEM KNOWLEDGE (always true — use these facts any time a DB query is missing):

ZONE ROTATION (6-week cycle, Monday-start, Mon–Sun weeks):
- Zones: Hotspot, Kitchen, Guest Bath, Kids Bath, Pantry, Floors
- Each kid rotates through all 6 zones over 6 weeks
- Zone chores happen 3x/day: Morning (before school), Afternoon (after school), Evening (before bed)
- Weekend zone rules: Saturday and Sunday are deep clean days for the CURRENT zone (same zone as Mon–Fri). Monday = zone changeover to the next zone in rotation. The weekend is NOT split between two zones.

BELLE (DOG) CARE SCHEDULE:
- Weekdays (fixed): Mon=Kaylee, Tue=Amos, Wed=Hannah, Thu=Wyatt, Fri=Ellie (Zoey is excluded)
- Daily tasks on your day: AM Feed + Walk (7:00am), PM Feed (5:00pm), PM Walk (6:30pm)
- Weekends: 5-week rotating cycle (Hannah → Wyatt → Amos → Kaylee → Ellie)
- Grooming: Bath biweekly Saturdays, Nail Trim biweekly Sundays

MEAL ROTATION (2-week cycle):
- Mon=Kaylee, Tue=Zoey, Wed=Wyatt, Thu=Amos, Fri=Ellie & Hannah, Sat/Sun=Parents
- Week 1 themes: American Comfort → Asian → Bar Night → Mexican → Pizza & Italian → Grill → Roast/Comfort
- Week 2 themes: Soup/Comfort → Asian → Easy/Lazy → Mexican → Pizza & Italian → Experiment → Brunch/Light
- The dinner manager picks a meal from the themed meal list using the Meal Picker

STAR SYSTEM:
- Kids earn stars for completing checklist items, zone tasks, Belle care, and good behavior
- Stars are spent in the reward shop
- Daily goal varies per kid — count remaining checklist items to know how many stars are left to earn today

BEDTIME:
- 8–9pm = evening routine (hygiene, Belle PM if your day, tidy, meds if applicable)
- 9pm = all kids in bed — including Amos (17) and Zoey (15)

OTHER PETS:
- Midnight (bunny): Ellie primary, Hannah + Wyatt helpers. Daily spot clean, feed, hay, water, brush (focus on mane)
- Hades (snake): Zoey only. Daily water check + visual health. Feeds 2-3 live mice every 7-14 days
- Spike (bearded dragon): Amos primary, Kaylee + Wyatt helpers. Daily feed + water, spot clean. UVB light critical.
`

const PARENT_SYSTEM_PROMPT = `You are Lola's family management assistant. The Moses family has 6 kids (Amos 17, Zoey 15, Kaylee 13, Ellie 12, Wyatt 10, Hannah 8), two businesses (Triton Handyman, Grit Collective), homeschool for 4 kids, public school for 2.
Help Lola with daily task tracking, kid progress summaries, scheduling, meal planning, and any family system question.
Be concise — Lola is busy. Give direct answers, not essays.
Lola is hard of hearing — if suggesting she call someone, also suggest email as preferred.
Use the family data provided below to answer questions.`

const KID_GRADES: Record<string, string> = {
  amos: '10th grade', ellie: '6th grade', wyatt: '4th grade',
  hannah: '3rd grade', zoey: '9th grade', kaylee: '7th grade',
}

async function getKidContext(kidName: string): Promise<string> {
  const kid = kidName.toLowerCase()
  const parts: string[] = [`Kid: ${kidName}, Grade: ${KID_GRADES[kid] || 'unknown'}, Age: ${KID_AGES[kid] || 'unknown'}`]

  try {
    // Today's tasks
    const tasks = await db.query(
      `SELECT t.task_label, t.subject,
              CASE WHEN c.id IS NOT NULL THEN 'done' ELSE 'not done' END AS status
       FROM homeschool_tasks t
       LEFT JOIN homeschool_task_completions c ON c.task_id = t.id AND c.task_date = CURRENT_DATE
       WHERE t.kid_name = $1 AND t.active = true
       ORDER BY t.subject, t.sort_order`,
      [kid]
    ).catch(() => [])
    if (tasks.length > 0) {
      parts.push('Today\'s tasks: ' + tasks.map((t: any) => `${t.task_label} (${t.status})`).join(', '))
    }

    // Star balance
    const stars = await db.query(`SELECT stars_balance FROM digi_pets WHERE kid_name = $1`, [kid]).catch(() => [])
    if (stars[0]) parts.push(`Star balance: ${stars[0].stars_balance}`)

    // Current book
    const book = await db.query(
      `SELECT book_title, current_page, total_pages FROM kid_book_progress WHERE kid_name = $1 AND status = 'reading' LIMIT 1`,
      [kid]
    ).catch(() => [])
    if (book[0]) parts.push(`Currently reading: ${book[0].book_title} (page ${book[0].current_page || '?'}/${book[0].total_pages || '?'})`)

    // Points balance
    const points = await db.query(`SELECT balance FROM kid_points_balance WHERE kid_name = $1`, [kid]).catch(() => [])
    if (points[0]) parts.push(`Points balance: ${points[0].balance}`)

    // Current zone assignment
    const zone = await db.query(
      `SELECT zone_name FROM zone_task_rotation WHERE kid_name = $1 AND week_start <= CURRENT_DATE ORDER BY week_start DESC LIMIT 1`,
      [kid]
    ).catch(() => [])
    if (zone[0]) parts.push(`This week's zone: ${zone[0].zone_name}`)

    // Today's mood
    const mood = await db.query(
      `SELECT mood_score, one_win FROM kid_mood_log WHERE child_name = $1 AND log_date = CURRENT_DATE`,
      [kid]
    ).catch(() => [])
    if (mood[0]) {
      parts.push(`Today's mood: ${mood[0].mood_score}/5`)
      if (mood[0].one_win) parts.push(`Today's win: ${mood[0].one_win}`)
    }

    // Active streaks
    const streak = await db.query(
      `SELECT streak_type, current_count FROM kid_chore_streaks WHERE kid_name = $1 AND current_count > 0 ORDER BY current_count DESC LIMIT 1`,
      [kid]
    ).catch(() => [])
    if (streak[0]) parts.push(`Best active streak: ${streak[0].streak_type} (${streak[0].current_count} days)`)

    // Recent achievement
    const achievement = await db.query(
      `SELECT title FROM kid_achievements WHERE kid_name = $1 ORDER BY earned_at DESC LIMIT 1`,
      [kid]
    ).catch(() => [])
    if (achievement[0]) parts.push(`Latest achievement: ${achievement[0].title}`)

    // Recent zone/pet task completions (last 30 days)
    const zoneCompletions = await db.query(
      `SELECT r.assigned_date, t.task_text, t.zone_key
       FROM zone_task_rotation r
       JOIN zone_task_library t ON r.task_id = t.id
       WHERE r.kid_name = $1 AND r.completed = TRUE
         AND r.assigned_date >= CURRENT_DATE - INTERVAL '30 days'
       ORDER BY r.assigned_date DESC LIMIT 15`,
      [kid]
    ).catch(() => [])
    if (zoneCompletions.length > 0) {
      const lines = zoneCompletions.map((c: any) => {
        const d = new Date(c.assigned_date)
        const daysAgo = Math.floor((Date.now() - d.getTime()) / 86400000)
        const when = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`
        return `${c.task_text} (${c.zone_key}) — ${when}`
      })
      parts.push('Recent task completions:\n' + lines.join('\n'))
    }

    // ── BUDDY-FIX-1: Daily life data the Buddy needs ─────────────────────

    // Profile ID lookup — daily_checklist_items uses child_id (UUID), not kid_name
    const profile = await db.query(
      `SELECT id FROM profiles WHERE LOWER(first_name) = LOWER($1) AND role = 'child' LIMIT 1`,
      [kid]
    ).catch(() => [])
    const profileId: string | null = profile[0]?.id || null

    // Daily checklist items (morning routine, chores, hygiene, school tasks)
    if (profileId) {
      const checklist = await db.query(
        `SELECT title, category, completed, priority
         FROM daily_checklist_items
         WHERE child_id = $1 AND date = CURRENT_DATE
         ORDER BY priority ASC, category ASC, title ASC`,
        [profileId]
      ).catch(() => [])
      if (checklist.length > 0) {
        const done = checklist.filter((c: any) => c.completed).length
        const total = checklist.length
        const remaining = total - done
        parts.push(`Daily checklist: ${done}/${total} done, ${remaining} remaining`)
        // BUDDY-FIX-4: each checklist item ≈ 1 star, remaining = stars-to-go for "done today"
        parts.push(`Stars to finish today: ${remaining} (1 per remaining checklist item)`)

        const byCategory: Record<string, any[]> = {}
        for (const c of checklist) {
          const cat = c.category || 'Other'
          if (!byCategory[cat]) byCategory[cat] = []
          byCategory[cat].push(c)
        }
        for (const [cat, items] of Object.entries(byCategory)) {
          const itemLines = items.map((i: any) => `  - ${i.title}: ${i.completed ? '✅ done' : '⬜ not done'}`)
          parts.push(`${cat}:\n${itemLines.join('\n')}`)
        }
      }
    }

    // Belle dog care — is today this kid's Belle day?
    const dayOfWeek = new Date().getDay()  // 0=Sun, 1=Mon...
    const belleWeekday: Record<number, string> = {
      1: 'kaylee', 2: 'amos', 3: 'hannah', 4: 'wyatt', 5: 'ellie',
    }
    const todaysBelleKid = belleWeekday[dayOfWeek]

    if (todaysBelleKid === kid) {
      const belleTasks = await db.query(
        `SELECT task, completed FROM belle_care_log
         WHERE care_date = CURRENT_DATE AND kid_name = $1`,
        [kid]
      ).catch(() => [])
      const taskList = ['AM Feed + Walk (7:00am)', 'PM Feed (5:00pm)', 'PM Walk (6:30pm)']
      const doneSet = new Set(belleTasks.filter((t: any) => t.completed).map((t: any) => t.task))
      parts.push(`🐕 TODAY IS YOUR BELLE DAY! Tasks:`)
      for (const t of taskList) {
        parts.push(`  - ${t}: ${doneSet.has(t) ? '✅ done' : '⬜ not done'}`)
      }
    } else if (dayOfWeek >= 1 && dayOfWeek <= 5 && todaysBelleKid) {
      const cap = todaysBelleKid.charAt(0).toUpperCase() + todaysBelleKid.slice(1)
      parts.push(`Belle care today: ${cap}'s day`)
    } else {
      parts.push(`Belle care today: Weekend rotation (check calendar)`)
    }

    // Belle grooming on weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      const grooming = await db.query(
        `SELECT task, completed FROM belle_grooming_log
         WHERE kid_name = $1 AND due_date = CURRENT_DATE`,
        [kid]
      ).catch(() => [])
      if (grooming.length > 0) {
        parts.push('Belle grooming today: ' + grooming.map((g: any) =>
          `${g.task} (${g.completed ? '✅' : '⬜'})`
        ).join(', '))
      }
    }

    // Meal duty — is this kid tonight's dinner manager?
    const mealDayMap: Record<number, { kid: string; theme_w1: string; theme_w2: string }> = {
      1: { kid: 'kaylee', theme_w1: 'American Comfort', theme_w2: 'Soup/Comfort/Crockpot' },
      2: { kid: 'zoey',   theme_w1: 'Asian Night',      theme_w2: 'Asian Night' },
      3: { kid: 'wyatt',  theme_w1: 'Bar Night',        theme_w2: 'Easy/Lazy Night' },
      4: { kid: 'amos',   theme_w1: 'Mexican Night',    theme_w2: 'Mexican Night' },
      5: { kid: 'ellie',  theme_w1: 'Pizza & Italian',  theme_w2: 'Pizza & Italian' }, // Ellie & Hannah share
      0: { kid: 'parents', theme_w1: 'Roast/Comfort',   theme_w2: 'Brunch/Light' },
      6: { kid: 'parents', theme_w1: 'Grill Night',     theme_w2: 'Experiment/Big Cook' },
    }
    const todayMeal = mealDayMap[dayOfWeek]
    // Epoch: March 30, 2026 = Week 1 Monday
    const epochDate = new Date('2026-03-30T00:00:00').getTime()
    const daysSinceEpoch = Math.floor((Date.now() - epochDate) / 86400000)
    const weekNumber = Math.floor(daysSinceEpoch / 7) % 2 === 0 ? 1 : 2
    const theme = weekNumber === 1 ? todayMeal?.theme_w1 : todayMeal?.theme_w2

    const isCookingTonight = todayMeal?.kid === kid || (kid === 'hannah' && dayOfWeek === 5)
    if (isCookingTonight && theme) {
      parts.push(`🍳 YOU'RE THE DINNER MANAGER TONIGHT! Theme: ${theme}`)
      const mealPick = await db.query(
        `SELECT ml.name as meal_name, wp.status
         FROM meal_week_plan wp
         LEFT JOIN meal_library ml ON wp.meal_id = ml.id
         WHERE wp.kid_name = $1 AND wp.day_of_week = $2
         ORDER BY wp.week_start DESC LIMIT 1`,
        [kid, dayOfWeek]
      ).catch(() => [])
      if (mealPick[0]?.meal_name) {
        parts.push(`  Meal picked: ${mealPick[0].meal_name}`)
      } else {
        parts.push(`  ⚠️ No meal picked yet — use the Meal Picker to choose!`)
      }
    } else if (todayMeal && theme) {
      const managerName = todayMeal.kid === 'parents'
        ? 'Mom & Dad'
        : todayMeal.kid.charAt(0).toUpperCase() + todayMeal.kid.slice(1)
      parts.push(`Tonight's dinner: ${managerName}'s night (${theme})`)
    }

    // Zone task details — actual tasks for the assigned zone
    if (zone[0]?.zone_name) {
      const zoneTasks = await db.query(
        `SELECT t.task_text, t.task_type, t.frequency,
                CASE WHEN r.completed THEN 'done' ELSE 'not done' END as status
         FROM zone_task_library t
         LEFT JOIN zone_task_rotation r ON r.task_id = t.id
           AND r.kid_name = $1 AND r.assigned_date = CURRENT_DATE
         WHERE t.zone_key = $2 AND t.active = TRUE AND t.deleted_at IS NULL
         ORDER BY t.task_type, t.sort_order`,
        [kid, zone[0].zone_name]
      ).catch(() => [])
      if (zoneTasks.length > 0) {
        const anchors = zoneTasks.filter((t: any) => t.task_type === 'anchor')
        const rotating = zoneTasks.filter((t: any) => t.task_type === 'rotating')
        if (anchors.length > 0) {
          parts.push(`Zone tasks (${zone[0].zone_name}) — Daily:\n` +
            anchors.map((t: any) => `  - ${t.task_text}: ${t.status}`).join('\n'))
        }
        if (rotating.length > 0) {
          parts.push(`Zone tasks (${zone[0].zone_name}) — Rotating:\n` +
            rotating.map((t: any) => `  - ${t.task_text} (${t.frequency}): ${t.status}`).join('\n'))
        }
      }
    }

    // Family events today
    if (profileId) {
      const events = await db.query(
        `SELECT fe.title, fe.event_type, fe.start_time, captain.first_name as captain_name
         FROM family_events fe
         LEFT JOIN profiles captain ON fe.captain_id = captain.id
         WHERE fe.child_id = $1 AND DATE(fe.start_time) = CURRENT_DATE
         ORDER BY fe.start_time ASC`,
        [profileId]
      ).catch(() => [])
      if (events.length > 0) {
        parts.push("Today's events: " + events.map((e: any) => {
          const time = new Date(e.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          return `${e.title || e.event_type} at ${time}`
        }).join(', '))
      }
    }

    // Sick day status
    const sickDay = await db.query(
      `SELECT status FROM kid_sick_days
       WHERE kid_name = $1 AND sick_date = CURRENT_DATE AND status = 'active'`,
      [kid]
    ).catch(() => [])
    if (sickDay[0]) {
      parts.push('🤒 SICK DAY ACTIVE — reduced task load today. Focus on rest.')
    }
  } catch { /* partial context is fine */ }

  return parts.join('\n')
}

async function getParentContext(): Promise<string> {
  const parts: string[] = []

  try {
    // All kids' task progress
    const progress = await db.query(
      `SELECT t.kid_name, COUNT(t.id)::int AS total,
              COUNT(c.id)::int AS completed
       FROM homeschool_tasks t
       LEFT JOIN homeschool_task_completions c ON c.task_id = t.id AND c.task_date = CURRENT_DATE
       WHERE t.active = true
       GROUP BY t.kid_name ORDER BY t.kid_name`
    ).catch(() => [])
    if (progress.length > 0) {
      parts.push('Task progress today: ' + progress.map((p: any) => `${p.kid_name}: ${p.completed}/${p.total}`).join(', '))
    }

    // Pending flags
    const flags = await db.query(
      `SELECT kid_name, reason FROM kid_health_requests WHERE status = 'active' AND created_at::date = CURRENT_DATE`
    ).catch(() => [])
    if (flags.length > 0) parts.push('Health flags: ' + flags.map((f: any) => `${f.kid_name}: ${f.reason}`).join(', '))

    // Pending counts
    const pending = await db.query(
      `SELECT
        (SELECT COUNT(*)::int FROM family_messages WHERE read_at IS NULL) as unread_msgs,
        (SELECT COUNT(*)::int FROM meal_requests WHERE status = 'pending') as meal_reqs,
        (SELECT COUNT(*)::int FROM notifications WHERE read_at IS NULL AND target_role = 'parent') as unread_notifs`
    ).catch(() => [])
    if (pending[0]) {
      const p = pending[0]
      if (p.unread_msgs > 0) parts.push(`Unread kid messages: ${p.unread_msgs}`)
      if (p.meal_reqs > 0) parts.push(`Pending meal requests: ${p.meal_reqs}`)
      if (p.unread_notifs > 0) parts.push(`Unread notifications: ${p.unread_notifs}`)
    }
  } catch { /* partial context is fine */ }

  return parts.join('\n')
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { role, kid_name, message, conversation_id, action } = body

  // Admin actions (no message required)
  if (action === 'admin_review_flag') {
    await db.query(`UPDATE buddy_moderation_flags SET parent_reviewed = TRUE, parent_notes = $2 WHERE id = $1`, [body.flag_id, body.parent_notes || null]).catch(() => {})
    return NextResponse.json({ success: true })
  }
  if (action === 'admin_update_persona') {
    await db.query(`UPDATE buddy_personas SET system_prompt = $2, updated_by = 'parent', updated_at = NOW() WHERE persona_key = $1`, [body.persona_key, body.system_prompt]).catch(() => {})
    return NextResponse.json({ success: true })
  }
  if (action === 'admin_toggle_access') {
    await db.query(
      `UPDATE buddy_access_config SET access_enabled = $3, updated_at = NOW() WHERE kid_name = $1 AND persona_key = $2`,
      [body.kid_name?.toLowerCase(), body.persona_key, body.access_enabled]
    ).catch(() => {})
    return NextResponse.json({ success: true })
  }

  if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 })
  if (!role || !['kid', 'parent'].includes(role)) return NextResponse.json({ error: 'role must be kid or parent' }, { status: 400 })

  // Check daily message limit
  try {
    const limitKey = role === 'kid' ? kid_name?.toLowerCase() : 'lola'
    const maxMessages = role === 'kid' ? 20 : 50
    const countRows = await db.query(
      `SELECT COUNT(*)::int AS count FROM ai_buddy_conversations
       WHERE role = $1 AND COALESCE(kid_name, 'lola') = $2
       AND created_at::date = CURRENT_DATE`,
      [role, limitKey]
    )
    const used = countRows[0]?.count || 0
    if (used >= maxMessages) {
      return NextResponse.json({
        reply: `You've used all ${maxMessages} messages for today. Try again tomorrow!`,
        messages_used: used,
        messages_limit: maxMessages,
      })
    }
  } catch { /* skip limit check on error */ }

  // SAFETY-1: Detect crisis/concern keywords in kid messages
  let safetyLevel: 'crisis' | 'concern' | 'safe' = 'safe'
  if (role === 'kid' && kid_name) {
    safetyLevel = detectSafetyLevel(message)
    if (safetyLevel !== 'safe') {
      await logSafetyEvent(kid_name, safetyLevel, message)
    }
  }

  // Build context
  let systemPrompt: string
  let context: string
  if (role === 'kid') {
    if (!kid_name) return NextResponse.json({ error: 'kid_name required for kid role' }, { status: 400 })
    const kid = kid_name.toLowerCase()
    systemPrompt = KID_SYSTEM_PROMPT(kid_name, KID_GRADES[kid] || 'unknown grade', KID_AGES[kid], safetyLevel)
    context = await getKidContext(kid)
  } else {
    systemPrompt = PARENT_SYSTEM_PROMPT
    context = await getParentContext()
  }

  // Get recent conversation history
  let history: { role: string; content: string }[] = []
  if (conversation_id) {
    try {
      const recent = await db.query(
        `SELECT user_message, assistant_message FROM ai_buddy_conversations
         WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 5`,
        [conversation_id]
      )
      history = recent.reverse().flatMap((r: any) => [
        { role: 'user', content: r.user_message },
        { role: 'assistant', content: r.assistant_message },
      ])
    } catch { /* no history */ }
  }

  // Call Claude API
  if (!ANTHROPIC_API_KEY) {
    // Fallback response when no API key configured
    let fallback = "I'm not fully set up yet — ask Mom to configure the AI assistant. In the meantime, check your My Day view for your tasks!"
    if (role === 'parent') {
      fallback = "I'm not fully set up yet. Add ANTHROPIC_API_KEY to your Vercel environment variables to enable the family assistant."
    }

    // Still log the conversation
    try {
      await db.query(
        `INSERT INTO ai_buddy_conversations (conversation_id, role, kid_name, user_message, assistant_message)
         VALUES ($1, $2, $3, $4, $5)`,
        [conversation_id || null, role, kid_name?.toLowerCase() || null, message, fallback]
      )
    } catch { /* log failed */ }

    return NextResponse.json({ reply: fallback, messages_used: 0, messages_limit: role === 'kid' ? 20 : 50 })
  }

  try {
    const messages = [
      ...history,
      { role: 'user', content: message },
    ]

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: role === 'kid'
          ? `${systemPrompt}\n\nCurrent data:\n${context}\n${HOUSEHOLD_KNOWLEDGE}`
          : `${systemPrompt}\n\nCurrent data:\n${context}`,
        messages,
      }),
    })

    const data = await res.json()
    const reply = data.content?.[0]?.text || "Sorry, I couldn't process that. Try asking in a different way!"

    // BUDDY-3: Detect learning subject
    const subjectMap: Record<string, string[]> = {
      science: ['volcano', 'planet', 'animal', 'plant', 'chemical', 'gravity', 'energy', 'weather', 'ecosystem', 'cell', 'atom', 'electricity', 'magnet', 'experiment', 'photosynthesis'],
      history: ['colonist', 'revolution', 'war', 'president', 'ancient', 'civil rights', 'constitution', 'founding', 'slavery', 'empire', 'independence'],
      social_studies: ['government', 'democracy', 'economy', 'culture', 'citizen', 'law', 'vote', 'rights'],
      geography: ['continent', 'country', 'ocean', 'mountain', 'capital', 'map', 'equator', 'climate'],
      art: ['painting', 'sculpture', 'artist', 'museum', 'color theory', 'pottery'],
      music: ['instrument', 'rhythm', 'melody', 'composer', 'orchestra'],
      pet_care: ['cage', 'clean', 'feed', 'feeding', 'water', 'bedding', 'groom', 'nail', 'substrate', 'hay', 'midnight', 'spike', 'hades', 'belle', 'pet', 'bunny', 'rabbit', 'snake', 'dragon', 'bearded'],
      chore_history: ['chore', 'zone', 'last time', 'when did i', 'how long since', 'overdue', 'streak'],
    }
    let subjectDetected: string | null = null
    if (role === 'kid') {
      const lower = message.toLowerCase()
      for (const [subject, keywords] of Object.entries(subjectMap)) {
        if (keywords.some(kw => lower.includes(kw))) { subjectDetected = subject; break }
      }
    }

    // Log conversation
    try {
      await db.query(
        `INSERT INTO ai_buddy_conversations (conversation_id, role, kid_name, user_message, assistant_message, subject_detected)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [conversation_id || null, role, kid_name?.toLowerCase() || null, message, reply, subjectDetected]
      )
    } catch {
      // Fallback without subject_detected column
      await db.query(
        `INSERT INTO ai_buddy_conversations (conversation_id, role, kid_name, user_message, assistant_message)
         VALUES ($1, $2, $3, $4, $5)`,
        [conversation_id || null, role, kid_name?.toLowerCase() || null, message, reply]
      ).catch(() => {})
    }

    return NextResponse.json({ reply, messages_used: 0, messages_limit: role === 'kid' ? 20 : 50, safety_level: safetyLevel !== 'safe' ? safetyLevel : undefined })
  } catch (error) {
    console.error('AI Buddy error:', error)
    return NextResponse.json({
      reply: "I'm having trouble thinking right now. Try again in a moment!",
      error: true,
    })
  }
}

// Admin GET actions
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || ''

  try {
    if (action === 'admin_get_flags') {
      const rows = await db.query(`SELECT * FROM buddy_moderation_flags ORDER BY created_at DESC LIMIT 50`).catch(() => [])
      return NextResponse.json({ flags: rows })
    }
    if (action === 'admin_get_personas') {
      const rows = await db.query(`SELECT * FROM buddy_personas ORDER BY persona_key`).catch(() => [])
      return NextResponse.json({ personas: rows })
    }
    if (action === 'admin_get_access') {
      const rows = await db.query(`SELECT * FROM buddy_access_config ORDER BY kid_name, persona_key`).catch(() => [])
      return NextResponse.json({ configs: rows })
    }
    if (action === 'admin_get_conversations') {
      const limit = parseInt(searchParams.get('limit') || '30')
      const kid = searchParams.get('kid_name')
      let sql = `SELECT * FROM ai_buddy_conversations`
      const params: any[] = []
      if (kid) { params.push(kid.toLowerCase()); sql += ` WHERE kid_name = $1` }
      sql += ` ORDER BY created_at DESC LIMIT ${Math.min(limit, 100)}`
      const rows = await db.query(sql, params).catch(() => [])
      return NextResponse.json({ conversations: rows })
    }
    if (action === 'session_check') {
      const kid = searchParams.get('kid_name')?.toLowerCase()
      const persona = searchParams.get('persona_key')
      if (!kid || !persona) return NextResponse.json({ error: 'kid_name + persona_key required' }, { status: 400 })
      const { checkAccess } = await import('@/lib/buddySafety')
      const result = await checkAccess(kid, persona)
      return NextResponse.json(result)
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('AI Buddy GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Admin POST actions (append to existing POST switch — handled via action field)
// These are checked BEFORE the main chat logic in the POST handler above
