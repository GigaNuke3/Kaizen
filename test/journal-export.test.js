// Run: npm test — journal export groups entries by day and escapes text in the PDF HTML
const test = require('node:test')
const assert = require('node:assert')
const { journalToMarkdown, journalToHtml } = require('../database/backend.js')

const rows = [
  ['2026-10-12', '07:40', 'good', 'Ran in the rain.', 'Morning run'],
  ['2026-10-12', '21:00', null, 'Read 20 pages.', null],
  ['2026-10-13', '07:35', 'happy', '<script>alert(1)</script>', 'Morning run']
]

test('markdown has one heading per day and entry details', () => {
  const md = journalToMarkdown(rows)
  assert.equal(md.match(/^## /gm).length, 2)
  assert.match(md, /### 07:40 · good · Morning run\n\nRan in the rain\./)
  assert.match(md, /### 21:00\n\nRead 20 pages\./)
})

test('pdf html escapes journal text', () => {
  const html = journalToHtml(rows)
  assert.ok(!html.includes('<script>alert(1)'))
  assert.ok(html.includes('&lt;script&gt;'))
})
