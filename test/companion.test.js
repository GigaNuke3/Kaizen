// Run: npm test — checks the dashboard companion's mood rules (src/js/dashboard.js is a browser script, so load it in a vm)
const test = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const vm = require('node:vm')

const ctx = {}
vm.runInNewContext(fs.readFileSync(__dirname + '/../src/js/dashboard.js', 'utf8'), ctx)
const mood = (today, streak, hour = 12) => ctx.companionStatus(today, streak, hour).mood

test('companion mood follows today\'s progress', () => {
  assert.equal(mood({ scheduled: 0 }, 0), 'neutral')
  assert.equal(mood({ scheduled: 0 }, 3), 'good')
  assert.equal(mood({ completed: 2, scheduled: 2, percentage: 100 }, 0), 'excited')
  assert.equal(mood({ completed: 2, scheduled: 3, percentage: 67 }, 0), 'happy')
  assert.equal(mood({ completed: 1, scheduled: 3, percentage: 33 }, 0), 'good')
  assert.equal(mood({ completed: 0, scheduled: 3, percentage: 0 }, 5, 12), 'neutral')
  assert.equal(mood({ completed: 0, scheduled: 3, percentage: 0 }, 5, 19), 'sad') // streak at risk
  assert.equal(mood({ completed: 0, scheduled: 3, percentage: 0 }, 0, 19), 'neutral') // nothing to lose
  assert.equal(mood(null, 0), 'neutral')
})

test('companion rank follows total check-in days', () => {
  const lvl = (d) => ctx.companionLevel(d)
  assert.equal(lvl(0).title, 'Novice')
  assert.equal(lvl(6).title, 'Novice')
  assert.equal(lvl(7).title, 'Apprentice')
  assert.equal(lvl(18).pct, Math.round((11 / 23) * 100)) // 7→30
  assert.equal(lvl(100).title, 'Master')
  assert.equal(lvl(400).title, 'Sensei')
  assert.equal(lvl(400).next, null)
  assert.equal(lvl(400).pct, 100)
})
