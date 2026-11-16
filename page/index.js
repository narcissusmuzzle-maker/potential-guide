/**
 * Luv Sync — панель управления фоновой службой (app-service/sync). Сама служба экрана не имеет.
 * Открывается вручную (циферблат её больше не запускает): при открытии пробует запустить службу и показывает, что в
 * общей памяти. Кнопки: «Запустить», «Остановить», «Записать сейчас» (разовая запись без службы — проверка).
 * Ничего не закрывает и никуда не возвращает.
 */
import { createWidget, widget, prop, align } from '@zos/ui'
import { requestPermission } from '@zos/app'
import * as svc from '@zos/app-service'
import { syncOnce, readState } from '../shared/store'

const W = 432
const SERVICE_FILE = 'app-service/sync'
const PERM = 'device:os.bg_service'

let statusText = null
let msg = ''
let started = false

function svcRunning() {
  try {
    if (typeof svc.getAllAppServices === 'function') {
      const list = svc.getAllAppServices() || []
      for (let i = 0; i < list.length; i++) if (String(list[i]).indexOf('app-service/sync') >= 0) return true
      return false
    }
  } catch (e) { /* неизвестно */ }
  return null
}

function render() {
  if (!statusText) return
  const r = svcRunning()
  const st = readState()
  const age = st.ts > 0 ? Math.max(0, Math.round((Date.now() - st.ts) / 1000)) + ' с назад' : '—'
  const lines = [
    'Служба: ' + (r === null ? 'не знаю' : (r ? 'работает' : 'не запущена')),
    'Каналы: ' + (st.names || 'нет'),
    'Запись № ' + st.n + ', ' + age
  ]
  if (msg) lines.push(msg)
  try { statusText.setProperty(prop.TEXT, lines.join('\n')) } catch (e) { /* не страшно */ }
}

function say(m) { msg = m; render() }

function doStart() {
  if (started) return
  started = true
  try {
    const code = svc.start({
      file: SERVICE_FILE,
      param: '',
      complete_func: (info) => { started = false; say(info && info.result ? 'Служба запущена' : 'Служба не запустилась') }
    })
    if (code !== 0 && code !== undefined) { started = false; say(code === 2 ? 'Служба уже работает' : 'Запуск: код ' + code) }
  } catch (e) { started = false; say('Запуск: ' + e) }
}

function startService() {
  let r
  try {
    r = requestPermission({ permissions: [PERM], callback: () => doStart() })
  } catch (e) { say('Разрешение: ' + e); doStart(); return }
  if (r === 2) doStart()
  else if (r === 1) { say('Разрешение запросить нельзя'); doStart() }
  else say('Разрешите фоновую работу на экране часов')
}

function stopService() {
  try {
    svc.stop({ file: SERVICE_FILE, complete_func: () => say('Служба остановлена') })
  } catch (e) { say('Остановка: ' + e) }
}

function writeNow() {
  const res = syncOnce()
  say(res.ok ? 'Записано № ' + res.n + ' (' + res.via + ')' : 'ОШИБКА: ' + res.msg)
}

function addButton(y, text, fn) {
  createWidget(widget.BUTTON, {
    x: 40, y: y, w: W - 80, h: 50, radius: 12, text: text, text_size: 24,
    normal_color: 0x2a2a2a, press_color: 0x505050, color: 0xffffff, click_func: fn
  })
}

Page({
  build() {
    createWidget(widget.FILL_RECT, { x: 0, y: 0, w: W, h: 514, color: 0x000000 })
    // сначала надпись: если экран пустой, значит страница вообще не загрузилась
    statusText = createWidget(widget.TEXT, {
      x: 20, y: 24, w: W - 40, h: 270, color: 0x43a857, text_size: 24,
      align_h: align.CENTER_H, align_v: align.CENTER_V, text_style: 1, text: 'Luv Sync…'
    })
    try {
      addButton(300, 'Запустить службу', startService)
      addButton(360, 'Остановить', stopService)
      addButton(420, 'Записать сейчас', writeNow)
    } catch (e) { msg = 'Кнопки: ' + e }
    render()
    try { startService() } catch (e) { say('Запуск: ' + e) }
  },
  onDestroy() { statusText = null }
})
