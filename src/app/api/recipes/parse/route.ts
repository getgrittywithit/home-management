import { NextRequest, NextResponse } from 'next/server'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const PARSE_PROMPT = `Extract the recipe from this content. Return a JSON object with exactly these fields:
{
  "title": "recipe name",
  "ingredients": ["ingredient 1", "ingredient 2"],
  "steps": ["step 1", "step 2"]
}
Only return the JSON. No other text.`

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const apiKey = formData.get('apiKey') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large — try a smaller image.' }, { status: 413 })
    }

    const mimeType = file.type
    const isImage = mimeType.startsWith('image/')
    const isPdf = mimeType === 'application/pdf'
    const isText = mimeType.startsWith('text/') || mimeType === 'application/octet-stream'

    let messages: any[]

    if (isImage) {
      // Send image directly to Claude vision
      const buffer = await file.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      const mediaType = mimeType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

      messages = [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 }
          },
          { type: 'text', text: PARSE_PROMPT }
        ]
      }]
    } else if (isPdf || isText) {
      // Extract text content
      let textContent: string

      if (isText) {
        textContent = await file.text()
      } else {
        // For PDFs, read as text (basic extraction — works for text-based PDFs)
        const buffer = await file.arrayBuffer()
        const bytes = new Uint8Array(buffer)
        // Try to extract readable text from PDF
        textContent = extractTextFromPdfBytes(bytes)
        if (!textContent.trim()) {
          // If no text extracted, send as image-like content
          const base64 = Buffer.from(buffer).toString('base64')
          messages = [{
            role: 'user',
            content: [
              {
                type: 'document',
                source: { type: 'base64', media_type: 'application/pdf', data: base64 }
              },
              { type: 'text', text: PARSE_PROMPT }
            ]
          }]

          // Call Claude and return
          const claudeRes = await callClaude(apiKey, messages)
          return NextResponse.json(claudeRes)
        }
      }

      messages = [{
        role: 'user',
        content: `Here is a recipe:\n\n${textContent}\n\n${PARSE_PROMPT}`
      }]
    } else {
      return NextResponse.json({ error: 'Unsupported file type. Use an image, PDF, or text file.' }, { status: 400 })
    }

    const result = await callClaude(apiKey, messages)
    return NextResponse.json(result)

  } catch (error) {
    console.error('Error parsing recipe:', error)
    return NextResponse.json(
      { error: "Couldn't read this file — try a clearer image or paste the recipe manually." },
      { status: 500 }
    )
  }
}

async function callClaude(apiKey: string, messages: any[]): Promise<{ title: string; ingredients: string[]; steps: string[] }> {
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
    throw new Error('AI request failed')
  }

  const data = await response.json()
  const text = data.content?.[0]?.text || ''

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('No JSON in AI response')
  }

  const parsed = JSON.parse(jsonMatch[0])
  return {
    title: parsed.title || '',
    ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
    steps: Array.isArray(parsed.steps) ? parsed.steps : [],
  }
}

/** Basic text extraction from PDF bytes — pulls readable ASCII/UTF strings */
function extractTextFromPdfBytes(bytes: Uint8Array): string {
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
  // Extract text between BT/ET blocks or parentheses in PDF streams
  const parts: string[] = []
  const regex = /\(([^)]+)\)/g
  let match
  while ((match = regex.exec(text)) !== null) {
    const chunk = match[1]
    // Filter out binary garbage — keep only printable strings
    if (chunk.length > 2 && /^[\x20-\x7E\s]+$/.test(chunk)) {
      parts.push(chunk)
    }
  }
  return parts.join(' ')
}
