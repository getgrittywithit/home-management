import type { DayMode, DayModeEffect } from '@/types/dayMode'

export type { DayMode, DayModeEffect, CoverageAssignment } from '@/types/dayMode'

export const MODE_EFFECTS: Record<string, DayModeEffect> = {
  normal:     { schoolwork: 'full',         zones: 'full',        pets: 'full',          manager: 'do_your_day', attendance: 'present',        streak: 'active', points: 'earn',       banner: null },
  fun_friday: { schoolwork: 'replaced',     zones: 'full',        pets: 'full',          manager: 'do_your_day', attendance: 'present',        streak: 'active', points: 'earn_bonus', banner: "It's Fun Friday! You earned it — pick your plan below." },
  off_day:    { schoolwork: 'hidden',       zones: 'full',        pets: 'full',          manager: 'do_your_day', attendance: 'absent_excused', streak: 'pause',  points: 'no_change',  banner: "Today's a free day. Your streak is safe." },
  vacation:   { schoolwork: 'hidden',       zones: 'skip',        pets: 'shift_if_away', manager: 'shift_if_away', attendance: 'absent_excused', streak: 'pause', points: 'no_change', banner: "You're on vacation — see you when you're back." },
  sick_day:   { schoolwork: 'hidden',       zones: 'bare_basics', pets: 'shift_if_away', manager: 'shift_if_away', attendance: 'absent_sick',    streak: 'pause',  points: 'no_change',  banner: "Rest up. Your streak is paused — no pressure today." },
  field_trip: { schoolwork: 'replaced',     zones: 'bare_basics', pets: 'full',          manager: 'shift_if_away', attendance: 'present',       streak: 'active', points: 'earn',       banner: "Field trip day! Adventure counts as school." },
  work_day:   { schoolwork: 'replaced',     zones: 'bare_basics', pets: 'full',          manager: 'shift_if_away', attendance: 'present',       streak: 'active', points: 'earn_bonus', banner: "Work day with Dad. Real-world learning counts double." },
  half_day:   { schoolwork: 'morning_only', zones: 'full',        pets: 'full',          manager: 'do_your_day', attendance: 'half_day',        streak: 'active', points: 'earn',       banner: "Half day — morning tasks only." },
  catch_up:   { schoolwork: 'pending_only', zones: 'full',        pets: 'full',          manager: 'do_your_day', attendance: 'present',         streak: 'active', points: 'earn',       banner: "Catch-up day — let's clear what's still open." },
}

export function resolveDayEffect(mode: DayMode | null): DayModeEffect {
  if (!mode) return MODE_EFFECTS.normal
  return MODE_EFFECTS[mode.mode_type] || MODE_EFFECTS.normal
}
