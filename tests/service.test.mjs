// Прогон фоновой службы и записи в общую память.
import assert from 'node:assert/strict'
import { makeEnv } from './_env.mjs'

const { mod, url } = makeEnv()
mod('@zos/sensor', `
export class Time {
  onPerMinute(cb) { globalThis.__minute = cb }
  offPerMinute(cb) { globalThis.__minute = null }
}`)
let svc = null
globalThis.AppService = (o) => { svc = o }
await import(url('app-service/sync.js'))
assert.ok(svc && typeof svc.onInit === 'function')
const get = (k) => globalThis.__mem.get('t:' + k)

// запуск: сразу одна запись + подписка на «каждую минуту»
svc.onInit('')
assert.equal(get('luv_n'), '1')
assert.match(get('luv_c'), /^([0-9a-f]{6},){5}[0-9a-f]{6}$/)
assert.ok(Number(get('luv_ts')) > 0)
assert.equal(globalThis.__mem.get('l:luv_c'), get('luv_c'))
assert.equal(typeof globalThis.__minute, 'function')

// каждая минута — новая запись, другие цвета
const c1 = get('luv_c')
globalThis.__minute()
assert.equal(get('luv_n'), '2')
assert.notEqual(get('luv_c'), c1)

// один канал сломан — служба не падает, пишет в оставшийся
globalThis.__st = { typed: false, local: true }
globalThis.__minute()
assert.ok(globalThis.__mem.get('l:luv_n'))

// ни одного канала — не падает
globalThis.__st = { typed: false, local: false }
globalThis.__minute()

// остановка
svc.onDestroy()
assert.equal(globalThis.__minute, null)
console.log('service: ok')
