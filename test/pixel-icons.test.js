// Run: npm test — every sprite layer must be 16x16 and only use palette colors, so hand edits can't break the art
const test = require('node:test')
const assert = require('node:assert')
const { px, PX_SPRITES, PX_PALETTE } = require('../src/js/pixel-icons.js')

test('sprites are 16x16 and use only palette colors', () => {
  for (const [name, layers] of Object.entries(PX_SPRITES)) {
    for (const { rows } of layers) {
      assert.equal(rows.length, 16, name)
      for (const row of rows) {
        assert.equal(row.length, 16, `${name}: ${row}`)
        for (const ch of row) assert.ok(ch === '.' || ch in PX_PALETTE, `${name}: unknown color '${ch}'`)
      }
    }
  }
})

test('px renders an svg, sized when asked, empty for unknown names', () => {
  assert.match(px('bell'), /^<svg class="px px-bell"/)
  assert.match(px('bell', 32), /width:32px;height:32px/)
  assert.equal(px('nope'), '')
})
