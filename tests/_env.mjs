// Общая заглушечная среда для тестов Luv Sync: копия проекта во временной папке + поддельные модули @zos/*.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export function makeEnv() {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-'))
  for (const d of ['page', 'shared', 'app-service']) fs.cpSync(path.join(root, d), path.join(tmp, d), { recursive: true })
  fs.writeFileSync(path.join(tmp, 'package.json'), '{"type":"module"}')
  // сборщик часов понимает импорт без расширения, Node — нет: в копиях дописываем .js
  for (const d of ['page', 'shared', 'app-service']) {
    for (const f of fs.readdirSync(path.join(tmp, d))) {
      const p = path.join(tmp, d, f)
      fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/from '(\.\.?\/(?:shared\/)?\w+)'/g, "from '$1.js'"))
    }
  }
  const mod = (name, code) => {
    const dir = path.join(tmp, 'node_modules', ...name.split('/'))
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name, type: 'module', main: 'index.js' }))
    fs.writeFileSync(path.join(dir, 'index.js'), code)
  }
  globalThis.__mem = new Map()
  globalThis.__st = { typed: true, local: true }
  mod('@zos/storage', `
export class ShareTypedStorage {
  constructor(scope) { if (!globalThis.__st.typed) throw new Error('no typed'); this.scope = scope }
  putString(k, v) { globalThis.__mem.set('t:' + k, v); return 0 }
  getString(k, d) { return globalThis.__mem.has('t:' + k) ? globalThis.__mem.get('t:' + k) : d }
}
export class ShareLocalStorage {
  constructor(file) { if (!globalThis.__st.local) throw new Error('no local'); this.file = file }
  setItem(k, v) { globalThis.__mem.set('l:' + k, v) }
  getItem(k, d) { return globalThis.__mem.has('l:' + k) ? globalThis.__mem.get('l:' + k) : d }
}`)
  return { tmp, mod, url: (f) => 'file://' + path.join(tmp, f) }
}
