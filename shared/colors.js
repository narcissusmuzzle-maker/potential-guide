/**
 * Палитра — та же, что у виджета на телефоне (ColorScale в Utils.kt) и у циферблата.
 * В прототипе нужна только для тестовых цветов; настоящие цвета потом будет присылать телефон.
 */
export const STOPS = [0xd1544e, 0xe38b3f, 0xe0c441, 0x9cc24b, 0x43a857]
export const GRAY = 0x555555

function lerpCh(a, b, f) {
  const v = Math.floor(a + (b - a) * f + 0.5)
  return Math.max(0, Math.min(255, v))
}
function lerp(a, b, f) {
  const r = lerpCh((a >> 16) & 255, (b >> 16) & 255, f)
  const g = lerpCh((a >> 8) & 255, (b >> 8) & 255, f)
  const bl = lerpCh(a & 255, b & 255, f)
  return (r << 16) | (g << 8) | bl
}

/** Цвет для доли нормы 0..1 (не число — серый). */
export function forRatio(ratio) {
  const x = +ratio
  if (ratio === null || ratio === undefined || !isFinite(x)) return GRAY
  const r = Math.max(0, Math.min(1, x)) * (STOPS.length - 1)
  const i = Math.min(Math.floor(r), STOPS.length - 2)
  return lerp(STOPS[i], STOPS[i + 1], r - i)
}
