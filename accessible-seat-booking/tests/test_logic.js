const assert = require('assert');
const a = require('../after/app.js');
let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok  ' + name); };

t('seatId / seatLabel', () => {
  assert.strictEqual(a.seatId(0, 0), 'A1');
  assert.strictEqual(a.seatId(4, 7), 'E8');
  assert.strictEqual(a.seatLabel('C5', 'available'), 'Row C, seat 5, available');
  assert.strictEqual(a.seatLabel('B10', 'selected'), 'Row B, seat 10, selected');
});
t('summarize', () => {
  assert.strictEqual(a.summarize([]), 'No seats selected.');
  assert.strictEqual(a.summarize(['C5']), '1 seat selected: C5. Total \u20B9250.');
  assert.strictEqual(a.summarize(['C5', 'C6']), '2 seats selected: C5, C6. Total \u20B9500.');
});
t('moveFocus stays inside the grid', () => {
  const R = a.ROWS.length, C = a.COLS;
  assert.deepStrictEqual(a.moveFocus({ r: 0, c: 0 }, 'ArrowLeft', R, C), { r: 0, c: 0 });
  assert.deepStrictEqual(a.moveFocus({ r: 0, c: 0 }, 'ArrowUp', R, C), { r: 0, c: 0 });
  assert.deepStrictEqual(a.moveFocus({ r: R - 1, c: C - 1 }, 'ArrowRight', R, C), { r: R - 1, c: C - 1 });
  assert.deepStrictEqual(a.moveFocus({ r: R - 1, c: C - 1 }, 'ArrowDown', R, C), { r: R - 1, c: C - 1 });
  assert.deepStrictEqual(a.moveFocus({ r: 1, c: 3 }, 'ArrowRight', R, C), { r: 1, c: 4 });
  assert.deepStrictEqual(a.moveFocus({ r: 1, c: 3 }, 'ArrowDown', R, C), { r: 2, c: 3 });
  assert.deepStrictEqual(a.moveFocus({ r: 2, c: 5 }, 'Home', R, C), { r: 2, c: 0 });
  assert.deepStrictEqual(a.moveFocus({ r: 2, c: 5 }, 'End', R, C), { r: 2, c: C - 1 });
  assert.deepStrictEqual(a.moveFocus({ r: 2, c: 5 }, 'Tab', R, C), { r: 2, c: 5 });
});
t('validate: empty form lists every problem in page order', () => {
  const e = a.validate({ seats: [], name: ' ', email: '' });
  assert.deepStrictEqual(e.map(x => x.field), ['seat-grid', 'name', 'email']);
});
t('validate: bad and good email', () => {
  const bad = a.validate({ seats: ['A1'], name: 'Kushal', email: 'kushal@' });
  assert.strictEqual(bad.length, 1);
  assert.strictEqual(bad[0].field, 'email');
  assert.ok(/name@example\.com/.test(bad[0].message));
  assert.deepStrictEqual(a.validate({ seats: ['A1'], name: 'Kushal', email: ' k@x.in ' }), []);
});
t('unavailable seats are valid grid ids', () => {
  a.UNAVAILABLE.forEach(id => assert.ok(/^[A-E][1-8]$/.test(id), id));
});
console.log('\n' + n + ' tests passed');
