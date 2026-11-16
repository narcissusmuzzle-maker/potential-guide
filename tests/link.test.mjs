import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// сборщик часов понимает импорт без расширения, Node — нет: работаем с копией, где дописано .js
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'link-'))
fs.cpSync(path.join(root, 'shared'), path.join(tmp, 'shared'), { recursive: true })
fs.writeFileSync(path.join(tmp, 'package.json'), '{"type":"module"}')
const td = path.join(tmp, 'shared', 'testdata.js')
fs.writeFileSync(td, fs.readFileSync(td, 'utf8').replace(/from '(\.\/\w+)'/g, "from '$1.js'"))
const imp = (f) => import(pathToFileURL(path.join(tmp, 'shared', f)).href)
const link = await imp('link.js')
const { forRatio, GRAY } = await imp('colors.js')
const { testColors } = await imp('testdata.js')

// упаковка и распаковка
const six = [0xd1544e, 0xe38b3f, 0xe0c441, 0x9cc24b, 0x43a857, 0x000000]
const s = link.pack(six)
assert.equal(s, 'd1544e,e38b3f,e0c441,9cc24b,43a857,000000')
assert.deepEqual(link.unpack(s), six)
// короткие числа дополняются нулями слева
assert.equal(link.pack([1, 2, 3, 4, 5, 6]), '000001,000002,000003,000004,000005,000006')
// не число -> серый
assert.equal(link.pack([null, undefined, NaN, 'x', 0xffffff, 0]).split(',')[0], '555555')
// повреждённое -> null (циферблат покрасит серым)
for (const bad of [null, undefined, '', 'abc', 'd1544e', 'd1544e,e38b3f', s + ',111111', 'zzzzzz,e38b3f,e0c441,9cc24b,43a857,000000', 'd1544e,e38b3f,e0c441,9cc24b,43a857,00000']) {
  assert.equal(link.unpack(bad), null, String(bad))
}
assert.equal(link.toInt('12'), 12)
assert.equal(link.toInt(undefined), 0)
assert.equal(link.toInt(''), 0)
assert.equal(link.toInt('abc'), 0)

// палитра: крайние точки и серый
assert.equal(forRatio(0), 0xd1544e)
assert.equal(forRatio(1), 0x43a857)
assert.equal(forRatio(7), 0x43a857)
assert.equal(forRatio(null), GRAY)

// тестовые цвета: всегда 6 штук, меняются с каждым номером записи
for (let n = 1; n <= 40; n++) {
  const c = testColors(n)
  assert.equal(c.length, 6)
  assert.ok(link.unpack(link.pack(c)))
}
assert.notEqual(link.pack(testColors(1)), link.pack(testColors(2)))
console.log('link: ok')
