/**
 * ТОЛЬКО ДЛЯ ПРОТОТИПА: придуманные цвета вместо данных телефона.
 * С каждой записью (n = 1, 2, 3 ...) цвета меняются, поэтому на циферблате сразу видно, что обновление дошло.
 */
import { forRatio } from './colors'
import { SEG_TOTAL } from './link'

export function testColors(n) {
  const out = []
  for (let i = 0; i < SEG_TOTAL; i++) {
    const ratio = ((n * 2 + i * 3) % 11) / 10   // 0 .. 1, у каждого сегмента своё смещение
    out.push(forRatio(ratio))
  }
  return out
}
