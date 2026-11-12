(async function () {
  'use strict';
  const C = window.SaveTrackCalc;
  const DB = window.SaveTrackDB;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const incomeCategories = ['Salary', 'Bonus', 'Freelance', 'Investment', 'Gift', 'Other income'];
  const expenseCategories = ['Housing', 'Food', 'Transport', 'Utilities', 'Shopping', 'Health', 'Entertainment', 'Education', 'Subscription', 'Insurance', 'Tax', 'Other'];
  const icons = { Salary: '💼', Bonus: '✨', Freelance: '🧑‍💻', Investment: '📈', Gift: '🎁', 'Other income': '↗️', Housing: '🏠', Food: '🍱', Transport: '🚆', Utilities: '💡', Shopping: '🛍️', Health: '🩺', Entertainment: '🎮', Education: '📚', Subscription: '🔁', Insurance: '🛡️', Tax: '🧾', Other: '📦' };
  const allocationColors = { creditCardPayment: '#fb7185', nisa: '#34d399', cashReserve: '#fbbf24', other: '#8b5cf6', netSavings: '#2dd4bf' };
  const allocationLabels = { creditCardPayment: 'Card payment', nisa: 'NISA', cashReserve: 'Cash', other: 'Other', netSavings: 'Net savings' };
  let state;
  let selectedMonth = C.monthKey(new Date());
  let activityFilter = 'all';
  let toastTimer;
  let planTimer;

  try {
    state = await DB.get();
  } catch (error) {
    console.error(error);
    state = DB.defaultState();
    showToast('Could not open local database. Check Safari storage settings.');
  }

  function currencyCode() { return (state.settings && state.settings.currency) || 'JPY'; }
  function currencySymbol() { return { JPY: '¥', USD: '$', EUR: '€', GBP: '£' }[currencyCode()] || '¥'; }
  function money(value, compact = false) {
    const code = currencyCode();
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: code, maximumFractionDigits: code === 'JPY' ? 0 : 2, notation: compact ? 'compact' : 'standard' }).format(C.number(value));
  }
  function monthName(key, short = false) {
    const [year, month] = key.split('-').map(Number);
    return new Intl.DateTimeFormat(undefined, { month: short ? 'short' : 'long', year: short ? undefined : 'numeric' }).format(new Date(year, month - 1, 1));
  }
  function dateLabel(date) {
    const parsed = new Date(`${date}T12:00:00`);
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(parsed);
  }
  function showToast(message) {
    const element = $('#toast');
    element.textContent = message;
    element.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove('show'), 2600);
  }
  async function save(message) {
    try {
      state = await DB.set(state);
      if (message) showToast(message);
    } catch (error) {
      console.error(error);
      showToast('Save failed. Your browser may be out of storage.');
    }
  }
  function empty(icon, title, hint) {
    return `<div class="empty-state"><span>${icon}</span><strong>${title}</strong><p>${hint}</p></div>`;
  }
  function safe(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  }

  function render() {
    const data = C.summary(state, selectedMonth);
    $('#monthLabel').textContent = monthName(selectedMonth);
    $('#monthPicker').value = selectedMonth;
    renderDashboard(data);
    renderActivity();
    renderFixed(data);
    renderSavings(data);
    renderInsights(data);
    renderSettings();
  }

  function renderDashboard(data) {
    const profileName = (state.settings && state.settings.displayName) || 'Saver';
    $('#heroTitle').textContent = data.income ? `${profileName}, your score is ${data.score}` : 'Build your first streak';
    $('#heroMessage').textContent = data.income ? (data.netSavings >= 0 ? `You kept ${money(data.netSavings)} after expenses and allocations.` : `Your plan is ${money(Math.abs(data.netSavings))} over the available remainder.`) : 'Log income and spending to reveal this month’s score.';
    $('#savingsScore').textContent = data.score;
    $('#orbValue').style.strokeDashoffset = String(308 - (308 * data.score / 100));
    const level = C.level(state);
    $('#levelLabel').textContent = `Level ${level.current} · ${level.name}`;
    $('#xpLabel').textContent = `${level.inLevel} / 500 XP`;
    $('#xpFill').style.width = `${level.inLevel / 5}%`;
    $('#incomeMetric').textContent = money(data.income, true);
    $('#expenseMetric').textContent = money(data.expenses, true);
    $('#remainingMetric').textContent = money(data.remaining, true);
    $('#savingMetric').textContent = money(data.netSavings, true);
    $('#incomeCount').textContent = `${data.incomes.length} ${data.incomes.length === 1 ? 'entry' : 'entries'}`;
    $('#expenseCount').textContent = `${data.ordinaryExpenses.length + data.fixed.length} ${data.ordinaryExpenses.length + data.fixed.length === 1 ? 'entry' : 'entries'}`;
    $('#rateMetric').textContent = `${data.savingsRate.toFixed(1)}% of income`;
    renderAllocation(data);
    renderRecent(data);
    renderMissions(data);
  }

  function renderAllocation(data) {
    const bar = $('#allocationBar');
    const legend = $('#allocationLegend');
    const base = Math.max(data.remaining, data.allocated, 1);
    const entries = [
      ['creditCardPayment', C.number(data.plan.creditCardPayment)],
      ['nisa', C.number(data.plan.nisa)],
      ['cashReserve', C.number(data.plan.cashReserve)],
      ['other', C.number(data.plan.other)],
      ['netSavings', Math.max(0, data.netSavings)]
    ];
    bar.innerHTML = entries.map(([key, value]) => `<span title="${allocationLabels[key]}" style="width:${Math.max(0, value / base * 100)}%;background:${allocationColors[key]}"></span>`).join('');
    legend.innerHTML = entries.map(([key, value]) => `<div class="legend-item"><span class="dot" style="background:${allocationColors[key]}"></span><span>${allocationLabels[key]}<b>${money(value, true)}</b></span></div>`).join('');
    const warning = $('#allocationWarning');
    warning.hidden = data.netSavings >= 0;
    warning.textContent = data.netSavings < 0 ? `Over-allocated by ${money(Math.abs(data.netSavings))}. Reduce one or more allocations.` : '';
  }

  function recentItems(data) {
    const variable = data.transactions.map((item) => ({ ...item, recurring: false }));
    const fixed = data.fixed.map((item) => ({ ...item, id: `fixed:${item.id}`, type: 'expense', date: `${selectedMonth}-${String(Math.min(C.number(item.day) || 1, 28)).padStart(2, '0')}`, note: 'Recurring fixed expense', recurring: true }));
    return variable.concat(fixed).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  function activityRow(item) {
    const positive = item.type === 'income';
    return `<div class="activity-row" data-id="${safe(item.id)}" data-recurring="${Boolean(item.recurring)}"><div class="activity-icon">${icons[item.category] || (positive ? '↗️' : '📦')}</div><div class="activity-main"><strong>${safe(item.note || item.name || item.category)}</strong><small>${safe(item.category)} · ${item.recurring ? 'Recurring · ' : ''}${safe(item.paymentMethod || '')}</small></div><div class="activity-amount"><strong class="${positive ? 'positive' : 'negative'}">${positive ? '+' : '−'}${money(item.amount)}</strong><small>${dateLabel(item.date)}</small></div></div>`;
  }

  function renderRecent(data) {
    const items = recentItems(data).slice(0, 5);
    $('#recentActivity').innerHTML = items.length ? items.map(activityRow).join('') : empty('🪙', 'No activity yet', 'Use the + button to add your first income or expense.');
  }

  function renderMissions(data) {
    const missions = [
      { icon: '🧾', name: 'Record the month', hint: 'Add at least 3 entries', done: data.transactions.length >= 3 },
      { icon: '🔁', name: 'Switch on auto-pilot', hint: 'Add one fixed expense', done: (state.fixedExpenses || []).length > 0 },
      { icon: '🌱', name: 'Invest in future you', hint: 'Set a NISA allocation', done: C.number(data.plan.nisa) > 0 },
      { icon: '🏆', name: 'Finish above zero', hint: 'Keep positive net savings', done: data.income > 0 && data.netSavings > 0 }
    ];
    $('#missionList').innerHTML = missions.map((mission) => `<div class="mission ${mission.done ? 'complete' : ''}"><span>${mission.icon}</span><div><strong>${mission.name}</strong><small>${mission.hint}</small></div><span class="mission-check">${mission.done ? '✓' : '·'}</span></div>`).join('');
  }

  function renderActivity() {
    const items = (state.transactions || []).filter((item) => String(item.date).slice(0, 7) === selectedMonth && (activityFilter === 'all' || item.type === activityFilter)).sort((a, b) => String(b.date).localeCompare(String(a.date)));
    $('#activityList').innerHTML = items.length ? items.map(activityRow).join('') : empty('📒', 'No matching entries', 'Add income or an expense for this month.');
  }

  function renderFixed(data) {
    $('#fixedTotal').textContent = money(data.fixedExpenses);
    $('#fixedCount').textContent = `${data.fixed.length} recurring ${data.fixed.length === 1 ? 'item' : 'items'} active this month`;
    const items = (state.fixedExpenses || []).slice().sort((a, b) => Number(b.active) - Number(a.active) || String(a.name).localeCompare(String(b.name)));
    $('#fixedList').innerHTML = items.length ? items.map((item) => `<div class="fixed-row ${item.active ? '' : 'inactive'}" data-fixed-id="${safe(item.id)}"><div class="activity-icon">${icons[item.category] || '🔁'}</div><div><strong>${safe(item.name)}</strong><small>${safe(item.category)} · ${safe(item.paymentMethod)} · day ${safe(item.day)} · from ${safe(item.startMonth)}</small></div><strong>${money(item.amount)}</strong></div>`).join('') : empty('🔁', 'No fixed expenses', 'Add rent, subscriptions, insurance or other monthly costs once.');
  }

  function renderSavings(data) {
    $('#eqIncome').textContent = money(data.income);
    $('#eqExpenses').textContent = `− ${money(data.expenses)}`;
    $('#eqRemaining').textContent = money(data.remaining);
    const form = $('#planForm');
    ['creditCardPayment', 'nisa', 'cashReserve', 'other'].forEach((field) => { form.elements[field].value = C.number(data.plan[field]) || ''; });
    $$('#planForm [id^="currencyPrefix"]').forEach((element) => { element.textContent = currencySymbol(); });
    $('#netSavings').textContent = money(data.netSavings);
    $('#netCard').classList.toggle('over', data.netSavings < 0);
    $('#netHint').textContent = data.netSavings < 0 ? `Reduce allocations by ${money(Math.abs(data.netSavings))}` : `Savings rate: ${data.savingsRate.toFixed(1)}%`;
  }

  function renderInsights(data) {
    const history = C.history(state, selectedMonth, 6);
    const previous = history[history.length - 2];
    const change = previous && previous.netSavings !== 0 ? ((data.netSavings - previous.netSavings) / Math.abs(previous.netSavings)) * 100 : null;
    $('#trendChange').textContent = change == null || !Number.isFinite(change) ? '—' : `${change >= 0 ? '+' : ''}${change.toFixed(0)}%`;
    $('#trendChange').className = change >= 0 ? 'positive' : 'negative';
    drawChart(history);
    renderBreakdown('#categoryBreakdown', C.categoryTotals(state, selectedMonth));
    renderBreakdown('#paymentBreakdown', C.paymentTotals(state, selectedMonth));
  }

  function renderBreakdown(selector, totals) {
    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const maximum = Math.max(...entries.map((item) => item[1]), 1);
    $(selector).innerHTML = entries.length ? entries.map(([name, amount]) => `<div class="category-row"><span>${safe(name)}</span><div class="category-track"><span style="width:${amount / maximum * 100}%"></span></div><strong>${money(amount, true)}</strong></div>`).join('') : empty('📡', 'Nothing to analyze', 'Add expenses to see the breakdown.');
  }

  function drawChart(history) {
    const canvas = $('#savingsChart');
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(320, Math.round(rect.width * ratio));
    canvas.height = Math.max(220, Math.round(rect.height * ratio));
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    const width = canvas.width / ratio;
    const height = canvas.height / ratio;
    const pad = { top: 20, right: 10, bottom: 34, left: 12 };
    const values = history.map((item) => item.netSavings);
    const min = Math.min(0, ...values);
    const max = Math.max(1, ...values);
    const range = max - min || 1;
    const x = (index) => pad.left + index * ((width - pad.left - pad.right) / Math.max(1, history.length - 1));
    const y = (value) => pad.top + (max - value) / range * (height - pad.top - pad.bottom);
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1;
    [0, .5, 1].forEach((part) => { const lineY = pad.top + part * (height - pad.top - pad.bottom); ctx.beginPath(); ctx.moveTo(pad.left, lineY); ctx.lineTo(width - pad.right, lineY); ctx.stroke(); });
    if (min < 0) { ctx.strokeStyle = 'rgba(251,113,133,.26)'; ctx.beginPath(); ctx.moveTo(pad.left, y(0)); ctx.lineTo(width - pad.right, y(0)); ctx.stroke(); }
    const gradient = ctx.createLinearGradient(0, pad.top, 0, height - pad.bottom); gradient.addColorStop(0, 'rgba(45,212,191,.35)'); gradient.addColorStop(1, 'rgba(45,212,191,0)');
    ctx.beginPath(); history.forEach((item, index) => index ? ctx.lineTo(x(index), y(item.netSavings)) : ctx.moveTo(x(index), y(item.netSavings))); ctx.lineTo(x(history.length - 1), height - pad.bottom); ctx.lineTo(x(0), height - pad.bottom); ctx.closePath(); ctx.fillStyle = gradient; ctx.fill();
    ctx.beginPath(); history.forEach((item, index) => index ? ctx.lineTo(x(index), y(item.netSavings)) : ctx.moveTo(x(index), y(item.netSavings))); ctx.strokeStyle = '#2dd4bf'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
    history.forEach((item, index) => { ctx.beginPath(); ctx.arc(x(index), y(item.netSavings), 4, 0, Math.PI * 2); ctx.fillStyle = item.netSavings < 0 ? '#fb7185' : '#c4b5fd'; ctx.fill(); ctx.fillStyle = '#8994b8'; ctx.font = '10px system-ui'; ctx.textAlign = 'center'; ctx.fillText(monthName(item.month, true), x(index), height - 11); });
  }

  function renderSettings() {
    const form = $('#settingsForm');
    form.elements.displayName.value = state.settings.displayName || '';
    form.elements.currency.value = currencyCode();
    form.elements.monthlyGoal.value = C.number(state.settings.monthlyGoal) || '';
  }

  function navigate(target) {
    $$('.view').forEach((view) => view.classList.toggle('active', view.dataset.view === target));
    $$('.nav-item').forEach((button) => button.classList.toggle('active', button.dataset.target === target));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (target === 'insights') setTimeout(() => renderInsights(C.summary(state, selectedMonth)), 40);
  }

  function populateCategories(form, type) {
    const select = form.elements.category;
    const current = select.value;
    const list = type === 'income' ? incomeCategories : expenseCategories;
    select.innerHTML = list.map((name) => `<option value="${name}">${name}</option>`).join('');
    if (list.includes(current)) select.value = current;
    const payment = $('.payment-field', form);
    if (payment) payment.hidden = type === 'income';
  }

  function openTransaction(item) {
    const form = $('#transactionForm');
    form.reset();
    const editing = Boolean(item);
    const type = item ? item.type : 'expense';
    form.elements.id.value = item ? item.id : '';
    form.elements.type.value = type;
    populateCategories(form, type);
    form.elements.date.value = item ? item.date : `${selectedMonth}-${String(Math.min(new Date().getDate(), 28)).padStart(2, '0')}`;
    if (item) {
      form.elements.amount.value = item.amount;
      form.elements.category.value = item.category;
      form.elements.paymentMethod.value = item.paymentMethod || 'Bank account';
      form.elements.note.value = item.note || '';
    }
    $('#transactionDialogTitle').textContent = editing ? 'Edit activity' : 'Add activity';
    $('#deleteTransaction').hidden = !editing;
    $('#transactionDialog').showModal();
  }

  function openFixed(item) {
    const form = $('#fixedForm');
    form.reset();
    form.elements.category.innerHTML = expenseCategories.map((name) => `<option value="${name}">${name}</option>`).join('');
    form.elements.id.value = item ? item.id : '';
    form.elements.startMonth.value = item ? item.startMonth : selectedMonth;
    form.elements.active.checked = item ? Boolean(item.active) : true;
    if (item) {
      ['name', 'amount', 'category', 'paymentMethod', 'day'].forEach((field) => { form.elements[field].value = item[field]; });
    }
    $('#fixedDialogTitle').textContent = item ? 'Edit fixed expense' : 'Add fixed expense';
    $('#deleteFixed').hidden = !item;
    $('#fixedDialog').showModal();
  }

  function download(name, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = name; document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function loadDemoData() {
    if ((state.transactions || []).length && !confirm('Add sample data alongside your existing entries?')) return;
    const now = selectedMonth;
    const [year, month] = now.split('-').map(Number);
    const d = (day, offset = 0) => `${C.shiftMonth(now, offset)}-${String(day).padStart(2, '0')}`;
    const entries = [];
    for (let offset = -5; offset <= 0; offset += 1) {
      const variance = (offset + 5) * 6500;
      entries.push({ id: uid(), type: 'income', amount: 500000 + variance, category: 'Salary', date: d(25, offset), paymentMethod: '', note: 'Monthly salary' });
      entries.push({ id: uid(), type: 'expense', amount: 42000 + (offset + 5) * 1000, category: 'Food', date: d(8, offset), paymentMethod: 'Credit card', note: 'Groceries & meals' });
      entries.push({ id: uid(), type: 'expense', amount: 18000, category: 'Transport', date: d(12, offset), paymentMethod: 'Credit card', note: 'Travel' });
      entries.push({ id: uid(), type: 'expense', amount: 24000 + (offset % 2 === 0 ? 8000 : 0), category: 'Shopping', date: d(18, offset), paymentMethod: 'Credit card', note: 'Personal spending' });
      state.plans[C.shiftMonth(now, offset)] = { creditCardPayment: 50000, nisa: 60000, cashReserve: 20000, other: 0 };
    }
    state.transactions = (state.transactions || []).concat(entries);
    state.fixedExpenses = (state.fixedExpenses || []).concat([
      { id: uid(), name: 'Rent', amount: 125000, category: 'Housing', paymentMethod: 'Bank account', startMonth: `${year}-${String(month).padStart(2, '0')}`, day: 1, active: true },
      { id: uid(), name: 'Phone & internet', amount: 11000, category: 'Utilities', paymentMethod: 'Credit card', startMonth: C.shiftMonth(now, -5), day: 10, active: true },
      { id: uid(), name: 'Streaming', amount: 2400, category: 'Subscription', paymentMethod: 'Credit card', startMonth: C.shiftMonth(now, -5), day: 15, active: true },
      { id: uid(), name: 'Insurance', amount: 13600, category: 'Insurance', paymentMethod: 'Bank account', startMonth: C.shiftMonth(now, -5), day: 27, active: true }
    ]);
    save('Sample quest loaded').then(render);
  }

  $$('.nav-item').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.target)));
  $$('[data-go]').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.go)));
  $('#previousMonth').addEventListener('click', () => { selectedMonth = C.shiftMonth(selectedMonth, -1); render(); });
  $('#nextMonth').addEventListener('click', () => { selectedMonth = C.shiftMonth(selectedMonth, 1); render(); });
  $('#monthButton').addEventListener('click', () => { const picker = $('#monthPicker'); if (picker.showPicker) picker.showPicker(); else picker.click(); });
  $('#monthPicker').addEventListener('change', (event) => { if (event.target.value) { selectedMonth = event.target.value; render(); } });
  $('#quickAdd').addEventListener('click', () => openTransaction());
  $('#addTransaction').addEventListener('click', () => openTransaction());
  $('#addFixed').addEventListener('click', () => openFixed());
  $('#privacyButton').addEventListener('click', () => $('#privacyDialog').showModal());
  $$('.close-dialog').forEach((button) => button.addEventListener('click', () => button.closest('dialog').close()));
  $$('#transactionForm input[name="type"]').forEach((radio) => radio.addEventListener('change', (event) => populateCategories($('#transactionForm'), event.target.value)));
  $$('.chip').forEach((button) => button.addEventListener('click', () => { activityFilter = button.dataset.filter; $$('.chip').forEach((chip) => chip.classList.toggle('active', chip === button)); renderActivity(); }));

  $('#transactionForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    payload.amount = C.number(payload.amount);
    if (!payload.id) payload.id = uid();
    if (payload.type === 'income') payload.paymentMethod = '';
    const index = state.transactions.findIndex((item) => item.id === payload.id);
    if (index >= 0) state.transactions[index] = payload; else state.transactions.push(payload);
    await save(index >= 0 ? 'Entry updated' : 'Entry added');
    $('#transactionDialog').close(); render();
  });

  $('#fixedForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    payload.amount = C.number(payload.amount); payload.day = C.number(payload.day); payload.active = form.elements.active.checked;
    if (!payload.id) payload.id = uid();
    const index = state.fixedExpenses.findIndex((item) => item.id === payload.id);
    if (index >= 0) state.fixedExpenses[index] = payload; else state.fixedExpenses.push(payload);
    await save(index >= 0 ? 'Fixed expense updated' : 'Fixed expense added');
    $('#fixedDialog').close(); render();
  });

  $('#deleteTransaction').addEventListener('click', async () => {
    const id = $('#transactionForm').elements.id.value;
    if (!id || !confirm('Delete this entry?')) return;
    state.transactions = state.transactions.filter((item) => item.id !== id);
    await save('Entry deleted'); $('#transactionDialog').close(); render();
  });
  $('#deleteFixed').addEventListener('click', async () => {
    const id = $('#fixedForm').elements.id.value;
    if (!id || !confirm('Delete this fixed expense?')) return;
    state.fixedExpenses = state.fixedExpenses.filter((item) => item.id !== id);
    await save('Fixed expense deleted'); $('#fixedDialog').close(); render();
  });

  document.addEventListener('click', (event) => {
    const activity = event.target.closest('.activity-row');
    if (activity && !activity.dataset.recurring.includes('true')) {
      const item = state.transactions.find((row) => row.id === activity.dataset.id);
      if (item) openTransaction(item);
    }
    const fixed = event.target.closest('[data-fixed-id]');
    if (fixed) {
      const item = state.fixedExpenses.find((row) => row.id === fixed.dataset.fixedId);
      if (item) openFixed(item);
    }
  });

  $('#planForm').addEventListener('input', () => {
    clearTimeout(planTimer);
    planTimer = setTimeout(async () => {
      const values = Object.fromEntries(new FormData($('#planForm')).entries());
      state.plans[selectedMonth] = { creditCardPayment: C.number(values.creditCardPayment), nisa: C.number(values.nisa), cashReserve: C.number(values.cashReserve), other: C.number(values.other) };
      await save(); renderDashboard(C.summary(state, selectedMonth)); renderSavings(C.summary(state, selectedMonth));
    }, 350);
  });

  $('#settingsForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    state.settings = { displayName: values.displayName.trim() || 'Saver', currency: values.currency, monthlyGoal: C.number(values.monthlyGoal) };
    await save('Settings saved'); render();
  });

  $('#exportBackup').addEventListener('click', () => {
    const payload = JSON.stringify({ product: 'SaveTrack', schemaVersion: 1, exportedAt: new Date().toISOString(), data: state }, null, 2);
    download(`SaveTrack-Backup-${selectedMonth}.json`, payload, 'application/json'); showToast('Backup exported');
  });
  $('#importBackup').addEventListener('change', async (event) => {
    const file = event.target.files[0]; if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const restored = parsed.product === 'SaveTrack' ? parsed.data : parsed;
      if (!restored || !Array.isArray(restored.transactions) || !Array.isArray(restored.fixedExpenses) || typeof restored.plans !== 'object') throw new Error('Invalid backup structure');
      if (!confirm('Replace all current SaveTrack data with this backup?')) return;
      state = Object.assign(DB.defaultState(), restored); await save('Backup restored'); render();
    } catch (error) { console.error(error); showToast('That file is not a valid SaveTrack backup'); }
    event.target.value = '';
  });
  $('#exportCsv').addEventListener('click', () => {
    const rows = [['Month', 'Income', 'Variable expenses', 'Fixed expenses', 'After expenses', 'Card allocation', 'NISA', 'Cash', 'Other', 'Net savings']];
    C.history(state, selectedMonth, 12).forEach((item) => rows.push([item.month, item.income, item.variableExpenses, item.fixedExpenses, item.remaining, item.plan.creditCardPayment, item.plan.nisa, item.plan.cashReserve, item.plan.other, item.netSavings]));
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    download(`SaveTrack-Monthly-${selectedMonth}.csv`, csv, 'text/csv;charset=utf-8'); showToast('CSV exported');
  });
  $('#loadDemo').addEventListener('click', loadDemoData);
  $('#clearData').addEventListener('click', async () => {
    if (!confirm('Erase every income, expense, fixed cost, plan and setting stored by SaveTrack on this device? This cannot be undone.')) return;
    await DB.clear(); state = DB.defaultState(); await save('All local data erased'); render();
  });

  window.addEventListener('resize', () => { if ($('#insightsView').classList.contains('active')) renderInsights(C.summary(state, selectedMonth)); });
  window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); window.deferredInstallPrompt = event; });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js').catch((error) => console.warn('Offline setup failed', error));

  render();
})();
