const assert = require('assert');
const C = require('./calc.js');
const state = {
  transactions: [
    { type: 'income', amount: 500000, date: '2026-11-25', category: 'Salary' },
    { type: 'expense', amount: 40000, date: '2026-11-05', category: 'Food', paymentMethod: 'Credit card' },
    { type: 'expense', amount: 20000, date: '2026-10-05', category: 'Food', paymentMethod: 'Cash' }
  ],
  fixedExpenses: [
    { amount: 120000, category: 'Housing', paymentMethod: 'Bank account', startMonth: '2026-09', active: true },
    { amount: 5000, category: 'Subscription', paymentMethod: 'Credit card', startMonth: '2026-12', active: true },
    { amount: 9000, category: 'Other', paymentMethod: 'Cash', startMonth: '2026-01', active: false }
  ],
  plans: { '2026-11': { creditCardPayment: 50000, nisa: 60000, cashReserve: 20000, other: 0 } },
  settings: { monthlyGoal: 100000 }
};
const result = C.summary(state, '2026-11');
assert.strictEqual(result.income, 500000);
assert.strictEqual(result.variableExpenses, 40000);
assert.strictEqual(result.fixedExpenses, 120000);
assert.strictEqual(result.expenses, 160000);
assert.strictEqual(result.remaining, 340000);
assert.strictEqual(result.allocated, 130000);
assert.strictEqual(result.netSavings, 210000);
assert.strictEqual(C.categoryTotals(state, '2026-11').Housing, 120000);
assert.strictEqual(C.paymentTotals(state, '2026-11')['Credit card'], 40000);
assert.strictEqual(C.shiftMonth('2026-01', -1), '2025-12');
assert.strictEqual(C.shiftMonth('2026-12', 1), '2027-01');
assert.strictEqual(C.history(state, '2026-11', 6).length, 6);
console.log('All SaveTrack calculation tests passed.');
