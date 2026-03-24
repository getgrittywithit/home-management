import { NextRequest, NextResponse } from 'next/server'

const VISIT_NOTE_PROMPT = `You are a helpful medical visit note analyzer for a family health management app.
Analyze the following doctor visit notes and return a JSON object with these fields:

{
  "synopsis": "A clear, plain-English summary of the visit (2-4 sentences). Avoid medical jargon — explain things the way you'd explain to a family member.",
  "diagnoses": ["List each diagnosis or condition discussed"],
  "tasks": ["List each action item or follow-up task the patient needs to do (e.g., 'Schedule follow-up in 6 weeks', 'Get blood work done', 'Start physical therapy')"],
  "prescriptions": ["List each medication prescribed or changed, including dosage if mentioned (e.g., 'Adderall XR 20mg - once daily', 'Gabapentin 300mg - three times daily')"],
  "followup": "When and why the next follow-up should happen (e.g., 'Return in 3 months for blood pressure recheck'). Say 'None specified' if not mentioned."
}

IMPORTANT:
- Use plain English, not medical jargon
- If something is unclear, note it as "unclear from notes"
- Be thorough — don't miss any tasks or prescriptions
- Only return the JSON object, no other text`

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI features not configured. Add ANTHROPIC_API_KEY to your Vercel environment variables.' },
        { status: 500 }
      )
    }

    const contentType = request.headers.get('content-type') || ''

    let messages: any[]

    if (contentType.includes('multipart/form-data')) {
      // File upload (image or PDF of visit notes)
      const formData = await request.formData()
      const file = formData.get('file') as File | null

      if (!file) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
      }

      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 413 })
      }

      const mimeType = file.type
      const isImage = mimeType.startsWith('image/')
      const isPdf = mimeType === 'application/pdf'
      const isText = mimeType.startsWith('text/')

      if (isImage) {
        const buffer = await file.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        messages = [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType as string, data: base64 }
            },
            { type: 'text', text: `These are doctor visit notes. ${VISIT_NOTE_PROMPT}` }
          ]
        }]
      } else if (isPdf) {
        const buffer = await file.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        messages = [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 }
            },
            { type: 'text', text: `These are doctor visit notes. ${VISIT_NOTE_PROMPT}` }
          ]
        }]
      } else if (isText) {
        const textContent = await file.text()
        messages = [{
          role: 'user',
          content: `Here are doctor visit notes:\n\n${textContent}\n\n${VISIT_NOTE_PROMPT}`
        }]
      } else {
        return NextResponse.json(
          { error: 'Unsupported file type. Use an image, PDF, or text file.' },
          { status: 400 }
        )
      }
    } else {
      // Text-based notes (pasted or typed)
      const body = await request.json()
      const { rawNotes } = body

      if (!rawNotes || !rawNotes.trim()) {
        return NextResponse.json({ error: 'No visit notes provided' }, { status: 400 })
      }

      messages = [{
        role: 'user',
        content: `Here are doctor visit notes:\n\n${rawNotes}\n\n${VISIT_NOTE_PROMPT}`
      }]
    }

    // Call Claude
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Claude API error:', err)
      return NextResponse.json(
        { error: 'AI analysis failed. Please try again.' },
        { status: 500 }
      )
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || ''

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'Could not parse AI response. Please try again.' },
        { status: 500 }
      )
    }

    const parsed = JSON.parse(jsonMatch[0])

    return NextResponse.json({
      synopsis: parsed.synopsis || '',
      diagnoses: Array.isArray(parsed.diagnoses) ? parsed.diagnoses : [],
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      prescriptions: Array.isArray(parsed.prescriptions) ? parsed.prescriptions : [],
      followup: parsed.followup || 'None specified'
    })

  } catch (error) {
    console.error('Error analyzing visit notes:', error)
    return NextResponse.json(
      { error: 'Something went wrong analyzing the notes. Please try again.' },
      { status: 500 }
    )
  }
}
