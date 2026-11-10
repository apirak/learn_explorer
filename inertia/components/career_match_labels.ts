/** Shown instead of career matches for a profile the system cannot match (ADR 0005). */
export const PROFILE_STATUS_LABEL: Record<'all-dislike' | 'flat', string> = {
  'all-dislike': 'ตอบไม่อยากทำทุกข้อ',
  'flat': 'คะแนนเท่ากันทุกด้าน',
}

/** Test time as m:ss. */
export const formatTestTime = (ms: number) => {
  const seconds = Math.floor(ms / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
