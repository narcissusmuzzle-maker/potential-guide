// Прогон страницы Luv Sync в Node с заглушками API часов.
import assert from 'node:assert/strict'
import { makeEnv } from './_env.mjs'

const { mod, url } = makeEnv()
mod('@zos/ui', `
export const widget = { FILL_RECT: 'FILL_RECT', TEXT: 'TEXT', BUTTON: 'BUTTON' }
export const prop = { TEXT: 'text' }
export const align = { CENTER_H: 1, CENTER_V: 2 }
export function createWidget(type, p) { const w = { type, p, setProperty(k, v) { w.p[k] = v } }; globalThis.__widgets.push(w); return w }`)
mod('@zos/app', `export function requestPermission(o) { globalThis.__perm.push(o); return globalThis.__permResult }`)
mod('@zos/app-service', `
export function getAllAppServices() { return globalThis.__running }
export function start(o) { globalThis.__started.push(o); return globalThis.__startCode }
export function stop(o) { globalThis.__stopped.push(o); o.complete_func({ result: true }) }`)

globalThis.__widgets = []; globalThis.__perm = []; globalThis.__permResult = 2
globalThis.__started = []; globalThis.__stopped = []; globalThis.__startCode = 0; globalThis.__running = []
let page = null
globalThis.Page = (o) => { page = o }
await import(url('page/index.js'))
assert.ok(page && typeof page.build === 'function')

const W = () => globalThis.__widgets
const status = () => W().find((w) => w.type === 'TEXT').p.text
const btn = (t) => W().find((w) => w.type === 'BUTTON' && w.p.text === t)

page.build()
// надпись создаётся первой (чтобы пустой экран значил «страница не загрузилась»)
assert.equal(W().findIndex((w) => w.type === 'TEXT'), 1)
// разрешение уже есть (2) -> служба стартует сразу, из нужного файла
assert.equal(globalThis.__started.length, 1)
assert.equal(globalThis.__started[0].file, 'app-service/sync')
assert.deepEqual(globalThis.__perm[0].permissions, ['device:os.bg_service'])
assert.match(status(), /Служба: не запущена/)
assert.match(status(), /Каналы: typed\+local/)
assert.ok(btn('Запустить службу') && btn('Остановить') && btn('Записать сейчас'))
// страница ничего не закрывает и не пишет сама
assert.equal(globalThis.__mem.size, 0)

// служба сообщает о запуске
globalThis.__running = ['app-service/sync']
globalThis.__started[0].complete_func({ result: true })
assert.match(status(), /Служба: работает/)
assert.match(status(), /Служба запущена/)

// «Записать сейчас»
btn('Записать сейчас').p.click_func()
assert.match(status(), /Записано № 1 \(typed\+local\)/)
assert.match(status(), /Запись № 1/)

// уже работает (код 2)
globalThis.__startCode = 2
btn('Запустить службу').p.click_func()
assert.match(status(), /уже работает/)

// разрешение запрашивается у пользователя (0): запуск после ответа
globalThis.__started.length = 0; globalThis.__startCode = 0; globalThis.__permResult = 0
btn('Запустить службу').p.click_func()
assert.equal(globalThis.__started.length, 0)
globalThis.__perm.at(-1).callback([2])
assert.equal(globalThis.__started.length, 1)

// стоп
btn('Остановить').p.click_func()
assert.equal(globalThis.__stopped[0].file, 'app-service/sync')
assert.match(status(), /остановлена/)

// нет общей памяти -> понятная ошибка
globalThis.__st = { typed: false, local: false }
btn('Записать сейчас').p.click_func()
assert.match(status(), /ОШИБКА: нет общей памяти/)
console.log('page: ok')
