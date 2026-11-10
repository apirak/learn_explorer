import { type Data } from '@generated/data'

/** A profile the system cannot match, so it has no career matches (ADR 0005). */
type InvalidProfileStatus = Exclude<Data.CareerMatchRow['profileStatus'], 'ok' | null>

/** Shown instead of career matches for an invalid profile. */
export const PROFILE_STATUS_LABEL: Record<InvalidProfileStatus, string> = {
  'all-dislike': 'ตอบไม่อยากทำทุกข้อ',
  'flat': 'คะแนนเท่ากันทุกด้าน',
}

/** Test time as m:ss, rounded to the second like the export's `test_time_sec`. */
export const formatTestTime = (ms: number) => {
  const seconds = Math.round(ms / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
