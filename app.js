// ─── STORAGE ───────────────────────────────────────────────
var S = {
get: function(k) { try { var v = localStorage.getItem(‘kvt_’+k); return v ? JSON.parse(v) : null; } catch(e) { return null; } },
set: function(k,v) { try { localStorage.setItem(‘kvt_’+k, JSON.stringify(v)); } catch(e) {} },
};

// ─── STATE ─────────────────────────────────────────────────
var state = {
transactions: S.get(‘txs’) || [],
goals: S.get(‘goals’) || [],
budget: S.get(‘budget’) || 0,
plan: S.get(‘plan’) || null,
settings: S.get(‘settings’) || { accent: ‘#34C759’, sound: false, alertPct: 80 },
ui: { tab: ‘home’, month: new Date().getMonth(), year: new Date().getFullYear() },
};

function save() {
S.set(‘txs’, state.transactions);
S.set(‘goals’, state.goals);
S.set(‘budget’, state.budget);
S.set(‘settings’, state.settings);
}

// ─── CATEGORIES ────────────────────────────────────────────
var CATS = [
{ name:‘Food & Dining’, icon:‘🍔’, color:’#FF9500’, type:‘expense’ },
{ name:‘Transportation’, icon:‘🚗’, color:’#5AC8FA’, type:‘expense’ },
{ name:‘Shopping’, icon:‘🛍️’, color:’#FF2D55’, type:‘expense’ },
{ name:‘Entertainment’, icon:‘🎬’, color:’#AF52DE’, type:‘expense’ },
{ name:‘Bills & Utilities’, icon:‘⚡’, color:’#FFCC00’, type:‘expense’ },
{ name:‘Health & Fitness’, icon:‘💪’, color:’#34C759’, type:‘expense’ },
{ name:‘Travel’, icon:‘✈️’, color:’#00C7BE’, type:‘expense’ },
{ name:‘Other’, icon:‘📝’, color:’#A2845E’, type:‘expense’ },
{ name:‘Work Income’, icon:‘💼’, color:’#007AFF’, type:‘income’ },
{ name:‘Investments’, icon:‘📈’, color:’#34C759’, type:‘income’ },
{ name:‘Gifts’, icon:‘🎁’, color:’#FF2D55’, type:‘income’ },
{ name:‘Other Income’, icon:‘💰’, color:’#34C759’, type:‘income’ },
];

function catFor(name) {
return CATS.find(function(c) { return c.name === name; }) || { name:name, icon:‘💳’, color:’#999’ };
}

// ─── UTILS ─────────────────────────────────────────────────
function fmt(n) {
return new Intl.NumberFormat(‘en-US’, { style:‘currency’, currency:‘USD’, minimumFractionDigits:0, maximumFractionDigits:2 }).format(n || 0);
}

function fmtDate(iso) {
var d = new Date(iso);
return d.toLocaleDateString(‘en-US’, { month:‘short’, day:‘numeric’ });
}

function uid() {
return Date.now().toString(36) + Math.random().toString(36).substr(2,5);
}

function monthKey(y, m) {
return y + ‘-’ + String(m+1).padStart(2,‘0’);
}

function currentMonthTxs() {
var key = monthKey(state.ui.year, state.ui.month);
return state.transactions.filter(function(t) { return t.date.startsWith(key); });
}

function totalIncome(txs) {
return txs.filter(function(t) { return t.type === ‘income’; }).reduce(function(a,t) { return a + t.amount; }, 0);
}

function totalExpense(txs) {
return txs.filter(function(t) { return t.type === ‘expense’; }).reduce(function(a,t) { return a + t.amount; }, 0);
}

// ─── SHEETS ────────────────────────────────────────────────
function openSheet(id) {
var el = document.getElementById(‘sheet-’ + id);
if (el) { el.classList.add(‘open’); }
}

function closeSheet(id) {
var el = document.getElementById(‘sheet-’ + id);
if (el) { el.classList.remove(‘open’); }
}

// ─── TAB NAVIGATION ────────────────────────────────────────
function switchTab(tab) {
document.querySelectorAll(’.screen’).forEach(function(s) { s.classList.remove(‘active’); });
document.querySelectorAll(’.tab-btn’).forEach(function(b) { b.classList.remove(‘active’); });
document.getElementById(‘screen-’ + tab).classList.add(‘active’);
document.getElementById(‘tab-’ + tab).classList.add(‘active’);
state.ui.tab = tab;
renderTab(tab);
}

function renderTab(tab) {
if (tab === ‘home’) renderHome();
else if (tab === ‘analytics’) renderAnalytics();
else if (tab === ‘goals’) renderGoals();
else if (tab === ‘budget’) renderBudget();
else if (tab === ‘settings’) renderSettings();
setTimeout(applyAccentColor, 20);
updateTopbarMonth();
}

// ─── TOPBAR HELPER ─────────────────────────────────────────
function updateTopbarMonth() {
var el = document.getElementById(‘topbar-month’);
if (el) {
var d = new Date(state.ui.year, state.ui.month, 1);
el.textContent = d.toLocaleDateString(‘en-US’, { month:‘short’, year:‘numeric’ });
}
var gr = document.getElementById(‘topbar-greeting’);
if (gr) {
var h = new Date().getHours();
gr.textContent = h < 12 ? ‘Good morning’ : h < 17 ? ‘Good afternoon’ : ‘Good evening’;
}
}

// ─── HOME SCREEN ───────────────────────────────────────────
function renderHome() {
var txs = currentMonthTxs();
var exp = totalExpense(txs);
var inc = totalIncome(txs);
var planExpH = 0;
if (state.plan) { state.plan.buckets.forEach(function(b) { if (b.type !== ‘income’) { b.items.forEach(function(item) { planExpH += itemAmountForMonth(item, state.ui.month); }); } }); }
var budget = planExpH > 0 ? planExpH : state.budget;
var alertPctH = (state.settings && state.settings.alertPct) || 80;
var pct = budget > 0 ? Math.min(exp / budget * 100, 100) : 0;
var fillClass = pct >= 100 ? ‘danger’ : pct >= alertPctH ? ‘warning’ : ‘’;
var monthName = new Date(state.ui.year, state.ui.month, 1).toLocaleDateString(‘en-US’, { month:‘long’, year:‘numeric’ });

var html = ‘<div>’;

// Month picker
html += ‘<div class="month-picker">’;
html += ‘<button class="month-btn" onclick="prevMonth()">‹</button>’;
html += ‘<div class="month-label">’ + monthName + ‘</div>’;
html += ‘<button class="month-btn" onclick="nextMonth()">›</button>’;
html += ‘</div>’;

html += ‘<div class="page-pad fadein">’;

// Summary
html += ‘<div class="summary-row">’;
html += ‘<div class="summary-card"><div class="summary-label">Income</div><div class="summary-value income">’ + fmt(inc) + ‘</div></div>’;
html += ‘<div class="summary-card"><div class="summary-label">Expenses</div><div class="summary-value expense">’ + fmt(exp) + ‘</div></div>’;
html += ‘</div>’;

// Budget progress
if (budget > 0) {
html += ‘<div class="card mb-md">’;
html += ‘<div class="flex justify-between mb-md"><span class="text-sm fw-bold">Monthly Budget</span><span class="text-sm text-muted">’ + fmt(exp) + ’ / ’ + fmt(budget) + ‘</span></div>’;
html += ‘<div class="progress-bar"><div class="progress-fill ' + fillClass + '" style="width:' + pct + '%"></div></div>’;
if (exp > budget) {
html += ’<div class="alert alert-danger mt-sm">⚠️ Over budget by ’ + fmt(exp - budget) + ‘</div>’;
}
html += ‘</div>’;
}

// Transactions list
html += ‘<div class="section-title">Transactions</div>’;

if (realTxs.length === 0) {
html += ‘<div class="empty"><div class="empty-icon">💳</div><div class="empty-title">No transactions yet</div><div class="empty-text">Import a bank CSV in Settings to compare against your budget, or tap + to add manually</div></div>’;
} else {
var realTxs = txs.filter(function(t){return t.notes!==‘Budget import’&&t.notes!==’_imported’;});
var sorted = realTxs.slice().sort(function(a,b) { return b.date.localeCompare(a.date); });
html += ‘<div class="card">’;
for (var i = 0; i < sorted.length; i++) {
var t = sorted[i];
var cat = catFor(t.category);
var isIncome = t.type === ‘income’;
html += ‘<div class="tx-row" onclick="editTx(&apos;' + t.id + '&apos;)">’;
html += ‘<div class="tx-icon" style="background:' + cat.color + '22">’ + cat.icon + ‘</div>’;
html += ‘<div class="tx-info"><div class="tx-merchant">’ + escHtml(t.merchant) + ‘</div>’;
html += ‘<div class="tx-meta">’ + fmtDate(t.date) + ’ · ’ + escHtml(t.category) + ‘</div></div>’;
html += ‘<div class="tx-amount ' + (isIncome ? 'income' : 'expense') + '">’ + (isIncome ? ‘+’ : ‘-’) + fmt(t.amount) + ‘</div>’;
html += ‘</div>’;
}
html += ‘</div>’;
}

html += ‘</div></div>’;

document.getElementById(‘screen-home’).innerHTML = html;

// FAB
var fab = document.getElementById(‘fab-add’);
if (!fab) {
fab = document.createElement(‘button’);
fab.id = ‘fab-add’;
fab.className = ‘fab’;
fab.textContent = ‘+’;
fab.onclick = function() { openAddTx(); };
document.body.appendChild(fab);
}
fab.style.background = state.settings.accent || ‘#34C759’;
fab.style.display = ‘flex’;
}

function prevMonth() {
if (state.ui.month === 0) { state.ui.month = 11; state.ui.year–; }
else { state.ui.month–; }
renderHome();
}

function nextMonth() {
if (state.ui.month === 11) { state.ui.month = 0; state.ui.year++; }
else { state.ui.month++; }
renderHome();
}

function escHtml(s) {
return String(s).replace(/&/g,’&’).replace(/</g,’<’).replace(/>/g,’>’).replace(/”/g,’"’);
}

// ─── ADD TRANSACTION ───────────────────────────────────────
function openAddTx() {
var catSel = document.getElementById(‘tx-category’);
catSel.innerHTML = ‘’;
CATS.forEach(function(c) {
var o = document.createElement(‘option’);
o.value = c.name;
o.textContent = c.icon + ’ ’ + c.name;
catSel.appendChild(o);
});
var today = new Date().toISOString().split(‘T’)[0];
document.getElementById(‘tx-date’).value = today;
document.getElementById(‘tx-amount’).value = ‘’;
document.getElementById(‘tx-merchant’).value = ‘’;
document.getElementById(‘tx-notes’).value = ‘’;
document.getElementById(‘tx-type’).value = ‘expense’;
openSheet(‘add-tx’);
setTimeout(function() { document.getElementById(‘tx-amount’).focus(); }, 350);
}

function saveTx() {
var amount = parseFloat(document.getElementById(‘tx-amount’).value);
var merchant = document.getElementById(‘tx-merchant’).value.trim();
var valid = true;

if (!amount || amount <= 0) {
document.getElementById(‘err-tx-amount’).textContent = ‘Enter a valid amount’;
document.getElementById(‘err-tx-amount’).style.display = ‘block’;
document.getElementById(‘tx-amount’).classList.add(‘input-error’);
valid = false;
} else {
document.getElementById(‘err-tx-amount’).style.display = ‘none’;
document.getElementById(‘tx-amount’).classList.remove(‘input-error’);
}

if (!merchant) {
document.getElementById(‘err-tx-merchant’).textContent = ‘Merchant is required’;
document.getElementById(‘err-tx-merchant’).style.display = ‘block’;
document.getElementById(‘tx-merchant’).classList.add(‘input-error’);
valid = false;
} else {
document.getElementById(‘err-tx-merchant’).style.display = ‘none’;
document.getElementById(‘tx-merchant’).classList.remove(‘input-error’);
}

if (!valid) return;

var tx = {
id: uid(),
amount: amount,
merchant: merchant,
type: document.getElementById(‘tx-type’).value,
category: document.getElementById(‘tx-category’).value,
date: document.getElementById(‘tx-date’).value,
notes: document.getElementById(‘tx-notes’).value.trim(),
};

state.transactions.push(tx);
save();
closeSheet(‘add-tx’);
renderHome();
}

// ─── EDIT TRANSACTION ──────────────────────────────────────
var _editId = null;

function editTx(id) {
var tx = state.transactions.find(function(t) { return t.id === id; });
if (!tx) return;
_editId = id;

var catSel = document.getElementById(‘edit-tx-category’);
catSel.innerHTML = ‘’;
CATS.forEach(function(c) {
var o = document.createElement(‘option’);
o.value = c.name;
o.textContent = c.icon + ’ ’ + c.name;
catSel.appendChild(o);
});

document.getElementById(‘edit-tx-amount’).value = tx.amount;
document.getElementById(‘edit-tx-merchant’).value = tx.merchant;
document.getElementById(‘edit-tx-type’).value = tx.type;
document.getElementById(‘edit-tx-category’).value = tx.category;
document.getElementById(‘edit-tx-date’).value = tx.date;
document.getElementById(‘edit-tx-notes’).value = (tx.notes === ‘Budget import’) ? ‘’ : (tx.notes || ‘’);
openSheet(‘edit-tx’);
}

function updateTx() {
if (!_editId) return;
var idx = state.transactions.findIndex(function(t) { return t.id === _editId; });
if (idx === -1) return;

var newCat = document.getElementById(‘edit-tx-category’).value;
var merch = document.getElementById(‘edit-tx-merchant’).value.trim();
if (idx >= 0 && newCat !== state.transactions[idx].category) learnCategory(merch, newCat);
state.transactions[idx] = {
id: _editId, amount: parseFloat(document.getElementById(‘edit-tx-amount’).value)||0,
merchant: merch, type: document.getElementById(‘edit-tx-type’).value,
category: newCat, date: document.getElementById(‘edit-tx-date’).value,
notes: document.getElementById(‘edit-tx-notes’).value.trim(),
};

save();
closeSheet(‘edit-tx’);
_editId = null;
renderHome();
}

function deleteTx() {
if (!_editId) return;
var id = _editId;
safeConfirm(‘Delete this transaction?’, function() {
state.transactions = state.transactions.filter(function(t) { return t.id !== id; });
save();
closeSheet(‘edit-tx’);
_editId = null;
renderHome();
});
}

// ─── ANALYTICS SCREEN ──────────────────────────────────────
var _pieChart = null, _barChart = null;

function renderAnalytics() {
var fab = document.getElementById(‘fab-add’);
if (fab) fab.style.display = ‘none’;

var txs = currentMonthTxs();
var exp = totalExpense(txs);
var inc = totalIncome(txs);
var monthName = new Date(state.ui.year, state.ui.month, 1).toLocaleDateString(‘en-US’, { month:‘long’, year:‘numeric’ });

var html = ‘<div><div class="page-pad fadein">’;

// Month picker
html += ‘<div class="month-picker" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">’;
html += ‘<button class="month-btn" onclick="prevMonthA()" style="color:var(--accent);background:none;border:none;font-size:22px;padding:4px 12px;cursor:pointer">‹</button>’;
html += ‘<div style="font-size:18px;font-weight:700">’ + monthName + ‘</div>’;
html += ‘<button class="month-btn" onclick="nextMonthA()" style="color:var(--accent);background:none;border:none;font-size:22px;padding:4px 12px;cursor:pointer">›</button>’;
html += ‘</div>’;

// Summary
html += ‘<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">’;
html += ‘<div class="summary-card"><div class="summary-label">Income</div><div class="summary-value income">’ + fmt(inc) + ‘</div></div>’;
html += ‘<div class="summary-card"><div class="summary-label">Expenses</div><div class="summary-value expense">’ + fmt(exp) + ‘</div></div>’;
html += ‘</div>’;

if (exp === 0 && inc === 0) {
html += ‘<div class="empty"><div class="empty-icon">📊</div><div class="empty-title">No data yet</div><div class="empty-text">Add transactions or import a budget to see analytics</div></div>’;
} else {
// Charts
html += ‘<div class="chart-wrap"><div class="chart-title">Spending by Category</div><canvas id="pie-chart" height="220"></canvas></div>’;
html += ‘<div class="chart-wrap"><div class="chart-title">Income vs Expenses</div><canvas id="bar-chart" height="160"></canvas></div>’;

```
// Category breakdown with dropdowns
var byCat = {};
txs.filter(function(t) { return t.type === 'expense'; }).forEach(function(t) {
  if (!byCat[t.category]) byCat[t.category] = { total: 0, txs: [] };
  byCat[t.category].total += t.amount;
  byCat[t.category].txs.push(t);
});
var catKeys = Object.keys(byCat).sort(function(a,b) { return byCat[b].total - byCat[a].total; });

if (catKeys.length > 0) {
  html += '<div class="section-title" style="margin-top:8px">Spending Breakdown</div>';
  catKeys.forEach(function(cat) {
    var c = catFor(cat);
    var d = byCat[cat];
    var pct = exp > 0 ? (d.total / exp * 100).toFixed(0) : 0;
    var catId = 'ac-' + cat.replace(/[^a-z0-9]/gi, '');
    var isOpen = window._analyticsOpen && window._analyticsOpen[catId];

    html += '<div style="margin-bottom:8px">';
    // Category header - tappable
    html += '<div onclick="toggleAnalyticsCat(\'' + catId + '\')" style="display:flex;align-items:center;gap:12px;background:var(--card);border-radius:' + (isOpen ? '12px 12px 0 0' : '12px') + ';padding:12px 14px;cursor:pointer;border-bottom:' + (isOpen ? '1px solid var(--border)' : 'none') + '">';
    html += '<div style="width:36px;height:36px;border-radius:18px;background:' + c.color + '22;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">' + c.icon + '</div>';
    html += '<div style="flex:1">';
    html += '<div style="font-size:14px;font-weight:600">' + escHtml(cat) + '</div>';
    html += '<div style="height:4px;background:var(--border);border-radius:2px;overflow:hidden;margin-top:4px"><div style="height:100%;width:' + pct + '%;background:' + c.color + ';border-radius:2px"></div></div>';
    html += '</div>';
    html += '<div style="text-align:right;flex-shrink:0">';
    html += '<div style="font-size:15px;font-weight:700">' + fmt(d.total) + '</div>';
    html += '<div style="font-size:11px;color:var(--text2)">' + pct + '% &nbsp; ' + (isOpen ? '&#9650;' : '&#9660;') + '</div>';
    html += '</div></div>';

    // Expandable transaction list
    if (isOpen) {
      html += '<div style="background:var(--card);border-radius:0 0 12px 12px;overflow:hidden">';
      var sorted = d.txs.slice().sort(function(a,b) { return b.date.localeCompare(a.date); });
      sorted.forEach(function(t) {
        html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--border)">';
        html += '<div>';
        html += '<div style="font-size:13px;font-weight:500">' + escHtml(t.merchant) + '</div>';
        html += '<div style="font-size:11px;color:var(--text2)">' + fmtDate(t.date) + '</div>';
        html += '</div>';
        html += '<div style="font-size:14px;font-weight:600;color:var(--danger)">-' + fmt(t.amount) + '</div>';
        html += '</div>';
      });
      html += '</div>';
    }
    html += '</div>';
  });

  // Income dropdown too
  var incTxs = txs.filter(function(t) { return t.type === 'income'; });
  if (incTxs.length > 0) {
    var incId = 'ac-income';
    var incOpen = window._analyticsOpen && window._analyticsOpen[incId];
    html += '<div style="margin-bottom:8px">';
    html += '<div onclick="toggleAnalyticsCat(\'' + incId + '\')" style="display:flex;align-items:center;gap:12px;background:var(--card);border-radius:' + (incOpen ? '12px 12px 0 0' : '12px') + ';padding:12px 14px;cursor:pointer;border-bottom:' + (incOpen ? '1px solid var(--border)' : 'none') + '">';
    html += '<div style="width:36px;height:36px;border-radius:18px;background:#34C75922;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">&#128181;</div>';
    html += '<div style="flex:1"><div style="font-size:14px;font-weight:600">Income</div><div style="font-size:12px;color:var(--text2)">' + incTxs.length + ' entries</div></div>';
    html += '<div style="text-align:right;flex-shrink:0"><div style="font-size:15px;font-weight:700;color:#34C759">' + fmt(inc) + '</div>';
    html += '<div style="font-size:11px;color:var(--text2)">' + (incOpen ? '&#9650;' : '&#9660;') + '</div></div>';
    html += '</div>';
    if (incOpen) {
      html += '<div style="background:var(--card);border-radius:0 0 12px 12px;overflow:hidden">';
      incTxs.slice().sort(function(a,b) { return b.date.localeCompare(a.date); }).forEach(function(t) {
        html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--border)">';
        html += '<div><div style="font-size:13px;font-weight:500">' + escHtml(t.merchant) + '</div>';
        html += '<div style="font-size:11px;color:var(--text2)">' + fmtDate(t.date) + '</div></div>';
        html += '<div style="font-size:14px;font-weight:600;color:#34C759">+' + fmt(t.amount) + '</div>';
        html += '</div>';
      });
      html += '</div>';
    }
    html += '</div>';
  }
}
```

}

html += ‘</div></div>’;
document.getElementById(‘screen-analytics’).innerHTML = html;

if (exp > 0 || inc > 0) {
setTimeout(function() { drawCharts(txs, inc, exp); }, 50);
}
}

function toggleAnalyticsCat(id) {
if (!window._analyticsOpen) window._analyticsOpen = {};
window._analyticsOpen[id] = !window._analyticsOpen[id];
renderAnalytics();
}

function prevMonthA() { if (state.ui.month===0){state.ui.month=11;state.ui.year–;}else{state.ui.month–;} renderAnalytics(); }
function nextMonthA() { if (state.ui.month===11){state.ui.month=0;state.ui.year++;}else{state.ui.month++;} renderAnalytics(); }

// ─── GOALS SCREEN ──────────────────────────────────────────
var _goalEditIdx = null, _goalContribIdx = null;

function renderGoals() {
var fab = document.getElementById(‘fab-add’);
if (fab) fab.style.display = ‘none’;

var html = ‘<div><div class="page-pad fadein">’;
html += ‘<div class="flex justify-between items-center mb-md">’;
html += ‘<div style="font-size:22px;font-weight:700">Goals</div>’;
html += ‘<button class="btn btn-primary btn-sm" onclick="openSheet(&apos;add-goal&apos;)">+ New Goal</button>’;
html += ‘</div>’;

if (state.goals.length === 0) {
html += ‘<div class="empty"><div class="empty-icon">🎯</div><div class="empty-title">No goals yet</div><div class="empty-text">Create a savings goal to get started</div></div>’;
} else {
state.goals.forEach(function(g, i) {
var pct = g.target > 0 ? Math.min(g.current / g.target * 100, 100) : 0;
var remaining = Math.max(g.target - g.current, 0);
var isOverdue = g.deadline && new Date(g.deadline) < new Date() && g.current < g.target;
var isComplete = g.current >= g.target;

```
  html += '<div class="goal-card">';
  html += '<div class="flex justify-between items-center">';
  html += '<div class="goal-name">' + escHtml(g.name) + (isComplete ? ' ✅' : '') + '</div>';
  html += '<button class="btn btn-ghost btn-sm" onclick="openEditGoal(' + i + ')">Edit</button>';
  html += '</div>';
  html += '<div class="goal-meta">' + (g.deadline ? 'Due ' + fmtDate(g.deadline) : 'No deadline') + '</div>';

  if (isOverdue) {
    html += '<div class="alert alert-warning">⚠️ Goal is past due</div>';
  }

  html += '<div class="progress-bar mb-md"><div class="progress-fill" style="width:' + pct.toFixed(1) + '%;background:' + (isComplete ? '#34C759' : 'var(--accent)') + '"></div></div>';
  html += '<div class="goal-stats">';
  html += '<span class="text-sm text-muted">Saved: <strong>' + fmt(g.current) + '</strong></span>';
  html += '<span class="text-sm text-muted">' + pct.toFixed(0) + '%</span>';
  html += '<span class="text-sm text-muted">Target: <strong>' + fmt(g.target) + '</strong></span>';
  html += '</div>';

  if (!isComplete) {
    html += '<div class="mt-md flex gap-sm">';
    html += '<div class="text-sm text-muted" style="flex:1;line-height:1.4">Remaining: <strong>' + fmt(remaining) + '</strong></div>';
    html += '<button class="btn btn-primary btn-sm" onclick="openContrib(' + i + ')">+ Add Progress</button>';
    html += '</div>';
  }
  html += '</div>';
});
```

}

html += ‘</div></div>’;
document.getElementById(‘screen-goals’).innerHTML = html;
}

function openEditGoal(i) {
_goalEditIdx = i;
var g = state.goals[i];
document.getElementById(‘goal-name’).value = g.name;
document.getElementById(‘goal-target’).value = g.target;
document.getElementById(‘goal-deadline’).value = g.deadline || ‘’;

var sheet = document.getElementById(‘sheet-add-goal’);
sheet.querySelector(’.sheet-title’).textContent = ‘Edit Goal’;
sheet.querySelector(’.btn-primary’).textContent = ‘Save Changes’;
sheet.querySelector(’.btn-primary’).onclick = updateGoal;

// Add delete button if not present
var delBtn = document.getElementById(‘goal-del-btn’);
if (!delBtn) {
delBtn = document.createElement(‘button’);
delBtn.id = ‘goal-del-btn’;
delBtn.className = ‘btn btn-danger btn-full mt-sm’;
delBtn.textContent = ‘Delete Goal’;
delBtn.onclick = deleteGoal;
sheet.querySelector(’.sheet’).appendChild(delBtn);
}
delBtn.style.display = ‘block’;

openSheet(‘add-goal’);
}

function saveGoal() {
var name = document.getElementById(‘goal-name’).value.trim();
var target = parseFloat(document.getElementById(‘goal-target’).value);
if (!name || !target || target <= 0) { alert(‘Please fill in name and target amount’); return; }

state.goals.push({ id: uid(), name: name, target: target, current: 0, deadline: document.getElementById(‘goal-deadline’).value || null });
save();
closeSheet(‘add-goal’);
resetGoalSheet();
renderGoals();
}

function updateGoal() {
if (_goalEditIdx === null) return;
var name = document.getElementById(‘goal-name’).value.trim();
var target = parseFloat(document.getElementById(‘goal-target’).value);
if (!name || !target || target <= 0) { alert(‘Please fill in name and target amount’); return; }

state.goals[_goalEditIdx].name = name;
state.goals[_goalEditIdx].target = target;
state.goals[_goalEditIdx].deadline = document.getElementById(‘goal-deadline’).value || null;
save();
closeSheet(‘add-goal’);
resetGoalSheet();
_goalEditIdx = null;
renderGoals();
}

function deleteGoal() {
if (_goalEditIdx === null) return;
var gi = _goalEditIdx;
safeConfirm(‘Delete this goal?’, function() {
state.goals.splice(gi, 1);
save();
closeSheet(‘add-goal’);
resetGoalSheet();
_goalEditIdx = null;
renderGoals();
});
return;
state.goals.splice(gi, 1);
save();
closeSheet(‘add-goal’);
resetGoalSheet();
_goalEditIdx = null;
renderGoals();
}

function resetGoalSheet() {
var sheet = document.getElementById(‘sheet-add-goal’);
sheet.querySelector(’.sheet-title’).textContent = ‘New Goal’;
var btn = sheet.querySelector(’.btn-primary’);
btn.textContent = ‘Create Goal’;
btn.onclick = saveGoal;
var delBtn = document.getElementById(‘goal-del-btn’);
if (delBtn) delBtn.style.display = ‘none’;
}

function openContrib(i) {
_goalContribIdx = i;
document.getElementById(‘contrib-amount’).value = ‘’;
openSheet(‘contribute’);
setTimeout(function() { document.getElementById(‘contrib-amount’).focus(); }, 350);
}

function saveContrib() {
if (_goalContribIdx === null) return;
var amount = parseFloat(document.getElementById(‘contrib-amount’).value);
if (!amount || amount <= 0) { alert(‘Enter a valid amount’); return; }
state.goals[_goalContribIdx].current = (state.goals[_goalContribIdx].current || 0) + amount;
save();
closeSheet(‘contribute’);
_goalContribIdx = null;
renderGoals();
}

// ─── SETTINGS SCREEN ───────────────────────────────────────
function renderSettings() {
var fab = document.getElementById(‘fab-add’);
if (fab) fab.style.display = ‘none’;

var html = ‘<div><div class="page-pad fadein">’;
html += ‘<div style="font-size:22px;font-weight:700;margin-bottom:20px">Settings</div>’;

// Budget
html += ‘<div class="section-title">Spending Alert</div>’;
html += ‘<div class="card mb-md">’;
var alertPct = (state.settings && state.settings.alertPct) || 80;
html += ‘<div class="settings-row"><div><div class="settings-label">Alert Threshold</div><div class="text-sm text-muted">Warn at this % of planned spend</div></div>’;
html += ‘<div style="display:flex;align-items:center;gap:8px"><span style="font-size:16px;font-weight:700;color:var(--accent)">’ + alertPct + ‘%</span>’;
html += ‘<button class="btn btn-secondary btn-sm" onclick="openAlertPctSheet()">Edit</button></div></div>’;
var planExp2 = 0; var planInc2 = 0;
if (state.plan) { var mi3 = state.ui.month; state.plan.buckets.forEach(function(b) { b.items.forEach(function(item) { var amt = itemAmountForMonth(item, mi3); if (b.type===‘income’) planInc2+=amt; else planExp2+=amt; }); }); }
if (planExp2 > 0) {
var txs2 = currentMonthTxs(); var actualExp2 = totalExpense(txs2); var spentPct2 = (actualExp2/planExp2*100);
var bc2 = spentPct2>=100?’#FF3B30’:spentPct2>=alertPct?’#FF9500’:’#34C759’;
html += ‘<div style="border-top:1px solid var(--border);padding:12px 0 4px">’;
html += ‘<div style="display:flex;justify-content:space-between;margin-bottom:6px"><div class="text-sm text-muted">Planned spend</div><div style="font-size:14px;font-weight:600">’ + fmt(planExp2) + ‘</div></div>’;
html += ‘<div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden;margin-bottom:6px"><div style="height:100%;width:' + Math.min(spentPct2,100).toFixed(1) + '%;background:' + bc2 + ';border-radius:4px"></div></div>’;
html += ‘<div style="display:flex;justify-content:space-between"><div class="text-sm text-muted">Spent: <strong>’ + fmt(actualExp2) + ‘</strong></div><div class="text-sm" style="color:' + bc2 + ';font-weight:600">’ + spentPct2.toFixed(0) + ‘% of plan</div></div>’;
if (planInc2 > 0) { html += ‘<div style="display:flex;justify-content:space-between;margin-top:8px;padding-top:8px;border-top:1px solid var(--border)"><div class="text-sm text-muted">Planned net</div><div style="font-size:14px;font-weight:700;color:' + (planInc2-planExp2>=0?'#34C759':'#FF3B30') + '">’ + fmt(planInc2-planExp2) + ‘</div></div>’; }
html += ‘</div>’;
}
html += ‘</div>’;

// Appearance
html += ‘<div class="section-title">Appearance</div>’;
html += ‘<div class="card mb-md">’;

// Dark mode toggle (display only - follows system)
html += ‘<div class="settings-row"><div class="settings-label">Dark Mode</div><div class="settings-value">Follows System</div></div>’;

// Accent color
html += ‘<div class="settings-row" style="flex-direction:column;align-items:flex-start;gap:10px">’;
html += ‘<div class="settings-label">Accent Color</div>’;
html += ‘<div class="accent-picker">’;
var accents = [’#34C759’,’#007AFF’,’#FF9500’,’#FF2D55’];
var accentNames = [‘Green’,‘Blue’,‘Orange’,‘Pink’];
accents.forEach(function(color, i) {
var isActive = (state.settings.accent || ‘#34C759’) === color;
html += ‘<div class="accent-dot' + (isActive ? ' active' : '') + '" style="background:' + color + '" onclick="setAccent(&apos;' + color + '&apos;)" title="' + accentNames[i] + '"></div>’;
});
html += ‘</div></div>’;
html += ‘</div>’;

// Data
html += ‘<div class="section-title">Import & Export</div>’;
html += ‘<div class="card mb-md">’;
html += ‘<div class="settings-row"><div><div class="settings-label">Export Transactions</div><div class="text-sm text-muted">Download as CSV</div></div><button class="btn btn-secondary btn-sm" onclick="exportCSV()">Export</button></div>’;
html += ‘<div class="settings-row"><div><div class="settings-label">Import Transactions</div><div class="text-sm text-muted">CSV format</div></div><button class="btn btn-secondary btn-sm" onclick="triggerTxFileInput()">Import</button></div>’;
html += ‘<div class="settings-row"><div><div class="settings-label">Import Budget Plan</div><div class="text-sm text-muted">Excel, CSV, or Google Sheets</div></div><button class="btn btn-secondary btn-sm" onclick="triggerBudgetFileInput()">Import</button></div>’;
html += ‘<div class="settings-row"><div><div class="settings-label">Google Sheets</div><div class="text-sm text-muted">Import from a shared sheet URL</div></div><button class="btn btn-secondary btn-sm" onclick="showGoogleDocsImport()">Connect</button></div>’;
html += ‘</div>’;
html += ‘<div class="section-title">Danger Zone</div>’;
html += ‘<div class="card mb-md">’;
html += ‘<div style="padding:4px 0 8px"><button class="btn btn-danger btn-full" onclick="clearData()" style="opacity:1">🗑 Clear All Data</button><div class="text-sm text-muted" style="text-align:center;margin-top:6px">Removes all transactions, goals and budget plan</div></div>’;
html += ‘</div>’;

// About
html += ‘<div class="section-title">Quick Start</div>’;
html += ‘<div class="card mb-md">’;
html += ‘<div class="settings-row"><div><div class="settings-label">Quick Start Guide</div><div class="text-sm text-muted">Replay the setup tutorial</div></div><button class="btn btn-secondary btn-sm" onclick="replayOnboarding()">Replay</button></div>’;
html += ‘<div class="settings-row"><div><div class="settings-label">Load Sample Budget</div><div class="text-sm text-muted">Fill this month with example data</div></div><button class="btn btn-secondary btn-sm" onclick="resetAndLoadTemplate()">Load</button></div>’;
html += ‘</div>’;
html += ‘<div class="section-title">Debug</div>’;
html += ‘<div class="card mb-md"><div class="settings-row"><div class="settings-label">Deep Code Analysis</div><button class="btn btn-secondary btn-sm" onclick="runDeepDebug()">🔍 Run</button></div></div>’;
html += ‘<div class="section-title">About</div>’;
html += ‘<div class="card mb-md">’;
html += ‘<div class="settings-row"><div class="settings-label">App</div><div class="settings-value">KevT Budget Pro</div></div>’;
html += ‘<div class="settings-row"><div class="settings-label">Version</div><div class="settings-value">1.0.0</div></div>’;
html += ‘<div class="settings-row"><div class="settings-label">Transactions</div><div class="settings-value">’ + state.transactions.length + ‘</div></div>’;
html += ‘<div class="settings-row"><div class="settings-label">Goals</div><div class="settings-value">’ + state.goals.length + ‘</div></div>’;
html += ‘</div>’;

html += ‘</div></div>’;
document.getElementById(‘screen-settings’).innerHTML = html;
}

function setAccent(color) {
state.settings.accent = color;
save();
document.documentElement.style.setProperty(’–accent’, color);
applyAccentColor();
renderSettings();
}

function saveBudget() {
var amount = parseFloat(document.getElementById(‘budget-amount’).value);
if (isNaN(amount) || amount < 0) { alert(‘Enter a valid amount’); return; }
state.budget = amount;
save();
closeSheet(‘budget’);
if (state.ui.tab === ‘home’) renderHome();
else renderSettings();
}

function exportCSV() {
if (state.transactions.length === 0) { alert(‘No transactions to export’); return; }
var rows = [‘Date,Merchant,Type,Category,Amount,Notes’];
state.transactions.forEach(function(t) {
rows.push([t.date, ‘”’+t.merchant+’”’, t.type, ‘”’+t.category+’”’, t.amount, ‘”’+(t.notes||’’)+’”’].join(’,’));
});
var blob = new Blob([rows.join(’\n’)], { type:‘text/csv’ });
var a = document.createElement(‘a’);
a.href = URL.createObjectURL(blob);
a.download = ‘transactions-’ + new Date().toISOString().split(‘T’)[0] + ‘.csv’;
a.click();
}

function importCSV(e) {
var file = e.target.files[0];
if (!file) return;
var reader = new FileReader();
reader.onload = function(ev) {
var lines = ev.target.result.split(’\n’).slice(1);
var imported = 0;
lines.forEach(function(line) {
if (!line.trim()) return;
var parts = line.split(’,’);
if (parts.length < 5) return;
state.transactions.push({
id: uid(),
date: parts[0].trim(),
merchant: parts[1].replace(/”/g,’’).trim(),
type: parts[2].trim(),
category: parts[3].replace(/”/g,’’).trim(),
amount: parseFloat(parts[4]) || 0,
notes: (parts[5]||’’).replace(/”/g,’’).trim(),
});
imported++;
});
save();
alert(‘Imported ’ + imported + ’ transactions’);
renderSettings();
};
reader.readAsText(file);
}

function clearData() {
safeConfirm(‘Delete ALL data including budget plan? This cannot be undone.’, function() {
state.transactions = [];
state.goals = [];
state.budget = 0;
state.plan = null;
S.set(‘plan’, null);
localStorage.removeItem(‘kvt_plan’);
save();
renderSettings();
renderHome();
if (state.ui.tab === ‘budget’) renderBudget();
});
}

// ─── SAFE CONFIRM ──────────────────────────────────────────
function safeConfirm(msg, onYes) {
var ov = document.createElement(“div”);
ov.style.cssText = “position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:flex-end;”;
var box = document.createElement(“div”);
box.style.cssText = “background:var(–card);border-radius:20px 20px 0 0;width:100%;padding:24px 20px 40px;text-align:center”;
var msgEl = document.createElement(“div”);
msgEl.style.cssText = “font-size:15px;color:var(–text2);margin-bottom:24px;line-height:1.4”;
msgEl.textContent = msg;
var btnRow = document.createElement(“div”);
btnRow.style.cssText = “display:flex;gap:10px”;
var noBtn = document.createElement(“button”);
noBtn.textContent = “Cancel”;
noBtn.style.cssText = “flex:1;padding:14px;background:var(–border);color:var(–text1);border:none;border-radius:10px;font-size:15px;font-weight:600”;
noBtn.onclick = function() { ov.remove(); };
var yesBtn = document.createElement(“button”);
yesBtn.textContent = “Confirm”;
yesBtn.style.cssText = “flex:1;padding:14px;background:#FF3B30;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600”;
yesBtn.onclick = function() { ov.remove(); onYes(); };
btnRow.appendChild(noBtn);
btnRow.appendChild(yesBtn);
box.appendChild(msgEl);
box.appendChild(btnRow);
ov.appendChild(box);
document.body.appendChild(ov);
}

// ═══════════════════════════════════════════════════════════════
// BUDGET PLANNER ENGINE
// ═══════════════════════════════════════════════════════════════

// ─── BUCKET DEFINITIONS ────────────────────────────────────────
// A “plan” is separate from transactions.
// state.plan = { buckets: [ { id, name, type, items: [ { id, label, amount, freq, months, notes } ] } ] }
// freq: ‘monthly’ | ‘annual’ | ‘custom’
// months: array of 0-11 (used when freq=‘custom’)

var BUCKET_DEFAULTS = [
{
name: ‘Income’, type: ‘income’, items: [
{ label: ‘Wages / Salary’,          amount: 5500, freq: ‘monthly’, months: [] },
{ label: ‘Freelance / Side Income’, amount: 0,    freq: ‘monthly’, months: [] },
]
},
{
name: ‘Home & Bills’, type: ‘expense’, items: [
{ label: ‘Mortgage or Rent’,        amount: 1500, freq: ‘monthly’, months: [] },
{ label: ‘Electric, Gas, Water’,    amount: 300,  freq: ‘monthly’, months: [] },
{ label: ‘Internet & Phone’,        amount: 80,   freq: ‘monthly’, months: [] },
{ label: ‘Home Repairs’,            amount: 75,   freq: ‘monthly’, months: [] },
]
},
{
name: ‘Daily Living’, type: ‘expense’, items: [
{ label: ‘Groceries’,               amount: 400,  freq: ‘monthly’, months: [] },
{ label: ‘Dining Out & Takeout’,    amount: 300,  freq: ‘monthly’, months: [] },
]
},
{
name: ‘Transportation’, type: ‘expense’, items: [
{ label: ‘Gas & Fuel’,              amount: 180,  freq: ‘monthly’, months: [] },
{ label: ‘Car Payment’,             amount: 150,  freq: ‘monthly’, months: [] },
{ label: ‘Auto Insurance’,          amount: 900,  freq: ‘custom’,  months: [0, 6] },
{ label: ‘Repairs & Maintenance’,   amount: 60,   freq: ‘monthly’, months: [] },
]
},
{
name: ‘Entertainment’, type: ‘expense’, items: [
{ label: ‘Streaming Services’,      amount: 60,   freq: ‘monthly’, months: [] },
{ label: ‘Games & Hobbies’,         amount: 80,   freq: ‘monthly’, months: [] },
]
},
{
name: ‘Health & Fitness’, type: ‘expense’, items: [
{ label: ‘Prescriptions & Copays’,  amount: 40,   freq: ‘monthly’, months: [] },
{ label: ‘Gym Membership’,          amount: 45,   freq: ‘monthly’, months: [] },
{ label: ‘Pet Care & Vet’,          amount: 30,   freq: ‘monthly’, months: [] },
]
},
{
name: ‘Personal & Shopping’, type: ‘expense’, items: [
{ label: ‘Clothing & Personal Care’,amount: 150,  freq: ‘monthly’, months: [] },
{ label: ‘Gifts & Donations’,       amount: 100,  freq: ‘monthly’, months: [] },
{ label: ‘Subscriptions & Apps’,    amount: 35,   freq: ‘monthly’, months: [] },
]
},
{
name: ‘Financial’, type: ‘expense’, items: [
{ label: ‘Savings / Investing’,     amount: 300,  freq: ‘monthly’, months: [] },
{ label: ‘Debt Payments’,           amount: 200,  freq: ‘monthly’, months: [] },
]
},
{
name: ‘Travel & Misc’, type: ‘expense’, items: [
{ label: ‘Vacation Fund’,           amount: 100,  freq: ‘monthly’, months: [] },
{ label: ‘Misc Expenses’,           amount: 150,  freq: ‘monthly’, months: [] },
]
},
];

var MONTH_NAMES = [‘Jan’,‘Feb’,‘Mar’,‘Apr’,‘May’,‘Jun’,‘Jul’,‘Aug’,‘Sep’,‘Oct’,‘Nov’,‘Dec’];
var _budgetOpenBuckets = {};  // track which buckets are expanded

// ─── PLAN STATE ────────────────────────────────────────────────
function getPlan() {
if (!state.plan) {
// Try localStorage first before building default
var stored = S.get(‘plan’);
if (stored && stored.buckets && stored.buckets.length > 0) {
state.plan = stored;
} else {
state.plan = buildDefaultPlan();
S.set(‘plan’, state.plan);
}
}
return state.plan;
}

function buildDefaultPlan() {
var plan = { buckets: [] };
BUCKET_DEFAULTS.forEach(function(bd) {
var bucket = { id: uid(), name: bd.name, type: bd.type, items: [] };
bd.items.forEach(function(item) {
bucket.items.push({
id: uid(),
label: item.label,
amount: item.amount,
freq: item.freq,
months: item.months.slice(),
notes: ‘’
});
});
plan.buckets.push(bucket);
});
return plan;
}

function savePlan() {
if (state.plan) {
S.set(‘plan’, state.plan);
}
}

function forceSavePlan(plan) {
S.set(‘plan’, plan);
state.plan = plan;
}

// ─── AMOUNT FOR MONTH ──────────────────────────────────────────
function itemAmountForMonth(item, monthIdx) {
if (item.freq === ‘monthly’) return item.amount;
if (item.freq === ‘annual’) {
// Spread evenly: show full amount in Jan (month 0)
return monthIdx === 0 ? item.amount : 0;
}
if (item.freq === ‘custom’) {
return (item.months && item.months.indexOf(monthIdx) >= 0) ? item.amount : 0;
}
return 0;
}

function bucketTotalForMonth(bucket, monthIdx) {
var total = 0;
bucket.items.forEach(function(item) {
total += itemAmountForMonth(item, monthIdx);
});
return total;
}

function planTotalsForMonth(plan, monthIdx) {
var income = 0, expense = 0;
plan.buckets.forEach(function(b) {
var t = bucketTotalForMonth(b, monthIdx);
if (b.type === ‘income’) income += t;
else expense += t;
});
return { income: income, expense: expense, net: income - expense };
}

// ─── FREQ LABEL ────────────────────────────────────────────────
function freqLabel(item) {
if (item.freq === ‘monthly’) return ‘Every month’;
if (item.freq === ‘annual’) return ‘Once a year (Jan)’;
if (item.freq === ‘custom’ && item.months && item.months.length > 0) {
return item.months.map(function(m) { return MONTH_NAMES[m]; }).join(’, ’);
}
return ‘Custom’;
}

// ─── RENDER BUDGET SCREEN ──────────────────────────────────────
function renderBudget() {
var fab = document.getElementById(‘fab-add’);
if (fab) fab.style.display = ‘none’;

var plan = getPlan();
var mi = state.ui.month;
var totals = planTotalsForMonth(plan, mi);
var monthName = new Date(state.ui.year, mi, 1).toLocaleDateString(‘en-US’, { month:‘long’, year:‘numeric’ });
var netColor = totals.net >= 0 ? ‘#34C759’ : ‘#FF3B30’;

var html = ‘<div><div class="page-pad fadein">’;

// Month picker
html += ‘<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">’;
html += ‘<button class="month-btn" onclick="prevMonthB()" style="color:var(--accent);background:none;border:none;font-size:22px;padding:4px 8px;cursor:pointer">‹</button>’;
html += ‘<div style="font-size:18px;font-weight:700">’ + monthName + ‘</div>’;
html += ‘<button class="month-btn" onclick="nextMonthB()" style="color:var(--accent);background:none;border:none;font-size:22px;padding:4px 8px;cursor:pointer">›</button>’;
html += ‘</div>’;

// Summary strip
html += ‘<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px">’;
html += ‘<div class="summary-card"><div class="summary-label">Planned In</div><div style="font-size:16px;font-weight:700;color:#34C759">’ + fmt(totals.income) + ‘</div></div>’;
html += ‘<div class="summary-card"><div class="summary-label">Planned Out</div><div style="font-size:16px;font-weight:700;color:#FF3B30">’ + fmt(totals.expense) + ‘</div></div>’;
html += ‘<div class="summary-card"><div class="summary-label">Net</div><div style="font-size:16px;font-weight:700;color:' + netColor + '">’ + fmt(totals.net) + ‘</div></div>’;
html += ‘</div>’;

// Year overview bar
html += ‘<div class="card mb-md" style="padding:12px 14px">’;
html += ‘<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text2);margin-bottom:10px">Year at a Glance</div>’;
html += ‘<div style="display:grid;grid-template-columns:repeat(12,1fr);gap:2px;align-items:end;height:40px">’;
for (var m = 0; m < 12; m++) {
var t = planTotalsForMonth(plan, m);
var isPos = t.net >= 0;
var _incomeVals = [];
for (var _m = 0; _m < 12; _m++) { _incomeVals.push(planTotalsForMonth(plan, _m).income); }
var maxIncome = Math.max.apply(null, _incomeVals) || 1;
var barH = Math.round((t.income / maxIncome) * 36);
var isActive = m === mi;
html += ‘<div onclick="jumpToMonth(' + m + ')" style="cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px">’;
html += ‘<div style="width:100%;height:' + barH + 'px;background:' + (isPos ? (isActive ? '#34C759' : '#34C75944') : (isActive ? '#FF3B30' : '#FF3B3044')) + ';border-radius:2px;min-height:3px"></div>’;
html += ‘<div style="font-size:8px;color:' + (isActive ? 'var(--text1)' : 'var(--text2)') + ';font-weight:' + (isActive ? '700' : '400') + '">’ + MONTH_NAMES[m].substring(0,1) + ‘</div>’;
html += ‘</div>’;
}
html += ‘</div></div>’;

// Buckets
plan.buckets.forEach(function(bucket, bi) {
var isOpen = _budgetOpenBuckets[bucket.id] !== false; // default open
var bTotal = bucketTotalForMonth(bucket, mi);
var isIncome = bucket.type === ‘income’;

```
html += '<div class="budget-bucket" id="bucket-' + bucket.id + '">';
// Bucket header - tappable to expand/collapse
html += '<div onclick="toggleBucket(\'' + bucket.id + '\')" style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--card);border-radius:' + (isOpen ? '12px 12px 0 0' : '12px') + ';cursor:pointer;border-bottom:' + (isOpen ? '1px solid var(--border)' : 'none') + '">';
html += '<div style="display:flex;align-items:center;gap:10px">';
html += '<div style="font-size:18px">' + (isIncome ? '📥' : '📤') + '</div>';
html += '<div>';
html += '<div style="font-size:15px;font-weight:700">' + escHtml(bucket.name) + '</div>';
html += '<div style="font-size:12px;color:var(--text2)">' + bucket.items.length + ' line' + (bucket.items.length !== 1 ? 's' : '') + '</div>';
html += '</div></div>';
html += '<div style="display:flex;align-items:center;gap:10px">';
html += '<div style="font-size:16px;font-weight:700;color:' + (isIncome ? '#34C759' : 'var(--text1)') + '">' + fmt(bTotal) + '</div>';
html += '<div style="color:var(--text2);font-size:18px;transform:rotate(' + (isOpen ? '180' : '0') + 'deg);transition:transform 0.2s">' + '▾' + '</div>';
html += '</div></div>';

if (isOpen) {
  html += '<div style="background:var(--card);border-radius:0 0 12px 12px;overflow:hidden">';

  // Line items
  bucket.items.forEach(function(item, ii) {
    var monthAmt = itemAmountForMonth(item, mi);
    var isZeroMonth = monthAmt === 0 && item.freq !== 'monthly';
    html += '<div style="padding:10px 14px;border-bottom:1px solid var(--border);opacity:' + (isZeroMonth ? '0.5' : '1') + '">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">';
    // Label - tap to edit
    html += '<div style="flex:1;min-width:0" onclick="editBudgetItem(\'' + bucket.id + '\',\'' + item.id + '\')">';
    html += '<div style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escHtml(item.label) + '</div>';
    html += '<div style="font-size:11px;color:var(--text2);margin-top:2px">' + freqLabel(item) + (isZeroMonth ? ' · not this month' : '') + '</div>';
    html += '</div>';
    // Amount
    html += '<div style="font-size:15px;font-weight:600;flex-shrink:0;color:' + (isZeroMonth ? 'var(--text2)' : 'var(--text1)') + '">' + fmt(monthAmt) + '</div>';
    html += '</div>';
    html += '</div>';
  });

  // Add line button
  html += '<div style="padding:10px 14px">';
  html += '<button onclick="addBudgetItem(\'' + bucket.id + '\')" style="width:100%;padding:10px;background:none;border:1.5px dashed var(--border);border-radius:8px;color:var(--accent);font-size:14px;font-weight:600;cursor:pointer">+ Add Line</button>';
  html += '</div>';
  html += '</div>';
}

html += '</div>';
html += '<div style="margin-bottom:10px"></div>';
```

});

// Add bucket button
html += ‘<button onclick="addBudgetBucket()" style="width:100%;padding:14px;background:none;border:2px dashed var(--border);border-radius:12px;color:var(--accent);font-size:15px;font-weight:600;cursor:pointer;margin-bottom:16px">+ Add Category Group</button>’;

// Import / Template footer
html += ‘<div class="card mb-md" style="padding:12px 14px">’;
html += ‘<div style="font-size:13px;font-weight:600;margin-bottom:8px">Import / Reset</div>’;
html += ‘<div style="display:flex;gap:8px;flex-wrap:wrap">’;
html += ‘<button class="btn btn-secondary btn-sm" onclick="resetAndLoadTemplate()">📋 Load Template</button>’;
html += ‘<button class="btn btn-secondary btn-sm" onclick="triggerBudgetFileInput()">📊 Import Excel/CSV</button>’;
html += ‘<label class="btn btn-secondary btn-sm" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px" for="global-budget-file">📎 Browse File</label>’;
html += ‘<button class="btn btn-secondary btn-sm" onclick="showGoogleDocsImport()">📋 Google Sheets</button>’;
html += ‘</div></div>’;

html += ‘</div></div>’;
document.getElementById(‘screen-budget’).innerHTML = html;
}

function prevMonthB() { if (state.ui.month===0){state.ui.month=11;state.ui.year–;}else{state.ui.month–;} renderBudget(); }
function nextMonthB() { if (state.ui.month===11){state.ui.month=0;state.ui.year++;}else{state.ui.month++;} renderBudget(); }
function jumpToMonth(m) { state.ui.month = m; renderBudget(); }

// ─── TOGGLE BUCKET ─────────────────────────────────────────────
function toggleBucket(bid) {
_budgetOpenBuckets[bid] = !(_budgetOpenBuckets[bid] !== false);
renderBudget();
}

// ─── EDIT BUDGET ITEM SHEET ────────────────────────────────────
var _editBucketId = null;
var _editItemId = null;

function editBudgetItem(bid, iid) {
_editBucketId = bid;
_editItemId = iid;
var plan = getPlan();
var bucket = plan.buckets.find(function(b) { return b.id === bid; });
if (!bucket) return;
var item = bucket.items.find(function(i) { return i.id === iid; });
if (!item) return;
showBudgetItemSheet(item, bucket, false);
}

function addBudgetItem(bid) {
_editBucketId = bid;
_editItemId = null;
var plan = getPlan();
var bucket = plan.buckets.find(function(b) { return b.id === bid; });
if (!bucket) return;
var newItem = { id: uid(), label: ‘’, amount: 0, freq: ‘monthly’, months: [], notes: ‘’ };
showBudgetItemSheet(newItem, bucket, true);
}

function showBudgetItemSheet(item, bucket, isNew) {
// Build month checkboxes
var monthBoxes = ‘’;
for (var m = 0; m < 12; m++) {
var checked = item.months && item.months.indexOf(m) >= 0;
monthBoxes += ‘<label style="display:flex;align-items:center;gap:6px;padding:4px 0;cursor:pointer">’;
monthBoxes += ‘<input type=“checkbox” id=“mb-’ + m + ‘” ’ + (checked ? ‘checked’ : ‘’) + ’ style=“width:18px;height:18px”>’;
monthBoxes += ‘<span style="font-size:14px">’ + MONTH_NAMES[m] + ‘</span></label>’;
}

var ov = document.createElement(‘div’);
ov.id = ‘budget-item-sheet’;
ov.style.cssText = ‘position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:200;display:flex;align-items:flex-end;’;
ov.innerHTML = ‘<div style="background:var(--card);border-radius:20px 20px 0 0;width:100%;padding:20px 20px 48px;max-height:90vh;overflow-y:auto;-webkit-overflow-scrolling:touch">’
+ ‘<div style="width:36px;height:4px;background:var(--border);border-radius:2px;margin:0 auto 20px"></div>’
+ ‘<div style="font-size:18px;font-weight:700;margin-bottom:20px">’ + (isNew ? ‘Add Line Item’ : ‘Edit Line Item’) + ‘</div>’
+ ‘<div class="form-group"><label class="form-label">Description</label>’
+ ‘<input class="form-input" id="bi-label" type="text" placeholder="e.g. Mortgage, Netflix..." value="' + escHtml(item.label) + '"></div>’
+ ‘<div class="form-group"><label class="form-label">Amount ($)</label>’
+ ‘<input class="form-input" id="bi-amount" type="number" inputmode="decimal" step="0.01" placeholder="0.00" value="' + (item.amount || '') + '"></div>’
+ ‘<div class="form-group"><label class="form-label">Frequency</label>’
+ ‘<select class="form-select" id="bi-freq" onchange="updateFreqUI()">’
+ ‘<option value=“monthly”’ + (item.freq===‘monthly’?’ selected’:’’) + ‘>Every Month</option>’
+ ‘<option value=“annual”’ + (item.freq===‘annual’?’ selected’:’’) + ‘>Once a Year (enter annual total)</option>’
+ ‘<option value=“custom”’ + (item.freq===‘custom’?’ selected’:’’) + ‘>Specific Months (choose below)</option>’
+ ‘</select></div>’
+ ‘<div id="bi-months-wrap" style="' + (item.freq==='custom' ? '' : 'display:none') + '">’
+ ‘<div class="form-label" style="margin-bottom:8px">Which months?</div>’
+ ‘<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px 16px;margin-bottom:16px">’ + monthBoxes + ‘</div>’
+ ‘</div>’
+ ‘<div class="form-group"><label class="form-label">Notes (optional)</label>’
+ ‘<input class="form-input" id="bi-notes" type="text" placeholder="Any notes..." value="' + escHtml(item.notes||'') + '"></div>’
+ ‘<button class="btn btn-primary btn-full" style="margin-bottom:10px" onclick="saveBudgetItem(' + (isNew?'true':'false') + ')">Save</button>’
+ (!isNew ? ‘<button class="btn btn-danger btn-full" onclick="deleteBudgetItem()">Delete Line</button>’ : ‘’)
+ ‘</div>’;

ov.onclick = function(e) { if (e.target === ov) ov.remove(); };
document.body.appendChild(ov);
setTimeout(function() { document.getElementById(‘bi-label’) && document.getElementById(‘bi-label’).focus(); }, 300);
}

function updateFreqUI() {
var freq = document.getElementById(‘bi-freq’).value;
var wrap = document.getElementById(‘bi-months-wrap’);
if (wrap) wrap.style.display = freq === ‘custom’ ? ‘block’ : ‘none’;
}

function saveBudgetItem(isNew) {
var label = (document.getElementById(‘bi-label’).value || ‘’).trim();
var amount = parseFloat(document.getElementById(‘bi-amount’).value) || 0;
var freq = document.getElementById(‘bi-freq’).value;
var notes = (document.getElementById(‘bi-notes’).value || ‘’).trim();

if (!label) { document.getElementById(‘bi-label’).style.borderColor = ‘#FF3B30’; return; }

var months = [];
if (freq === ‘custom’) {
for (var m = 0; m < 12; m++) {
var cb = document.getElementById(‘mb-’ + m);
if (cb && cb.checked) months.push(m);
}
}

var plan = getPlan();
var bucket = plan.buckets.find(function(b) { return b.id === _editBucketId; });
if (!bucket) return;

if (isNew) {
bucket.items.push({ id: uid(), label: label, amount: amount, freq: freq, months: months, notes: notes });
} else {
var item = bucket.items.find(function(i) { return i.id === _editItemId; });
if (item) { item.label = label; item.amount = amount; item.freq = freq; item.months = months; item.notes = notes; }
}

savePlan();
var sheet = document.getElementById(‘budget-item-sheet’);
if (sheet) sheet.remove();
renderBudget();
}

function deleteBudgetItem() {
var plan = getPlan();
var bucket = plan.buckets.find(function(b) { return b.id === _editBucketId; });
if (!bucket) return;
safeConfirm(‘Delete this line item?’, function() {
bucket.items = bucket.items.filter(function(i) { return i.id !== _editItemId; });
savePlan();
var sheet = document.getElementById(‘budget-item-sheet’);
if (sheet) sheet.remove();
renderBudget();
});
}

// ─── ADD BUCKET ────────────────────────────────────────────────
function addBudgetBucket() {
var ov = document.createElement(‘div’);
ov.id = ‘add-bucket-sheet’;
ov.style.cssText = ‘position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:200;display:flex;align-items:flex-end;’;
ov.innerHTML = ‘<div style="background:var(--card);border-radius:20px 20px 0 0;width:100%;padding:20px 20px 48px">’
+ ‘<div style="width:36px;height:4px;background:var(--border);border-radius:2px;margin:0 auto 20px"></div>’
+ ‘<div style="font-size:18px;font-weight:700;margin-bottom:20px">Add Category Group</div>’
+ ‘<div class="form-group"><label class="form-label">Group Name</label>’
+ ‘<input class="form-input" id="nb-name" type="text" placeholder="e.g. Side Business, Kids..."></div>’
+ ‘<div class="form-group"><label class="form-label">Type</label>’
+ ‘<select class="form-select" id="nb-type"><option value="expense">Expense</option><option value="income">Income</option></select></div>’
+ ‘<button class="btn btn-primary btn-full" onclick="saveNewBucket()">Add Group</button>’
+ ‘</div>’;
ov.onclick = function(e) { if (e.target === ov) ov.remove(); };
document.body.appendChild(ov);
setTimeout(function() { document.getElementById(‘nb-name’) && document.getElementById(‘nb-name’).focus(); }, 300);
}

function saveNewBucket() {
var name = (document.getElementById(‘nb-name’).value || ‘’).trim();
var type = document.getElementById(‘nb-type’).value;
if (!name) return;
var plan = getPlan();
var newBucket = { id: uid(), name: name, type: type, items: [] };
plan.buckets.push(newBucket);
savePlan();
document.getElementById(‘add-bucket-sheet’).remove();
renderBudget();
}

// ─── LOAD TEMPLATE INTO PLAN ───────────────────────────────────
function doLoadTemplate() {
state.plan = buildDefaultPlan();
if (!state.budget) state.budget = 3800;
savePlan();
save();
renderBudget();
}

function resetAndLoadTemplate() {
safeConfirm(‘Replace current budget plan with the default template?’, function() { doLoadTemplate(); });
}

// ─── BUDGET IMPORT ──────────────────────────────────────────
function importBudgetFile(e) {
var file = e.target.files[0];
if (!file) return;

if (file.name.endsWith(’.csv’)) {
var reader = new FileReader();
reader.onload = function(ev) { parseBudgetCSV(ev.target.result); };
reader.readAsText(file);
} else {
// Excel via SheetJS (loaded in head)
if (typeof XLSX === ‘undefined’) {
alert(‘Excel support not loaded. Please check your internet connection and try again.’);
return;
}
var reader = new FileReader();
reader.onload = function(ev) {
var wb = XLSX.read(new Uint8Array(ev.target.result), { type:‘array’ });
var ws = wb.Sheets[wb.SheetNames[0]];
var rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:’’ });
parseBudgetRows(rows);
};
reader.readAsArrayBuffer(file);
}
}

function parseBudgetCSV(text) {
var lines = text.split(’\n’).filter(function(l) { return l.trim(); });
var rows = lines.map(function(l) { return l.split(’,’).map(function(c) { return c.replace(/”/g,’’).trim(); }); });
parseBudgetRows(rows);
}

function parseBudgetRows(rows) {
// Smart importer - handles multiple Excel layouts:
// Layout A (budget spreadsheet): col0=person, col1=label, col2-13=Jan-Dec amounts
// Layout B (simple 2-col):       col0=label, col1=amount
// Section headers like ‘HOME’, ‘DAILY LIVING’, ‘REVENUE’ are used as bucket names
// Rows where col1 = ‘Total’ are skipped
// Rows where col0 and col1 are both non-numeric headers are section dividers

var plan = getPlan();
var key = monthKey(state.ui.year, state.ui.month);
var currentMonth = state.ui.month; // 0=Jan … 11=Dec

// Detect layout: if row 3+ has 14+ columns it’s the multi-month layout
var isMultiMonth = false;
for (var ri = 0; ri < Math.min(rows.length, 10); ri++) {
if (rows[ri] && rows[ri].length >= 14) { isMultiMonth = true; break; }
}

// Clear existing imported data
plan.buckets = plan.buckets.filter(function(b) { return b.name !== ‘Imported’ && b._imported !== true; });

var currentBucketName = ‘Imported’;
var currentBucket = null;
var incomeKeywords = [‘wage’,‘salary’,‘income’,‘revenue’,‘earning’,‘pay’,‘misc’];
var skipLabels = [‘total’,‘buckets’,‘income’,‘expenses’,‘jan’,‘feb’,‘year’,‘sparkline’];

function getBucket(name, type) {
var b = plan.buckets.find(function(b) { return b.name === name && b._imported; });
if (!b) {
b = { id: uid(), name: name, type: type, items: [], _imported: true };
plan.buckets.push(b);
}
return b;
}

var imported = 0;
var txImported = 0;

// Also clear imported transactions for this month
state.transactions = state.transactions.filter(function(t) {
return !(t.date.startsWith(key) && t.notes === ‘Budget import’);
});

rows.forEach(function(row) {
if (!row || !row.length) return;

```
var col0 = row[0] != null ? String(row[0]).trim() : '';
var col1 = row[1] != null ? String(row[1]).trim() : '';

// Section header detection: col0 empty, col1 is ALL CAPS section name
if (!col0 && col1 && col1 === col1.toUpperCase() && col1.length > 2 && isNaN(parseFloat(col1))) {
  var sectionUpper = col1.toUpperCase();
  if (sectionUpper === 'REVENUE' || sectionUpper === 'INCOME') {
    currentBucketName = 'Income';
  } else if (skipLabels.indexOf(col1.toLowerCase()) >= 0) {
    return; // skip pure header rows
  } else {
    currentBucketName = col1.charAt(0) + col1.slice(1).toLowerCase();
  }
  return;
}

// Skip total rows
if (col1.toLowerCase() === 'total' || col0.toLowerCase() === 'total') return;
// Skip pure header rows (no amounts anywhere)
if (!col0 && !col1) return;

var label = col1 || col0;
if (!label) return;
// Skip if label looks like a column header
if (skipLabels.indexOf(label.toLowerCase()) >= 0) return;

var amount = 0;
var isIncome = false;
var freqType = 'monthly';
var customMonths = [];

if (isMultiMonth) {
  // col2=Jan, col3=Feb, ... col13=Dec
  // Read the specific month's amount
  var monthCol = 2 + currentMonth;
  if (monthCol < row.length) {
    var v = parseFloat(String(row[monthCol]).replace(/[$,]/g, ''));
    if (!isNaN(v)) amount = Math.abs(v);
  }

  // Also check if amounts vary month to month (custom freq)
  var nonZeroMonths = [];
  var firstAmt = null;
  var allSame = true;
  for (var m = 0; m < 12; m++) {
    var mc = 2 + m;
    if (mc < row.length) {
      var mv = parseFloat(String(row[mc]).replace(/[$,]/g, ''));
      if (!isNaN(mv) && mv > 0) {
        nonZeroMonths.push(m);
        if (firstAmt === null) firstAmt = mv;
        else if (mv !== firstAmt) allSame = false;
      }
    }
  }

  if (nonZeroMonths.length === 0) return; // all zero, skip

  // Build plan item with correct frequency
  if (allSame && nonZeroMonths.length === 12) {
    freqType = 'monthly';
  } else if (nonZeroMonths.length < 12) {
    freqType = 'custom';
    customMonths = nonZeroMonths;
    // Use the first non-zero amount
    if (firstAmt) amount = firstAmt;
  }
} else {
  // Simple 2-col: label, amount
  for (var ci = 1; ci < Math.min(row.length, 5); ci++) {
    var cv = parseFloat(String(row[ci]).replace(/[$,]/g, ''));
    if (!isNaN(cv) && cv > 0) { amount = cv; break; }
  }
  if (amount === 0) return;
}

// Determine income vs expense
var lbl = label.toLowerCase();
isIncome = lbl.includes('wage') || lbl.includes('salary') || lbl.includes('income')
        || lbl.includes('revenue') || lbl.includes('earning')
        || currentBucketName === 'Income';

var bucketType = isIncome ? 'income' : 'expense';
currentBucket = getBucket(currentBucketName, bucketType);

// Add to plan
currentBucket.items.push({
  id: uid(),
  label: label,
  amount: amount,
  freq: freqType,
  months: customMonths,
  notes: 'Imported',
});

// Also add as a transaction so Home/Analytics update immediately
if (amount > 0) {
  // Map to category
  var catMap = {
    'wage':'Work Income', 'salary':'Work Income', 'misc':'Other Income',
    'mortgage':'Bills & Utilities', 'rent':'Bills & Utilities',
    'electric':'Bills & Utilities', 'gas':'Transportation', 'water':'Bills & Utilities',
    'wifi':'Bills & Utilities', 'internet':'Bills & Utilities', 'phone':'Bills & Utilities',
    'grocery':'Food & Dining', 'dining':'Food & Dining', 'food':'Food & Dining',
    'transport':'Transportation', 'fuel':'Transportation', 'insurance':'Transportation',
    'car':'Transportation', 'auto':'Transportation',
    'stream':'Entertainment', 'netflix':'Entertainment', 'hulu':'Entertainment',
    'entertain':'Entertainment', 'xbox':'Entertainment',
    'health':'Health & Fitness', 'medical':'Health & Fitness', 'gym':'Health & Fitness',
    'prescription':'Health & Fitness', 'vet':'Health & Fitness',
    'vacation':'Travel', 'travel':'Travel', 'plane':'Travel', 'hotel':'Travel',
    'invest':'Investments', 'saving':'Investments', '529':'Investments', '401':'Investments',
    'gift':'Gifts & Charity', 'charity':'Gifts & Charity', 'donat':'Gifts & Charity',
    'cloth':'Shopping', 'shop':'Shopping', 'hair':'Shopping',
  };
  var txCat = isIncome ? 'Work Income' : 'Other';
  var lblLow = label.toLowerCase();
  for (var kw in catMap) {
    if (lblLow.includes(kw)) { txCat = catMap[kw]; break; }
  }

  var txDate = key + '-01';
  state.transactions.push({
    id: uid(),
    amount: amount,
    merchant: label,
    type: isIncome ? 'income' : 'expense',
    category: txCat,
    date: txDate,
    notes: 'Budget import',
  });
  txImported++;
}

imported++;
```

});

// Save plan directly - state.plan is already the updated object
S.set(‘plan’, state.plan);
save();

if (imported === 0) {
alert(‘No data found. Check your file has labels in column B and amounts in columns C onward.’);
} else {
// Switch to budget tab and force re-render with new data
document.querySelectorAll(’.screen’).forEach(function(s) { s.classList.remove(‘active’); });
document.querySelectorAll(’.tab-btn’).forEach(function(b) { b.classList.remove(‘active’); });
document.getElementById(‘screen-budget’).classList.add(‘active’);
document.getElementById(‘tab-budget’).classList.add(‘active’);
state.ui.tab = ‘budget’;
renderBudget();
renderHome();
alert(‘Imported ’ + imported + ’ items into your Budget Plan. Home and Analytics updated (’ + txImported + ’ transactions).’);
}
}

function showGoogleDocsImport() {
var ov = document.createElement(‘div’);
ov.style.cssText = ‘position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:flex-end;’;
ov.innerHTML = ‘<div style="background:var(--card);border-radius:20px 20px 0 0;width:100%;padding:24px 20px 48px">’
+ ‘<div style="width:36px;height:4px;background:var(--border);border-radius:2px;margin:0 auto 16px"></div>’
+ ‘<div style="font-size:17px;font-weight:700;margin-bottom:6px">Import from Google Sheets</div>’
+ ‘<div style="font-size:13px;color:var(--text2);margin-bottom:16px">In Google Sheets: File → Share → Publish to web → CSV → Copy link</div>’
+ ‘<input id="gs-url-input" class="form-input" type="url" placeholder="https://docs.google.com/spreadsheets/..." style="margin-bottom:12px">’
+ ‘<button class="btn btn-primary btn-full" onclick="doGoogleSheetImport()">Import</button>’
+ ‘</div>’;
ov.onclick = function(e) { if (e.target === ov) ov.remove(); };
document.body.appendChild(ov);
setTimeout(function() {
var inp = document.getElementById(‘gs-url-input’);
if (inp) inp.focus();
}, 300);
}

function doGoogleSheetImport() {
var input = document.getElementById(‘gs-url-input’);
var url = input ? input.value.trim() : ‘’;
if (!url) return;

// Close sheet
var ov = input ? input.closest(‘div[style*=“fixed”]’) : null;
if (ov) ov.remove();

// Convert share URL to CSV export URL
var csvUrl = url;
if (url.includes(‘docs.google.com/spreadsheets’)) {
var match = url.match(//d/([a-zA-Z0-9-_]+)/);
if (match) {
csvUrl = ‘https://docs.google.com/spreadsheets/d/’ + match[1] + ‘/export?format=csv’;
}
}

fetch(csvUrl)
.then(function(r) {
if (!r.ok) throw new Error(‘Could not fetch. Make sure the sheet is published (File > Share > Publish to web).’);
return r.text();
})
.then(function(text) { parseBudgetCSV(text); })
.catch(function(err) { alert(err.message); });
}

function showGoogleDocsImport_OLD() {
var url = ‘REPLACED’;
if (!url) return;

// Convert Google Sheets URL to CSV export URL
var csvUrl = url
.replace(’/edit’, ‘/export?format=csv’)
.replace(’/pub’, ‘/export?format=csv’);

if (!csvUrl.includes(‘export?format=csv’)) {
// Try to extract sheet ID and build URL
var match = url.match(//d/([a-zA-Z0-9-_]+)/);
if (match) {
csvUrl = ‘https://docs.google.com/spreadsheets/d/’ + match[1] + ‘/export?format=csv’;
} else {
alert(‘Could not parse Google Sheets URL. Make sure sharing is set to “Anyone with link”.’);
return;
}
}

fetch(csvUrl)
.then(function(r) {
if (!r.ok) throw new Error(‘Could not fetch sheet. Make sure sharing is set to “Anyone with link”.’);
return r.text();
})
.then(function(text) { parseBudgetCSV(text); })
.catch(function(err) { alert(err.message); });
}

// ─── ACCENT HELPER ────────────────────────────────────────
function applyAccentColor() {
var accent = state.settings.accent || ‘#34C759’;
document.documentElement.style.setProperty(’–accent’, accent);
var fab = document.getElementById(‘fab-add’);
if (fab) fab.style.background = accent;
document.querySelectorAll(’.btn-primary’).forEach(function(b) {
b.style.background = accent;
});
document.querySelectorAll(’.tab-btn’).forEach(function(b) {
if (b.classList.contains(‘active’)) {
b.style.color = accent;
} else {
b.style.color = ‘’;
}
});
}

// ─── ONBOARDING ────────────────────────────────────────────
var OB_STEPS = [
{
icon: ‘👋’,
title: ‘Welcome to KevT Budget Pro’,
text: ‘Your personal budget tracker. Takes 2 minutes to set up — we will walk you through everything.’,
btn: ‘Get Started’,
},
{
icon: ‘📋’,
title: ‘Start with a Budget Template’,
text: ‘We have loaded a sample monthly budget with common spending categories. Tap the Budget tab to see it and adjust the amounts to match your life.’,
btn: ‘Nice!’,
action: ‘loadTemplate’,
},
{
icon: ‘➕’,
title: ‘Log Your Spending’,
text: ‘Tap the green + button on the Home tab to add a transaction. Pick a category, enter the amount, and you are done. Takes 5 seconds.’,
btn: ‘Got it’,
},
{
icon: ‘💵’,
title: ‘Set Your Monthly Limit’,
text: ‘Go to Settings → Monthly Budget and enter what you want to spend this month. We will show you a progress bar and warn you before you go over.’,
btn: ‘Got it’,
},
{
icon: ‘📊’,
title: ‘See Where Your Money Goes’,
text: ‘The Budget tab shows a full breakdown by category. Analytics shows charts. Check in weekly to stay on track.’,
btn: ‘Let's go!’,
},
];
var _obStep = 0;

function showOnboarding() {
if (localStorage.getItem(‘kvt_onboarded’)) return;
_obStep = 0;
renderObStep();
document.getElementById(‘onboard’).style.display = ‘flex’;
}

function replayOnboarding() {
localStorage.removeItem(‘kvt_onboarded’);
_obStep = 0;
renderObStep();
document.getElementById(‘onboard’).style.display = ‘flex’;
}

function renderObStep() {
var s = OB_STEPS[_obStep];
var accent = state.settings.accent || ‘#34C759’;
document.getElementById(‘ob-icon’).textContent = s.icon;
document.getElementById(‘ob-title’).textContent = s.title;
document.getElementById(‘ob-text’).textContent = s.text;
var nextBtn = document.getElementById(‘ob-next’);
nextBtn.textContent = s.btn || (_obStep === OB_STEPS.length - 1 ? ‘Done’ : ‘Next’);
nextBtn.style.background = accent;
document.getElementById(‘ob-back’).style.display = _obStep > 0 ? ‘block’ : ‘none’;

var dots = document.getElementById(‘ob-dots’);
dots.innerHTML = ‘’;
OB_STEPS.forEach(function(_, i) {
var d = document.createElement(‘div’);
d.className = ‘onboard-dot’ + (i === _obStep ? ’ active’ : ‘’);
dots.appendChild(d);
});
}

function obNext() {
var s = OB_STEPS[_obStep];
if (s.action === ‘loadTemplate’) { loadBudgetTemplate(); }
if (_obStep < OB_STEPS.length - 1) {
_obStep++;
renderObStep();
} else {
localStorage.setItem(‘kvt_onboarded’, ‘1’);
document.getElementById(‘onboard’).style.display = ‘none’;
}
}

function obBack() {
if (_obStep > 0) { _obStep–; renderObStep(); }
}

// ─── DEBUG SYSTEM ────────────────────────────────────────────────────────
function runDeepDebug() {
var r = [];
r.push(”=== KevT Budget Pro Deep Debug ===”);
r.push(“Time: “ + new Date().toISOString());
r.push(“Browser: “ + navigator.userAgent.substring(0,80));
r.push(“Screen: “ + window.screen.width + “x” + window.screen.height + “ @” + window.devicePixelRatio + “x”);
r.push(””);

r.push(”— STATE —”);
r.push(“Transactions: “ + state.transactions.length);
r.push(“Goals: “ + state.goals.length);
r.push(“Budget: $” + state.budget);
r.push(“Accent: “ + (state.settings.accent || “#34C759”));
r.push(“Tab: “ + state.ui.tab + “ | “ + (state.ui.month+1) + “/” + state.ui.year);

r.push(””);
r.push(”— STORAGE —”);
try {
localStorage.setItem(“kvt_test”,“1”); localStorage.removeItem(“kvt_test”);
r.push(“localStorage: OK”);
} catch(e) { r.push(“localStorage: FAILED “ + e.message); }
[“kvt_txs”,“kvt_goals”,“kvt_budget”,“kvt_settings”].forEach(function(k) {
var v = localStorage.getItem(k);
r.push(k + “: “ + (v ? v.length + “ chars” : “null”));
});

r.push(””);
r.push(”— DOM —”);
[“home”,“analytics”,“goals”,“budget”,“settings”].forEach(function(s) {
var el = document.getElementById(“screen-” + s);
r.push(“screen-” + s + “: “ + (el ? el.innerHTML.length + “ chars” : “MISSING”));
});
[“home”,“analytics”,“goals”,“budget”,“settings”].forEach(function(t) {
var el = document.getElementById(“tab-” + t);
r.push(“tab-” + t + “: “ + (el ? (el.classList.contains(“active”) ? “ACTIVE” : “ok”) : “MISSING”));
});
var fab = document.getElementById(“fab-add”);
r.push(“FAB: “ + (fab ? “found display=” + fab.style.display : “MISSING”));

r.push(””);
r.push(”— CSS VARS —”);
var cs = getComputedStyle(document.documentElement);
[”–accent”,”–bg”,”–card”,”–border”].forEach(function(v) {
r.push(v + “: “ + cs.getPropertyValue(v).trim());
});

r.push(””);
r.push(”— DEPS —”);
r.push(“Chart.js: “ + (typeof Chart !== “undefined” ? “loaded v” + (Chart.version||”?”) : “NOT LOADED”));
r.push(“XLSX: “ + (typeof XLSX !== “undefined” ? “loaded” : “not loaded”));

r.push(””);
r.push(”— DATA INTEGRITY —”);
var txErr = 0;
state.transactions.forEach(function(t,i) {
if (!t.id || !t.amount || !t.date || !t.type) { r.push(“TX[”+i+”] bad fields”); txErr++; }
});
r.push(“TX errors: “ + txErr);
var gErr = 0;
state.goals.forEach(function(g,i) {
if (!g.name || !g.target) { r.push(“Goal[”+i+”] bad fields”); gErr++; }
});
r.push(“Goal errors: “ + gErr);

var report = r.join(”\n”);
console.log(report);

var ov = document.createElement(“div”);
ov.style.cssText = “position:fixed;inset:0;background:#0d0d0d;z-index:9999;overflow-y:auto;-webkit-overflow-scrolling:touch;”;

var pre = document.createElement(“pre”);
pre.style.cssText = “color:#34C759;font-size:12px;padding:20px 16px 120px;white-space:pre-wrap;word-break:break-all;”;
pre.textContent = report;
ov.appendChild(pre);

var btns = document.createElement(“div”);
btns.style.cssText = “position:fixed;bottom:0;left:0;right:0;padding:16px;background:#0d0d0d;display:flex;gap:10px;”;

var copyBtn = document.createElement(“button”);
copyBtn.textContent = “Copy Report”;
copyBtn.style.cssText = “flex:1;padding:14px;background:#34C759;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;”;
copyBtn.onclick = function() {
if (navigator.clipboard) {
navigator.clipboard.writeText(report).then(function() { alert(“Copied!”); });
} else {
var ta = document.createElement(“textarea”);
ta.value = report;
document.body.appendChild(ta);
ta.select();
document.execCommand(“copy”);
document.body.removeChild(ta);
alert(“Copied!”);
}
};

var closeBtn = document.createElement(“button”);
closeBtn.textContent = “Close”;
closeBtn.style.cssText = “flex:1;padding:14px;background:#333;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;”;
closeBtn.onclick = function() { ov.remove(); };

btns.appendChild(copyBtn);
btns.appendChild(closeBtn);
ov.appendChild(btns);
document.body.appendChild(ov);
}

// ─── FILE INPUT TRIGGERS (iOS-safe) ────────────────────────
function triggerBudgetFileInput() {
var el = document.getElementById(‘global-budget-file’);
if (el) { el.value = ‘’; el.click(); }
}

function triggerTxFileInput() {
var el = document.getElementById(‘global-tx-file’);
if (el) { el.value = ‘’; el.click(); }
}

function handleBudgetFileInput(e) {
var file = e.target.files[0];
if (!file) return;
var name = file.name.toLowerCase();
if (name.endsWith(’.csv’)) {
var reader = new FileReader();
reader.onload = function(ev) { parseBudgetCSV(ev.target.result); };
reader.onerror = function() { alert(‘Could not read file.’); };
reader.readAsText(file);
} else {
if (typeof XLSX === ‘undefined’) {
alert(‘Excel support not loaded. Try saving as CSV first.’);
return;
}
var reader = new FileReader();
reader.onload = function(ev) {
try {
var wb = XLSX.read(new Uint8Array(ev.target.result), { type: ‘array’ });
var ws = wb.Sheets[wb.SheetNames[0]];
var rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: ‘’ });
parseBudgetRows(rows);
} catch(err) {
alert(‘Could not read Excel file. Try saving as CSV and importing that.’);
}
};
reader.onerror = function() { alert(‘Could not read file.’); };
reader.readAsArrayBuffer(file);
}
}

function importCSVFromInput(e) {
var file = e.target.files[0];
if (!file) return;
var reader = new FileReader();
reader.onload = function(ev) {
var text = ev.target.result;
var lines = text.split(’\n’);
var imported = 0, skipped = 0;
var key = monthKey(state.ui.year, state.ui.month);
var header = lines[0] ? lines[0].toLowerCase() : ‘’;
var isOurFormat = header.indexOf(‘merchant’) >= 0 && header.indexOf(‘category’) >= 0;
var learned = S.get(‘cat_memory’) || {};

```
// Compact category rules: keyword -> category
var CAT = {
  'grocery':'Food & Dining','kroger':'Food & Dining','safeway':'Food & Dining','albertsons':'Food & Dining','publix':'Food & Dining','aldi':'Food & Dining','costco':'Food & Dining','trader joe':'Food & Dining','whole food':'Food & Dining','walmart':'Food & Dining','target':'Food & Dining','restaurant':'Food & Dining','mcdonald':'Food & Dining','burger king':'Food & Dining','wendy':'Food & Dining','taco bell':'Food & Dining','chick-fil':'Food & Dining','chick fil':'Food & Dining','subway':'Food & Dining','pizza':'Food & Dining','starbucks':'Food & Dining','dunkin':'Food & Dining','chipotle':'Food & Dining','panera':'Food & Dining','doordash':'Food & Dining','grubhub':'Food & Dining','uber eats':'Food & Dining','instacart':'Food & Dining','dining':'Food & Dining',
  'shell':'Transportation','bp ':'Transportation','exxon':'Transportation','mobil':'Transportation','chevron':'Transportation','sunoco':'Transportation','speedway':'Transportation','circle k':'Transportation','wawa':'Transportation','sheetz':'Transportation','casey':'Transportation','kwik trip':'Transportation','gas station':'Transportation','fuel':'Transportation','uber':'Transportation','lyft':'Transportation','parking':'Transportation','toll':'Transportation','autozone':'Transportation','o\'reilly':'Transportation','advance auto':'Transportation','jiffy lube':'Transportation','valvoline':'Transportation','midas':'Transportation','oil change':'Transportation','tire':'Transportation','hertz':'Transportation','enterprise rent':'Transportation','avis':'Transportation','car wash':'Transportation',
  'netflix':'Entertainment','hulu':'Entertainment','disney':'Entertainment','hbo':'Entertainment','spotify':'Entertainment','apple music':'Entertainment','amazon prime':'Entertainment','peacock':'Entertainment','paramount':'Entertainment','youtube premium':'Entertainment','xbox':'Entertainment','playstation':'Entertainment','nintendo':'Entertainment','steam':'Entertainment','movie':'Entertainment','theater':'Entertainment','concert':'Entertainment','ticketmaster':'Entertainment','stubhub':'Entertainment',
  'at&t':'Bills & Utilities','verizon':'Bills & Utilities','t-mobile':'Bills & Utilities','comcast':'Bills & Utilities','xfinity':'Bills & Utilities','spectrum':'Bills & Utilities','cox ':'Bills & Utilities','electric':'Bills & Utilities','utility':'Bills & Utilities','water bill':'Bills & Utilities','insurance':'Bills & Utilities','mortgage':'Bills & Utilities','rent':'Bills & Utilities','hoa':'Bills & Utilities','trash':'Bills & Utilities','internet':'Bills & Utilities','phone':'Bills & Utilities',
  'cvs':'Health & Fitness','walgreens':'Health & Fitness','rite aid':'Health & Fitness','pharmacy':'Health & Fitness','doctor':'Health & Fitness','hospital':'Health & Fitness','dental':'Health & Fitness','gym':'Health & Fitness','planet fitness':'Health & Fitness','anytime fitness':'Health & Fitness','peloton':'Health & Fitness','medical':'Health & Fitness','prescription':'Health & Fitness','health':'Health & Fitness',
  'amazon':'Shopping','ebay':'Shopping','etsy':'Shopping','best buy':'Shopping','home depot':'Shopping','lowes':'Shopping','ikea':'Shopping','wayfair':'Shopping','nordstrom':'Shopping','macys':'Shopping','kohls':'Shopping','tj maxx':'Shopping','marshalls':'Shopping','target ':'Shopping','gap':'Shopping','old navy':'Shopping','nike':'Shopping','adidas':'Shopping','ulta':'Shopping','sephora':'Shopping',
  'hotel':'Travel','marriott':'Travel','hilton':'Travel','hyatt':'Travel','airbnb':'Travel','delta':'Travel','united airlines':'Travel','southwest':'Travel','american airlines':'Travel','jetblue':'Travel','expedia':'Travel','booking.com':'Travel',
  'vanguard':'Investments','fidelity':'Investments','schwab':'Investments','robinhood':'Investments','acorns':'Investments','coinbase':'Investments','invest':'Investments','saving':'Investments',
  'goodwill':'Gifts & Charity','church':'Gifts & Charity','charity':'Gifts & Charity','donation':'Gifts & Charity',
  'payroll':'Work Income','direct deposit':'Work Income','salary':'Work Income','wages':'Work Income',
  'venmo':'Other Income','zelle':'Other Income','cashapp':'Other Income','paypal':'Other Income','refund':'Other Income',
};

function autocat(merchant, type) {
  var m = merchant.toLowerCase();
  var lm = m.replace(/[^a-z0-9 &]/g,' ').replace(/ +/g,' ').trim();
  if (learned[lm]) return learned[lm];
  for (var k in CAT) { if (m.indexOf(k) >= 0) return CAT[k]; }
  return type === 'income' ? 'Other Income' : 'Other';
}

function parseCSVLine(line) {
  var result=[], cur='', inQ=false;
  for (var i=0;i<line.length;i++) {
    var c=line[i];
    if (c==='"') inQ=!inQ;
    else if (c===','&&!inQ){result.push(cur.trim());cur='';}
    else cur+=c;
  }
  result.push(cur.trim());
  return result;
}

lines.slice(1).forEach(function(line) {
  if (!line.trim()) return;
  var p = parseCSVLine(line);
  var date, merchant, amount, type, category, notes='';
  if (isOurFormat) {
    if (p.length < 5) { skipped++; return; }
    date=p[0]; merchant=p[1]; type=p[2]; category=p[3];
    amount=parseFloat(p[4])||0; notes=p[5]||'';
  } else {
    if (p.length < 2) { skipped++; return; }
    date=p[0]; merchant=p[1].replace(/"/g,'').trim();
    if (p.length >= 4) {
      var deb=parseFloat(p[2].replace(/[$,]/g,'')), cred=parseFloat(p[3].replace(/[$,]/g,''));
      if (!isNaN(deb)&&deb>0){amount=deb;type='expense';}
      else if (!isNaN(cred)&&cred>0){amount=cred;type='income';}
      else{amount=Math.abs(parseFloat(p[2].replace(/[$,]/g,''))||0);type=parseFloat(p[2])<0?'expense':'income';}
    } else {
      var raw=parseFloat((p[2]||'0').replace(/[$,]/g,''))||0;
      amount=Math.abs(raw); type=raw<0?'expense':'income';
    }
    category=autocat(merchant,type);
    if (date.indexOf('/')>=0){var dp=date.split('/');if(dp.length===3){var yr=dp[2].length===2?'20'+dp[2]:dp[2];date=yr+'-'+('0'+dp[0]).slice(-2)+'-'+('0'+dp[1]).slice(-2);}}
  }
  if (!amount||amount<=0){skipped++;return;}
  if (!date||!merchant){skipped++;return;}
  state.transactions.push({id:uid(),date:date,merchant:merchant,type:type,category:category,amount:amount,notes:notes});
  imported++;
});

save();
var byCat={};
state.transactions.filter(function(t){return t.notes!=='Budget import'&&t.date.startsWith(key);}).forEach(function(t){if(!byCat[t.category])byCat[t.category]=0;byCat[t.category]+=t.amount;});
var summary='Imported '+imported+' transactions'+(skipped>0?' ('+skipped+' skipped)':'')+'.';
summary+='\n\nTop categories:\n';
Object.keys(byCat).sort(function(a,b){return byCat[b]-byCat[a];}).slice(0,5).forEach(function(cat){summary+='  '+cat+': $'+byCat[cat].toFixed(0)+'\n';});
alert(summary);
switchTab('home');
```

};
reader.readAsText(file);
}

// ─── FILE INPUT SETUP ─────────────────────────────────────
// Set up file input listeners after DOM loads (not inline onchange)
function setupFileInputs() {
var budgetInput = document.getElementById(‘global-budget-file’);
if (budgetInput) {
budgetInput.addEventListener(‘change’, function(e) {
handleBudgetFileInput(e);
});
}
var txInput = document.getElementById(‘global-tx-file’);
if (txInput) {
txInput.addEventListener(‘change’, function(e) {
importCSVFromInput(e);
});
}
}

function triggerBudgetFileInput() {
var label = document.getElementById(‘budget-file-label’);
if (label) {
// Reset value so same file can be re-imported
var inp = document.getElementById(‘global-budget-file’);
if (inp) inp.value = ‘’;
label.click();
}
}

function triggerTxFileInput() {
var label = document.getElementById(‘tx-file-label’);
if (label) {
var inp = document.getElementById(‘global-tx-file’);
if (inp) inp.value = ‘’;
label.click();
}
}

function handleBudgetFileInput(e) {
var file = e.target.files[0];
if (!file) return;
var name = file.name.toLowerCase();
if (name.endsWith(’.csv’)) {
var reader = new FileReader();
reader.onload = function(ev) { parseBudgetCSV(ev.target.result); };
reader.onerror = function() { alert(‘Could not read file.’); };
reader.readAsText(file);
} else {
if (typeof XLSX === ‘undefined’) {
alert(‘Excel support not loaded. Check internet connection.’);
return;
}
var reader = new FileReader();
reader.onload = function(ev) {
try {
var wb = XLSX.read(new Uint8Array(ev.target.result), { type: ‘array’ });
var ws = wb.Sheets[wb.SheetNames[0]];
var rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: ‘’ });
parseBudgetRows(rows);
} catch(err) {
alert(’Could not read Excel file: ’ + err.message);
}
};
reader.onerror = function() { alert(‘Could not read file.’); };
reader.readAsArrayBuffer(file);
}
}

function importCSVFromInput(e) {
var file = e.target.files[0];
if (!file) return;
var reader = new FileReader();
reader.onload = function(ev) {
var lines = ev.target.result.split(’\n’).slice(1);
var imported = 0;
lines.forEach(function(line) {
if (!line.trim()) return;
var parts = line.split(’,’);
if (parts.length < 5) return;
state.transactions.push({
id: uid(),
date: parts[0].trim(),
merchant: parts[1].replace(/”/g, ‘’).trim(),
type: parts[2].trim(),
category: parts[3].replace(/”/g, ‘’).trim(),
amount: parseFloat(parts[4]) || 0,
notes: (parts[5] || ‘’).replace(/”/g, ‘’).trim(),
});
imported++;
});
save();
alert(‘Imported ’ + imported + ’ transactions.’);
if (state.ui.tab === ‘home’) renderHome();
else renderSettings();
};
reader.readAsText(file);
}

// ─── LOAD BUDGET TEMPLATE ─────────────────────────────────
function loadBudgetTemplate() {
var key = monthKey(state.ui.year, state.ui.month);
var existing = state.transactions.filter(function(t) { return t.date.startsWith(key); });
if (existing.length > 0) return;
if (!state.plan) { state.plan = buildDefaultPlan(); savePlan(); }
if (!state.budget) { state.budget = 3800; save(); }
}

// ─── DRAW CHARTS ───────────────────────────────────────────
function drawCharts(txs, inc, exp) {
var isDark = window.matchMedia(’(prefers-color-scheme: dark)’).matches;
var textColor = isDark ? ‘rgba(235,235,245,0.6)’ : ‘rgba(60,60,67,0.6)’;
var byCat = {};
txs.filter(function(t) { return t.type === ‘expense’; }).forEach(function(t) {
byCat[t.category] = (byCat[t.category] || 0) + t.amount;
});
var catKeys = Object.keys(byCat);
var pieEl = document.getElementById(‘pie-chart’);
if (pieEl && catKeys.length > 0) {
if (window._pieChart) { window._pieChart.destroy(); window._pieChart = null; }
window._pieChart = new Chart(pieEl.getContext(‘2d’), {
type: ‘doughnut’,
data: {
labels: catKeys,
datasets: [{
data: catKeys.map(function(k) { return byCat[k]; }),
backgroundColor: catKeys.map(function(k) { return catFor(k).color; }),
borderWidth: 0,
}]
},
options: {
responsive: true,
plugins: {
legend: { position:‘bottom’, labels: { color:textColor, font:{ size:12 }, boxWidth:12, padding:12 } },
tooltip: { callbacks: { label: function(ctx) { return ’ ’ + fmt(ctx.raw); } } }
},
cutout: ‘55%’,
}
});
}
var barEl = document.getElementById(‘bar-chart’);
if (barEl) {
if (window._barChart) { window._barChart.destroy(); window._barChart = null; }
window._barChart = new Chart(barEl.getContext(‘2d’), {
type: ‘bar’,
data: {
labels: [‘Income’, ‘Expenses’],
datasets: [{
data: [inc, exp],
backgroundColor: [‘rgba(52,199,89,0.8)’, ‘rgba(255,59,48,0.8)’],
borderRadius: 8,
}]
},
options: {
responsive: true,
plugins: { legend: { display:false } },
scales: {
y: { ticks: { color:textColor, callback: function(v) { return ‘$’+v; } }, grid: { color: isDark ? ‘rgba(255,255,255,0.05)’ : ‘rgba(0,0,0,0.05)’ } },
x: { ticks: { color:textColor }, grid: { display:false } }
}
}
});
}
}

function openAlertPctSheet() {
var alertPct = (state.settings && state.settings.alertPct) || 80;
var ov = document.createElement(‘div’);
ov.id = ‘alert-pct-overlay’;
ov.style.cssText = ‘position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:200;display:flex;align-items:flex-end;’;
var html = ‘<div style="background:var(--card);border-radius:20px 20px 0 0;width:100%;padding:24px 20px 48px">’;
html += ‘<div style="font-size:18px;font-weight:700;margin-bottom:8px">Spending Alert</div>’;
html += ‘<div style="font-size:13px;color:var(--text2);margin-bottom:20px">Alert when I reach this % of planned spend</div>’;
html += ‘<div class="form-group"><label class="form-label">Alert at (%)</label>’;
html += ‘<input class="form-input" id="alert-pct-input" type="number" inputmode="decimal" min="1" max="100" value="' + alertPct + '"></div>’;
html += ‘<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:20px">’;
html += ‘<button onclick="setAlertPctQuick(70)" class="btn btn-secondary btn-sm">70%</button>’;
html += ‘<button onclick="setAlertPctQuick(80)" class="btn btn-secondary btn-sm">80%</button>’;
html += ‘<button onclick="setAlertPctQuick(90)" class="btn btn-secondary btn-sm">90%</button>’;
html += ‘</div><button class="btn btn-primary btn-full" onclick="saveAlertPct()">Save</button></div>’;
ov.innerHTML = html;
ov.onclick = function(e) { if (e.target === ov) ov.remove(); };
document.body.appendChild(ov);
setTimeout(function() { var i = document.getElementById(‘alert-pct-input’); if(i) i.focus(); }, 300);
}
function setAlertPctQuick(p) { var i = document.getElementById(‘alert-pct-input’); if(i) i.value = p; }
function saveAlertPct() {
var val = parseInt(document.getElementById(‘alert-pct-input’).value);
if (isNaN(val)||val<1||val>100) { alert(‘Enter 1-100’); return; }
if (!state.settings) state.settings = {};
state.settings.alertPct = val; save();
var ov = document.getElementById(‘alert-pct-overlay’); if(ov) ov.remove();
renderSettings();
}
function learnCategory(merchant, category) {
var learned = S.get(‘cat_memory’) || {};
var m = merchant.toLowerCase().replace(/[^a-z0-9 &]/g,’ ‘).replace(/ +/g,’ ’).trim();
if (m) { learned[m] = category; S.set(‘cat_memory’, learned); }
}

// ─── BOOT ──────────────────────────────────────────────────

(function initApp() {
if (document.readyState === ‘loading’) {
document.addEventListener(‘DOMContentLoaded’, initApp);
return;
}
setupFileInputs();
updateTopbarMonth();
// Apply saved accent immediately
var savedAccent = state.settings.accent || ‘#34C759’;
document.documentElement.style.setProperty(’–accent’, savedAccent);

// Render initial screen
renderHome();

// Splash removal
setTimeout(function() {
var splash = document.getElementById(‘splash’);
if (!splash) return;
var els = splash.querySelectorAll(’*’);
for (var ei = 0; ei < els.length; ei++) { els[ei].style.animation = ‘none’; }
splash.style.transition = ‘opacity 0.5s’;
splash.style.opacity = ‘0’;
splash.style.pointerEvents = ‘none’;
setTimeout(function() { var s = document.getElementById(‘splash’); if (s) s.remove(); }, 600);
}, 1800);

// Show onboarding on first run
setTimeout(function() { showOnboarding(); }, 1200);
})()
