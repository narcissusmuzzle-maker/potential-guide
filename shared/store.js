/**
 * Общая память часов (Zepp OS API 3.x), сторона записи. Используют и служба (app-service/sync), и страница.
 * Два независимых канала, пишем в оба, чтобы хоть один дошёл до циферблата:
 *   typed — ShareTypedStorage (строки по ключам), local — ShareLocalStorage (файл JSON; нужно разрешение device:os.local_storage).
 */
import * as zst from '@zos/storage'
import { KEY_COLORS, KEY_TS, KEY_N, SHARE_SCOPE, SHARE_FILE, pack, toInt } from './link'
import { testColors } from './testdata'

export function channels() {
  const list = []
  try {
    if (typeof zst.ShareTypedStorage === 'function') {
      const t = new zst.ShareTypedStorage(SHARE_SCOPE)
      list.push({ name: 'typed', set: (k, v) => t.putString(k, v), get: (k) => String(t.getString(k, '')) })
    }
  } catch (e) { /* канала нет */ }
  try {
    if (typeof zst.ShareLocalStorage === 'function') {
      const l = new zst.ShareLocalStorage(SHARE_FILE)
      list.push({ name: 'local', set: (k, v) => l.setItem(k, v), get: (k) => String(l.getItem(k, '')) })
    }
  } catch (e) { /* канала нет */ }
  return list
}

/** Что сейчас записано: { n, ts } (0, если ничего). Ничего не пишет. */
export function readState() {
  const chs = channels()
  for (let i = 0; i < chs.length; i++) {
    try {
      const n = toInt(chs[i].get(KEY_N))
      if (n > 0) return { n, ts: toInt(chs[i].get(KEY_TS)), names: chs.map((c) => c.name).join('+') }
    } catch (e) { /* дальше */ }
  }
  return { n: 0, ts: 0, names: chs.map((c) => c.name).join('+') }
}

/** Записать цвета. Возвращает { ok, n, colors, via } или { ok:false, msg }. */
export function syncOnce() {
  const chs = channels()
  if (chs.length === 0) return { ok: false, msg: 'нет общей памяти (ShareTypedStorage / ShareLocalStorage)' }
  const n = readState().n + 1
  const colors = testColors(n)
  const packed = pack(colors)
  const okNames = []
  const errs = []
  for (let i = 0; i < chs.length; i++) {
    const c = chs[i]
    try {
      c.set(KEY_COLORS, packed)
      c.set(KEY_TS, String(Date.now()))
      c.set(KEY_N, String(n))
      if (c.get(KEY_COLORS) === packed) okNames.push(c.name)
      else errs.push(c.name + ': не читается обратно')
    } catch (e) { errs.push(c.name + ': ' + e) }
  }
  if (okNames.length === 0) return { ok: false, msg: 'ошибка записи: ' + errs.join('; ') }
  return { ok: true, n, colors, via: okNames.join('+') }
}
