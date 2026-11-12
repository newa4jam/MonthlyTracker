(function (root) {
  'use strict';

  const number = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const monthKey = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const shiftMonth = (key, amount) => {
    const [year, month] = key.split('-').map(Number);
    return monthKey(new Date(year, month - 1 + amount, 1));
  };

  const fixedIsActive = (item, key) => Boolean(item.active) && (!item.startMonth || item.startMonth <= key) && (!item.endMonth || item.endMonth >= key);

  const summary = (state, key) => {
    const transactions = (state.transactions || []).filter((item) => String(item.date || '').slice(0, 7) === key);
    const fixed = (state.fixedExpenses || []).filter((item) => fixedIsActive(item, key));
    const incomes = transactions.filter((item) => item.type === 'income');
    const ordinaryExpenses = transactions.filter((item) => item.type === 'expense');
    const income = incomes.reduce((sum, item) => sum + number(item.amount), 0);
    const variableExpenses = ordinaryExpenses.reduce((sum, item) => sum + number(item.amount), 0);
    const fixedExpenses = fixed.reduce((sum, item) => sum + number(item.amount), 0);
    const expenses = variableExpenses + fixedExpenses;
    const remaining = income - expenses;
    const plan = Object.assign({ creditCardPayment: 0, nisa: 0, cashReserve: 0, other: 0 }, (state.plans || {})[key]);
    const allocated = number(plan.creditCardPayment) + number(plan.nisa) + number(plan.cashReserve) + number(plan.other);
    const netSavings = remaining - allocated;
    const savingsRate = income > 0 ? (netSavings / income) * 100 : 0;
    const goal = number(state.settings && state.settings.monthlyGoal);
    const goalProgress = goal > 0 ? clamp((netSavings / goal) * 100, 0, 100) : 0;
    const score = income > 0 ? Math.round(clamp((savingsRate + 20) * 1.65, 0, 100)) : 0;
    return { transactions, fixed, incomes, ordinaryExpenses, income, variableExpenses, fixedExpenses, expenses, remaining, plan, allocated, netSavings, savingsRate, goal, goalProgress, score };
  };

  const categoryTotals = (state, key) => {
    const result = {};
    const data = summary(state, key);
    data.ordinaryExpenses.forEach((item) => { result[item.category || 'Other'] = (result[item.category || 'Other'] || 0) + number(item.amount); });
    data.fixed.forEach((item) => { result[item.category || 'Other'] = (result[item.category || 'Other'] || 0) + number(item.amount); });
    return result;
  };

  const paymentTotals = (state, key) => {
    const result = {};
    const data = summary(state, key);
    data.ordinaryExpenses.forEach((item) => { result[item.paymentMethod || 'Other'] = (result[item.paymentMethod || 'Other'] || 0) + number(item.amount); });
    data.fixed.forEach((item) => { result[item.paymentMethod || 'Other'] = (result[item.paymentMethod || 'Other'] || 0) + number(item.amount); });
    return result;
  };

  const history = (state, key, count) => {
    return Array.from({ length: count }, (_, index) => {
      const month = shiftMonth(key, index - count + 1);
      return { month, ...summary(state, month) };
    });
  };

  const level = (state) => {
    const transactionXp = (state.transactions || []).length * 20;
    const fixedXp = (state.fixedExpenses || []).length * 35;
    const planXp = Object.keys(state.plans || {}).length * 50;
    const positiveMonths = Object.keys(state.plans || {}).filter((key) => summary(state, key).netSavings > 0).length;
    const xp = transactionXp + fixedXp + planXp + positiveMonths * 100;
    const current = Math.floor(xp / 500) + 1;
    const names = ['Starter', 'Tracker', 'Planner', 'Builder', 'Strategist', 'Savings Hero'];
    return { xp, current, inLevel: xp % 500, name: names[Math.min(current - 1, names.length - 1)] };
  };

  const api = { number, clamp, monthKey, shiftMonth, fixedIsActive, summary, categoryTotals, paymentTotals, history, level };
  root.SaveTrackCalc = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
