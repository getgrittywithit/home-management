import jsPDF from 'jspdf'

// ============================================================================
// Shared PDF Generation Utilities
// Reusable by: HEALTH-EXPORT-1, S9 Sensory Report, S10 Spending,
//              ARD-PACKET-1, MED-MOOD-1, RECORDS-1, GAP-3 Excuse Letter
// ============================================================================

export interface PDFOptions {
  title: string
  subtitle?: string
  headerRight?: string
  footerText?: string
  orientation?: 'portrait' | 'landscape'
}

export function createPDF(options: PDFOptions): jsPDF {
  const doc = new jsPDF({ orientation: options.orientation || 'portrait', unit: 'mm', format: 'letter' })
  return doc
}

export function addHeader(doc: jsPDF, title: string, subtitle?: string, pageNum?: number) {
  const pageWidth = doc.internal.pageSize.getWidth()

  // Header bar
  doc.setFillColor(59, 130, 246) // blue-500
  doc.rect(0, 0, pageWidth, 18, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 10, 12)

  if (subtitle) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(subtitle, pageWidth - 10, 12, { align: 'right' })
  }

  doc.setTextColor(0, 0, 0)
  return 22 // y position after header
}

export function addFooter(doc: jsPDF, text: string) {
  const pageHeight = doc.internal.pageSize.getHeight()
  const pageWidth = doc.internal.pageSize.getWidth()
  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  doc.text(text, pageWidth / 2, pageHeight - 8, { align: 'center' })
  doc.setTextColor(0, 0, 0)
}

export function addSectionTitle(doc: jsPDF, title: string, y: number, emoji?: string): number {
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 64, 175) // blue-800
  doc.text(`${emoji ? emoji + ' ' : ''}${title}`, 10, y)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  return y + 6
}

export function addKeyValue(doc: jsPDF, key: string, value: string, y: number, x?: number): number {
  const startX = x || 10
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(`${key}:`, startX, y)
  const keyWidth = doc.getTextWidth(`${key}: `)
  doc.setFont('helvetica', 'normal')
  doc.text(value || 'N/A', startX + keyWidth, y)
  return y + 5
}

export function addTable(doc: jsPDF, headers: string[], rows: string[][], y: number, colWidths?: number[]): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 10
  const tableWidth = pageWidth - margin * 2
  const defaultColWidth = tableWidth / headers.length
  const widths = colWidths || headers.map(() => defaultColWidth)

  // Header row
  doc.setFillColor(243, 244, 246) // gray-100
  doc.rect(margin, y - 4, tableWidth, 6, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  let xPos = margin + 2
  headers.forEach((h, i) => {
    doc.text(h, xPos, y)
    xPos += widths[i]
  })
  y += 5

  // Data rows
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  for (const row of rows) {
    if (y > doc.internal.pageSize.getHeight() - 25) {
      doc.addPage()
      y = 25
    }
    xPos = margin + 2
    row.forEach((cell, i) => {
      const maxWidth = widths[i] - 4
      const lines = doc.splitTextToSize(cell || '', maxWidth)
      doc.text(lines[0] || '', xPos, y)
      xPos += widths[i]
    })
    y += 4.5
  }

  return y + 2
}

export function addMoodChart(doc: jsPDF, moodData: { date: string; score: number }[], y: number): number {
  if (moodData.length === 0) {
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text('No mood data for this period', 10, y)
    doc.setTextColor(0, 0, 0)
    return y + 8
  }

  const chartX = 15
  const chartW = 170
  const chartH = 30
  const chartY = y

  // Y-axis labels (1-5)
  doc.setFontSize(7)
  doc.setTextColor(100, 100, 100)
  for (let i = 5; i >= 1; i--) {
    const labelY = chartY + chartH - ((i - 1) / 4) * chartH
    doc.text(String(i), 10, labelY + 1)
    // Grid line
    doc.setDrawColor(230, 230, 230)
    doc.setLineWidth(0.1)
    doc.line(chartX, labelY, chartX + chartW, labelY)
  }

  // Plot data points
  doc.setDrawColor(59, 130, 246) // blue
  doc.setLineWidth(0.5)
  const step = chartW / Math.max(moodData.length - 1, 1)

  for (let i = 0; i < moodData.length; i++) {
    const x = chartX + i * step
    const score = Math.max(1, Math.min(5, moodData[i].score))
    const pointY = chartY + chartH - ((score - 1) / 4) * chartH

    // Dot
    doc.setFillColor(59, 130, 246)
    doc.circle(x, pointY, 1, 'F')

    // Line to next point
    if (i < moodData.length - 1) {
      const nextX = chartX + (i + 1) * step
      const nextScore = Math.max(1, Math.min(5, moodData[i + 1].score))
      const nextY = chartY + chartH - ((nextScore - 1) / 4) * chartH
      doc.line(x, pointY, nextX, nextY)
    }
  }

  // X-axis date labels (first, middle, last)
  doc.setFontSize(6)
  doc.setTextColor(150, 150, 150)
  if (moodData.length > 0) {
    doc.text(moodData[0].date.slice(5), chartX, chartY + chartH + 4)
    if (moodData.length > 2) {
      const midIdx = Math.floor(moodData.length / 2)
      doc.text(moodData[midIdx].date.slice(5), chartX + chartW / 2, chartY + chartH + 4, { align: 'center' })
    }
    doc.text(moodData[moodData.length - 1].date.slice(5), chartX + chartW, chartY + chartH + 4, { align: 'right' })
  }

  doc.setTextColor(0, 0, 0)
  return chartY + chartH + 10
}

export function addAdherenceGrid(doc: jsPDF, data: { date: string; taken: boolean }[], y: number): number {
  if (data.length === 0) return y + 5

  const startX = 15
  const cellSize = 5
  const cols = 7
  const rows = Math.ceil(data.length / cols)

  doc.setFontSize(6)
  for (let i = 0; i < data.length; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = startX + col * (cellSize + 1.5)
    const cellY = y + row * (cellSize + 1.5)

    if (data[i].taken) {
      doc.setFillColor(34, 197, 94) // green
      doc.rect(x, cellY, cellSize, cellSize, 'F')
      doc.setTextColor(255, 255, 255)
      doc.text('✓', x + 1.2, cellY + 3.5)
    } else {
      doc.setFillColor(239, 68, 68) // red
      doc.rect(x, cellY, cellSize, cellSize, 'F')
      doc.setTextColor(255, 255, 255)
      doc.text('✗', x + 1.2, cellY + 3.5)
    }
  }

  doc.setTextColor(0, 0, 0)
  return y + rows * (cellSize + 1.5) + 5
}

export function pdfToUint8Array(doc: jsPDF): Uint8Array {
  const arrayBuffer = doc.output('arraybuffer')
  return new Uint8Array(arrayBuffer)
}
