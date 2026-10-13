// Run: npm test — weekly review: Monday-start weeks (Sunday belongs to the week before) and the goal-to-adjust pick
const test = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const vm = require('node:vm')

const ctx = {}
for (const f of ['utils.js', 'review.js']) vm.runInNewContext(fs.readFileSync(`${__dirname}/../src/js/${f}`, 'utf8'), ctx)

test('weekDates runs Monday to Sunday', () => {
  const sunday = ctx.weekDates(new Date(2026, 9, 18)) // Sun Oct 18 2026
  assert.equal(sunday[0], '2026-10-12')
  assert.equal(sunday[6], '2026-10-18')
  assert.deepEqual(ctx.weekDates(new Date(2026, 9, 12)), sunday) // Monday gives the same week
})

test('goalToAdjust picks the lowest rate under 70%, ignoring unscheduled goals', () => {
  const s = (id, rate) => ({ goal: { id }, rate })
  assert.equal(ctx.goalToAdjust([s(1, 80), s(2, 40), s(3, 10), s(4, null)]).goal.id, 3)
  assert.equal(ctx.goalToAdjust([s(1, 80), s(2, null)]), null)
})
