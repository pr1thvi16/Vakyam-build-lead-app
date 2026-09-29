export const CONFIG = {
  // EDIT ONLY THIS BLOCK TO CHANGE SCORING RULES
  baseScore: 0,
  bands: {
    hotMinimum: 60,
    warmMinimum: 35,
  },
  budgetBands: [
    { minimum: 3_000_000, points: 22 },
    { minimum: 1_500_000, points: 16 },
    { minimum: 750_000, points: 10 },
    { minimum: 250_000, points: 5 },
  ],
  timelinePoints: {
    immediate: 30,
    '1-3m': 22,
    '3-6m': 12,
    '6m+': 4,
  },
  intentPoints: {
    buyer: 12,
    offplan: 14,
    tenant: 10,
    landlord: 9,
    office: 11,
  },
  targetAreas: [
    'Dubai Marina',
    'Downtown Dubai',
    'Business Bay',
    'Dubai Hills Estate',
    'Dubai Creek Harbour',
    'Jumeirah Village Circle',
    'Palm Jumeirah',
    'Arabian Ranches',
  ],
  targetAreaPoints: 10,
  urgencyWords: {
    en: ['urgent', 'as soon as possible', 'asap', 'ready now', 'this week', 'immediately'],
    ar: ['عاجل', 'بأسرع وقت', 'جاهز الآن', 'هذا الأسبوع', 'فورًا', 'حالًا'],
  },
  urgencyPoints: 8,
  negationPhrases: [
    'not ready yet',
    'just browsing',
    'maybe later',
    'لست مستعد',
    'لست جاهز',
    'غير مستعد',
    'غير جاهز',
  ],
} as const

type ScoringInput = {
  intent: keyof typeof CONFIG.intentPoints
  budget_aed: number
  timeline: keyof typeof CONFIG.timelinePoints
  area: string
  notes?: string | null
}

export type LeadBand = 'hot' | 'warm' | 'cold'

export function scoreLead(input: ScoringInput) {
  let score = CONFIG.baseScore
  const reasons: string[] = []

  const budgetBand = CONFIG.budgetBands.find((band) => input.budget_aed >= band.minimum)
  const budgetPoints = budgetBand?.points ?? 0
  score += budgetPoints
  reasons.push(`+${budgetPoints} budget AED ${input.budget_aed.toLocaleString('en-US')}`)

  const timelinePoints = CONFIG.timelinePoints[input.timeline]
  score += timelinePoints
  reasons.push(`+${timelinePoints} timeline ${input.timeline}`)

  const intentPoints = CONFIG.intentPoints[input.intent]
  score += intentPoints
  reasons.push(`+${intentPoints} intent ${input.intent}`)

  const areaMatches = CONFIG.targetAreas.some((target) => target.toLowerCase() === input.area.trim().toLowerCase())
  const areaPoints = areaMatches ? CONFIG.targetAreaPoints : 0
  score += areaPoints
  reasons.push(`+${areaPoints} target area${areaMatches ? ` ${input.area.trim()}` : ''}`)

  const notes = input.notes?.trim() ?? ''
  const matchedNegation = CONFIG.negationPhrases.find((phrase) => notes.toLocaleLowerCase().includes(phrase.toLocaleLowerCase()))
  if (matchedNegation) {
    reasons.push(`+0 urgency cancelled by '${matchedNegation}'`)
  } else {
    const urgencyWords = [...CONFIG.urgencyWords.en, ...CONFIG.urgencyWords.ar]
    const matchedUrgency = urgencyWords.find((word) => notes.toLocaleLowerCase().includes(word.toLocaleLowerCase()))
    const urgencyPoints = matchedUrgency ? CONFIG.urgencyPoints : 0
    score += urgencyPoints
    reasons.push(`+${urgencyPoints} notes urgency${matchedUrgency ? ` '${matchedUrgency}'` : ''}`)
  }

  const boundedScore = Math.max(0, Math.min(100, score))
  const band: LeadBand = boundedScore >= CONFIG.bands.hotMinimum
    ? 'hot'
    : boundedScore >= CONFIG.bands.warmMinimum
      ? 'warm'
      : 'cold'

  return { score: boundedScore, band, reasons }
}
