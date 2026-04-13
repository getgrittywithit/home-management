// D61 ASSESS-4: Math speed test problem generator
// Pure TypeScript — no DB needed. Generates randomized problems per skill area and grade level.
//
// Usage:
//   const problems = generateMathTest({ skill: 'multiplication', grade: 4, count: 20 })
//   → [{ problem: '7 × 8', answer: '56' }, ...]

export type MathSkill =
  | 'addition'
  | 'subtraction'
  | 'multiplication'
  | 'division'
  | 'fractions'
  | 'money'
  | 'time'
  | 'measurement'
  | 'place_value'
  | 'decimals'
  | 'mixed'

export interface MathProblem {
  problem: string
  answer: string
}

interface GenerateOptions {
  skill: MathSkill
  grade: number  // 2, 3, 4, 6
  count?: number // default 20
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ── Addition ──────────────────────────────────────────────────────
function genAddition(grade: number): MathProblem {
  let a = 0, b = 0
  if (grade <= 2) { a = randInt(1, 20); b = randInt(1, 20 - Math.min(a, 19)) }
  else if (grade === 3) { a = randInt(10, 99); b = randInt(10, 99) }
  else if (grade === 4) { a = randInt(100, 999); b = randInt(100, 999) }
  else { a = randInt(1000, 9999); b = randInt(1000, 9999) }
  return { problem: `${a} + ${b}`, answer: String(a + b) }
}

// ── Subtraction ───────────────────────────────────────────────────
function genSubtraction(grade: number): MathProblem {
  let a = 0, b = 0
  if (grade <= 2) { a = randInt(5, 20); b = randInt(1, a) }
  else if (grade === 3) { a = randInt(20, 99); b = randInt(1, a) }
  else if (grade === 4) { a = randInt(100, 999); b = randInt(1, a) }
  else { a = randInt(1000, 9999); b = randInt(1, a) }
  return { problem: `${a} − ${b}`, answer: String(a - b) }
}

// ── Multiplication ────────────────────────────────────────────────
function genMultiplication(grade: number): MathProblem {
  let a = 0, b = 0
  if (grade <= 2) { a = randInt(1, 5); b = randInt(1, 5) }
  else if (grade === 3) { a = randInt(1, 10); b = randInt(1, 10) }
  else if (grade === 4) {
    if (Math.random() < 0.7) { a = randInt(1, 12); b = randInt(1, 12) }
    else { a = randInt(10, 99); b = randInt(1, 9) }
  }
  else {
    if (Math.random() < 0.5) { a = randInt(10, 99); b = randInt(10, 99) }
    else { a = randInt(100, 999); b = randInt(2, 9) }
  }
  return { problem: `${a} × ${b}`, answer: String(a * b) }
}

// ── Division ──────────────────────────────────────────────────────
function genDivision(grade: number): MathProblem {
  let divisor = 0, quotient = 0
  if (grade <= 2) { divisor = pick([2, 5, 10]); quotient = randInt(1, 5) }
  else if (grade === 3) { divisor = randInt(1, 10); quotient = randInt(1, 10) }
  else if (grade === 4) { divisor = randInt(2, 9); quotient = randInt(10, 99) }
  else { divisor = randInt(2, 12); quotient = randInt(10, 99) }
  const dividend = divisor * quotient
  return { problem: `${dividend} ÷ ${divisor}`, answer: String(quotient) }
}

// ── Fractions ─────────────────────────────────────────────────────
function genFractions(grade: number): MathProblem {
  if (grade <= 2) {
    const parts = [1, 2, 3, 4]
    const whole = pick([2, 3, 4])
    return { problem: `How many halves are in ${whole}?`, answer: String(whole * 2) }
  }
  if (grade === 3) {
    // Compare fractions w/ same denominator
    const denom = randInt(2, 8)
    const a = randInt(1, denom - 1)
    let b = randInt(1, denom - 1)
    while (b === a) b = randInt(1, denom - 1)
    const bigger = a > b ? `${a}/${denom}` : `${b}/${denom}`
    return { problem: `Which is bigger: ${a}/${denom} or ${b}/${denom}?`, answer: bigger }
  }
  if (grade === 4) {
    // Add fractions, same denominator
    const denom = randInt(3, 8)
    const a = randInt(1, denom - 1)
    const b = randInt(1, denom - a)
    return { problem: `${a}/${denom} + ${b}/${denom}`, answer: `${a + b}/${denom}` }
  }
  // Grade 6: convert fractions to decimals / multiply
  const num = randInt(1, 9)
  const denom = pick([2, 4, 5, 8, 10])
  return { problem: `Convert ${num}/${denom} to a decimal`, answer: (num / denom).toFixed(num % denom === 0 ? 0 : 3).replace(/\.?0+$/, '') || '0' }
}

// ── Money ─────────────────────────────────────────────────────────
function genMoney(grade: number): MathProblem {
  if (grade <= 2) {
    const q = randInt(1, 4), d = randInt(1, 5), n = randInt(1, 5), p = randInt(1, 10)
    const cents = q * 25 + d * 10 + n * 5 + p
    return { problem: `${q} quarters + ${d} dimes + ${n} nickels + ${p} pennies = ? cents`, answer: String(cents) }
  }
  if (grade === 3) {
    const priceDollars = randInt(1, 4)
    const priceCents = randInt(1, 99)
    const total = priceDollars + priceCents / 100
    const change = 5 - total
    return { problem: `Item costs $${total.toFixed(2)}. Change from $5?`, answer: `$${change.toFixed(2)}` }
  }
  if (grade === 4) {
    const p1 = (randInt(100, 999) / 100).toFixed(2)
    const p2 = (randInt(100, 999) / 100).toFixed(2)
    const total = (parseFloat(p1) + parseFloat(p2)).toFixed(2)
    const change = (20 - parseFloat(total)).toFixed(2)
    return { problem: `$${p1} + $${p2}. Change from $20?`, answer: `$${change}` }
  }
  const price = randInt(20, 200)
  const discount = pick([10, 15, 20, 25, 30])
  const sale = (price * (100 - discount) / 100).toFixed(2)
  return { problem: `$${price} with ${discount}% off = ?`, answer: `$${sale}` }
}

// ── Time ──────────────────────────────────────────────────────────
function genTime(grade: number): MathProblem {
  if (grade <= 2) {
    const h = randInt(1, 12)
    const halfHour = Math.random() < 0.5
    return {
      problem: `Clock shows ${h}:${halfHour ? '30' : '00'} — what time is it?`,
      answer: `${h}:${halfHour ? '30' : '00'}`,
    }
  }
  if (grade === 3) {
    const start = randInt(1, 10)
    const mins = pick([15, 20, 30, 45])
    const endMin = mins
    const endHr = start
    return {
      problem: `Start: ${start}:00. Ends in ${mins} minutes. What time?`,
      answer: `${endHr}:${endMin < 10 ? '0' + endMin : endMin}`,
    }
  }
  if (grade === 4) {
    const startH = randInt(8, 11)
    const duration = randInt(30, 180)
    const totalMin = startH * 60 + duration
    const endH = Math.floor(totalMin / 60)
    const endM = totalMin % 60
    const ampm = endH >= 12 ? 'PM' : 'AM'
    const displayH = endH > 12 ? endH - 12 : endH
    return {
      problem: `Start: ${startH}:00 AM. Lasts ${duration} minutes. End time?`,
      answer: `${displayH}:${endM < 10 ? '0' + endM : endM} ${ampm}`,
    }
  }
  const hours = randInt(1, 8)
  const rateMph = pick([30, 45, 55, 60, 65])
  return { problem: `A car drives ${rateMph} mph for ${hours} hours. How far?`, answer: `${rateMph * hours} miles` }
}

// ── Measurement ───────────────────────────────────────────────────
function genMeasurement(grade: number): MathProblem {
  if (grade <= 2) {
    const ft = randInt(1, 5)
    return { problem: `${ft} feet = ? inches`, answer: String(ft * 12) }
  }
  if (grade === 3) {
    const yd = randInt(1, 5)
    return { problem: `${yd} yards = ? feet`, answer: String(yd * 3) }
  }
  if (grade === 4) {
    const choice = pick(['yd_to_ft', 'gal_to_qt', 'lb_to_oz'])
    if (choice === 'yd_to_ft') { const n = randInt(2, 9); return { problem: `${n} yards = ? feet`, answer: String(n * 3) } }
    if (choice === 'gal_to_qt') { const n = randInt(2, 8); return { problem: `${n} gallons = ? quarts`, answer: String(n * 4) } }
    const n = randInt(2, 8); return { problem: `${n} pounds = ? ounces`, answer: String(n * 16) }
  }
  // Grade 6: metric conversions
  const choice = pick(['m_to_cm', 'kg_to_g', 'km_to_m'])
  if (choice === 'm_to_cm') { const n = randInt(2, 20); return { problem: `${n} meters = ? cm`, answer: String(n * 100) } }
  if (choice === 'kg_to_g') { const n = randInt(2, 20); return { problem: `${n} kg = ? grams`, answer: String(n * 1000) } }
  const n = randInt(2, 20); return { problem: `${n} km = ? meters`, answer: String(n * 1000) }
}

// ── Place Value ───────────────────────────────────────────────────
function genPlaceValue(grade: number): MathProblem {
  if (grade <= 2) {
    const n = randInt(100, 999)
    const place = pick(['hundreds', 'tens', 'ones'])
    const digit = place === 'hundreds' ? Math.floor(n / 100) : place === 'tens' ? Math.floor((n % 100) / 10) : n % 10
    return { problem: `In ${n}, what digit is in the ${place} place?`, answer: String(digit) }
  }
  if (grade === 3) {
    const n = randInt(1000, 9999)
    const place = pick(['thousands', 'hundreds', 'tens', 'ones'])
    const digit = place === 'thousands' ? Math.floor(n / 1000)
                : place === 'hundreds' ? Math.floor((n % 1000) / 100)
                : place === 'tens' ? Math.floor((n % 100) / 10)
                : n % 10
    return { problem: `In ${n}, digit in the ${place} place?`, answer: String(digit) }
  }
  if (grade === 4) {
    const n = randInt(1000, 99999)
    const round = pick([10, 100, 1000])
    const rounded = Math.round(n / round) * round
    return { problem: `Round ${n} to the nearest ${round}`, answer: String(rounded) }
  }
  // Grade 6: decimal place value
  const n = (randInt(1000, 9999) / 1000).toFixed(3)
  return { problem: `In ${n}, what digit is in the hundredths place?`, answer: n.split('.')[1][1] }
}

// ── Decimals ──────────────────────────────────────────────────────
function genDecimals(grade: number): MathProblem {
  if (grade === 3) {
    const n = randInt(1, 9)
    return { problem: `${n}/10 as a decimal?`, answer: `0.${n}` }
  }
  if (grade === 4) {
    const a = (randInt(10, 99) / 10).toFixed(1)
    const b = (randInt(10, 99) / 10).toFixed(1)
    const sum = (parseFloat(a) + parseFloat(b)).toFixed(1)
    return { problem: `${a} + ${b}`, answer: sum }
  }
  // Grade 6: decimal × decimal
  const a = (randInt(10, 99) / 10).toFixed(1)
  const b = (randInt(10, 99) / 10).toFixed(1)
  const prod = (parseFloat(a) * parseFloat(b)).toFixed(2)
  return { problem: `${a} × ${b}`, answer: prod }
}

// ── Mixed ─────────────────────────────────────────────────────────
function genMixed(grade: number): MathProblem {
  const skills: MathSkill[] = grade <= 3
    ? ['addition', 'subtraction', 'multiplication', 'money']
    : ['addition', 'subtraction', 'multiplication', 'division', 'fractions']
  return generateOne(pick(skills), grade)
}

function generateOne(skill: MathSkill, grade: number): MathProblem {
  switch (skill) {
    case 'addition':       return genAddition(grade)
    case 'subtraction':    return genSubtraction(grade)
    case 'multiplication': return genMultiplication(grade)
    case 'division':       return genDivision(grade)
    case 'fractions':      return genFractions(grade)
    case 'money':          return genMoney(grade)
    case 'time':           return genTime(grade)
    case 'measurement':    return genMeasurement(grade)
    case 'place_value':    return genPlaceValue(grade)
    case 'decimals':       return genDecimals(grade)
    case 'mixed':          return genMixed(grade)
  }
}

export function generateMathTest(opts: GenerateOptions): MathProblem[] {
  const count = opts.count ?? 20
  const problems: MathProblem[] = []
  const seen = new Set<string>()
  let attempts = 0
  while (problems.length < count && attempts < count * 4) {
    const p = generateOne(opts.skill, opts.grade)
    if (!seen.has(p.problem)) {
      seen.add(p.problem)
      problems.push(p)
    }
    attempts++
  }
  // If we hit the attempt cap (very small pool), fill with duplicates
  while (problems.length < count) problems.push(generateOne(opts.skill, opts.grade))
  return problems
}

export const MATH_SKILL_LABELS: Record<MathSkill, string> = {
  addition: 'Addition',
  subtraction: 'Subtraction',
  multiplication: 'Multiplication',
  division: 'Division',
  fractions: 'Fractions',
  money: 'Money',
  time: 'Time',
  measurement: 'Measurement',
  place_value: 'Place Value',
  decimals: 'Decimals',
  mixed: 'Mixed Skills',
}
