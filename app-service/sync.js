/**
 * Фоновая служба Luv Sync: без экрана, работает после выхода из приложения. Раз в минуту кладёт цвета полосок в общую
 * память часов (шаг прототипа: цвета придуманные), а при запуске — сразу один раз. Циферблат Luv Face их читает.
 * Запускает и останавливает её страница приложения (page/index.js).
 */
import { Time } from '@zos/sensor'
import { syncOnce } from '../shared/store'

let sensor = null
const tick = () => { try { syncOnce() } catch (e) { /* служба не должна падать */ } }

AppService({
  state: {},
  onInit() {
    tick()
    try {
      sensor = new Time()
      sensor.onPerMinute(tick)
    } catch (e) { /* без минутного таймера служба только один раз записала */ }
  },
  onDestroy() {
    try { if (sensor && typeof sensor.offPerMinute === 'function') sensor.offPerMinute(tick) } catch (e) { /* ничего */ }
    sensor = null
  }
})
