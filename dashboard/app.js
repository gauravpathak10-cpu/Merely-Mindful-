// ============================================================
// Merely Mindful — Member Dashboard app logic
// Real Supabase auth + data. No hardcoded member data lives here —
// everything comes from the `members`, `content_library`,
// `journey_modules`, `progress`, and `next_steps` tables
// (see /supabase/schema.sql).
// ============================================================
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const cfg = window.SUPABASE_CONFIG || { url: '', anonKey: '' };

if (!cfg.url || !cfg.anonKey) {
  document.getElementById('config-banner').classList.remove('hidden');
  // Stop here — nothing below will work without real config.
  throw new Error('Supabase not configured — see dashboard/config.js');
}

const supabase = createClient(cfg.url, cfg.anonKey);
let currentMember = null;
let showCount = true;

// ---------- AUTH ----------
document.getElementById('login-btn').addEventListener('click', async () => {
  const email = document.getElementById('login-email').value.trim();
  const statusEl = document.getElementById('login-status');
  if (!email) { statusEl.textContent = 'Please enter your email.'; return; }
  statusEl.textContent = 'Sending...';
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.href }
  });
  statusEl.textContent = error
    ? 'Something went wrong: ' + error.message
    : 'Check your email for a secure sign-in link.';
});

document.getElementById('signout-link').addEventListener('click', async () => {
  await supabase.auth.signOut();
});

supabase.auth.onAuthStateChange(async (event, session) => {
  if (session && session.user) {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('today-date').textContent =
      new Date().toLocaleDateString('en-IE', { weekday: 'long', month: 'long', day: 'numeric' });
    await loadEverything(session.user);
  } else {
    document.getElementById('app').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
  }
});

// ---------- LOAD EVERYTHING ----------
async function loadEverything(user) {
  const { data: member, error } = await supabase
    .from('members').select('*').eq('id', user.id).maybeSingle();

  if (error || !member) {
    document.getElementById('greeting-name').textContent = 'No enrollment found';
    document.getElementById('login-status').textContent = '';
    alert("We couldn't find a membership tied to this email. If you've recently purchased, please contact support.");
    await supabase.auth.signOut();
    return;
  }

  currentMember = member;
  showCount = !member.hide_day_count;
  document.getElementById('account-count-toggle').checked = showCount;
  document.getElementById('greeting-name').textContent = 'Welcome back';

  renderToday(member);
  await Promise.all([
    loadSteps(member.id),
    loadContent(member),
    loadJourney(member.id)
  ]);
  document.getElementById('circle-name').textContent = member.circle === 'birth' ? 'Birth Circle' : 'Womb Circle';
}

// ---------- TODAY: cycle/pregnancy math + rendering ----------
function daysBetween(a, b) { return Math.floor((b - a) / 86400000); }

function computeTtc(member) {
  if (!member.last_period_start) return { cycleDay: null, cycleLength: member.cycle_length || 28 };
  const start = new Date(member.last_period_start);
  const today = new Date();
  const len = member.cycle_length || 28;
  const elapsed = daysBetween(start, today) % len;
  return { cycleDay: (elapsed < 0 ? elapsed + len : elapsed) + 1, cycleLength: len };
}

function computePregnant(member) {
  if (!member.due_date) return { week: null };
  const due = new Date(member.due_date);
  const today = new Date();
  const daysToGo = daysBetween(today, due);
  const week = Math.min(40, Math.max(0, 40 - Math.ceil(daysToGo / 7)));
  return { week };
}

function setRing(mode, extra) {
  const ring = document.getElementById('wheel-ring');
  if (mode === 'ttc' && extra.cycleDay) {
    const deg = (extra.cycleDay / extra.cycleLength) * 360;
    ring.style.setProperty('--ring-bg', `conic-gradient(var(--gold) ${deg}deg, var(--line) 0deg)`);
    // Moon offset: 0 at full/fertile midpoint, larger near cycle start/end
    const frac = extra.cycleDay / extra.cycleLength;
    const offsetPx = Math.round(Math.abs(Math.cos(frac * Math.PI)) * 26);
    document.getElementById('moon-disc').style.setProperty('--moon-offset', offsetPx + 'px');
    ring.innerHTML = '';
  } else if (mode === 'pregnant' && extra.week != null) {
    const deg = (extra.week / 40) * 360;
    ring.style.setProperty('--ring-bg', `conic-gradient(var(--crimson) ${deg}deg, var(--line) 0deg)`);
    ring.innerHTML = '<div class="tick" style="transform:rotate(117deg)"><div class="tick-mark"></div></div>' +
                      '<div class="tick" style="transform:rotate(234deg)"><div class="tick-mark"></div></div>';
  } else {
    ring.style.setProperty('--ring-bg', 'conic-gradient(var(--gold) 0deg, var(--gold) 360deg)');
    ring.innerHTML = '';
  }
}

function renderToday(member) {
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.dataset.view === member.stage));
  const primary = document.getElementById('primary-cta');
  const ghost = document.getElementById('ghost-cta');
  const recommend = document.getElementById('recommend-section');
  const countToggle = document.getElementById('count-toggle');
  const stepsBar = document.getElementById('steps-bar');

  if (member.stage === 'sensitive_care') {
    setRing('care', {});
    document.getElementById('phase-name').textContent = 'We are holding space for you';
    document.getElementById('phase-detail').textContent =
      'There is no need to track anything right now. When you are ready, Oshika would like to speak with you directly.';
    document.getElementById('focus-tag').textContent = 'A Gentle Note';
    document.getElementById('focus-title').textContent = 'You do not need to do anything today';
    document.getElementById('focus-desc').textContent =
      'Automated recommendations are paused for your account. This space is simply here when you want it.';
    document.getElementById('why-this').style.display = 'none';
    document.getElementById('wheel-caption').classList.add('hidden-count');
    primary.textContent = 'Book a call with Oshika';
    ghost.classList.add('hidden');
    recommend.classList.add('hidden');
    countToggle.classList.add('hidden');
    stepsBar.innerHTML = '<p class="care-quiet">There is nothing on your list right now — that is alright.</p>';
    document.getElementById('affirmation').textContent = '"You are held, exactly as you are, in this moment."';
    return;
  }

  ghost.classList.remove('hidden');
  recommend.classList.remove('hidden');
  countToggle.classList.remove('hidden');
  document.getElementById('why-this').style.display = 'block';
  primary.textContent = 'Begin practice';
  ghost.textContent = 'See alternatives';

  if (member.stage === 'pregnant') {
    const { week } = computePregnant(member);
    setRing('pregnant', { week });
    document.getElementById('wheel-eyebrow').textContent = 'Pregnancy Week';
    document.getElementById('wheel-big').textContent = week != null ? `Week ${week}` : 'Add your due date';
    document.getElementById('wheel-small').textContent = week != null ? 'of 40 weeks' : '';
    document.getElementById('phase-name').textContent = week != null ? trimesterName(week) : '—';
    document.getElementById('phase-detail').textContent = week != null
      ? 'Energy and needs shift week to week — your practice below is matched to where you are now.'
      : 'Add a due date in Account so we can personalize this view.';
    document.getElementById('focus-tag').textContent = "Today's Focus";
    document.getElementById('focus-title').textContent = 'Prenatal practice for this trimester';
    document.getElementById('focus-desc').textContent = 'Pulled from your Practice Library, matched to this week.';
    document.getElementById('why-this').textContent = week != null ? `Why this: you are in week ${week}.` : '';
    document.getElementById('affirmation').textContent = '"I trust my body to grow and carry this life, one day at a time."';
  } else {
    const { cycleDay, cycleLength } = computeTtc(member);
    setRing('ttc', { cycleDay, cycleLength });
    document.getElementById('wheel-eyebrow').textContent = 'Cycle Day';
    document.getElementById('wheel-big').textContent = cycleDay ? `Day ${cycleDay}` : 'Add your last period date';
    document.getElementById('wheel-small').textContent = cycleDay ? `of ${cycleLength}` : '';
    document.getElementById('phase-name').textContent = cycleDay ? phaseName(cycleDay, cycleLength) : '—';
    document.getElementById('phase-detail').textContent = cycleDay
      ? 'Your practice below is matched to this phase of your cycle.'
      : 'Add your last period start date in Account so we can personalize this view.';
    document.getElementById('focus-tag').textContent = "Today's Focus";
    document.getElementById('focus-title').textContent = 'Practice matched to your cycle phase';
    document.getElementById('focus-desc').textContent = 'Pulled from your Practice Library, matched to today.';
    document.getElementById('why-this').textContent = cycleDay ? `Why this: you are on day ${cycleDay} of your cycle.` : '';
    document.getElementById('affirmation').textContent = '"My body knows how to create life, and I am listening to it."';
  }
  document.getElementById('wheel-caption').classList.toggle('hidden-count', !showCount);
}

function phaseName(day, len) {
  const ovulationDay = Math.round(len / 2);
  if (day <= 5) return 'Menstrual Phase';
  if (day < ovulationDay - 2) return 'Follicular Phase';
  if (day <= ovulationDay + 2) return 'Fertile Window';
  return 'Luteal Phase';
}
function trimesterName(week) {
  if (week <= 13) return 'First Trimester';
  if (week <= 27) return 'Second Trimester';
  return 'Third Trimester';
}

document.getElementById('count-toggle').addEventListener('click', async () => {
  showCount = !showCount;
  document.getElementById('wheel-caption').classList.toggle('hidden-count', !showCount);
  document.getElementById('count-toggle').textContent = showCount ? 'Hide exact day count' : 'Show exact day count';
  document.getElementById('account-count-toggle').checked = showCount;
  if (currentMember) {
    await supabase.from('members').update({ hide_day_count: !showCount }).eq('id', currentMember.id);
  }
});
document.getElementById('account-count-toggle').addEventListener('change', async function () {
  showCount = this.checked;
  document.getElementById('wheel-caption').classList.toggle('hidden-count', !showCount);
  document.getElementById('count-toggle').textContent = showCount ? 'Hide exact day count' : 'Show exact day count';
  if (currentMember) {
    await supabase.from('members').update({ hide_day_count: !showCount }).eq('id', currentMember.id);
  }
});

// ---------- NEXT STEPS ----------
async function loadSteps(memberId) {
  const { data: steps } = await supabase.from('next_steps').select('*').eq('member_id', memberId).order('created_at');
  const list = document.getElementById('steps-list');
  if (!steps || steps.length === 0) {
    list.innerHTML = '<li style="cursor:default;"><span style="color:var(--ink-faint);">Nothing on your list yet.</span></li>';
    return;
  }
  list.innerHTML = steps.map(s => `
    <li class="${s.done ? 'done' : ''}" data-id="${s.id}">
      <div class="box ${s.done ? 'done' : ''}"></div><span>${escapeHtml(s.label)}</span>
    </li>`).join('');
  list.querySelectorAll('li[data-id]').forEach(li => {
    li.addEventListener('click', async () => {
      const nowDone = !li.classList.contains('done');
      li.classList.toggle('done', nowDone);
      li.querySelector('.box').classList.toggle('done', nowDone);
      await supabase.from('next_steps').update({ done: nowDone }).eq('id', li.dataset.id);
    });
  });
}

// ---------- CONTENT LIBRARY (Practice / Nourish / Recommended) ----------
async function loadContent(member) {
  const { data: items } = await supabase.from('content_library').select('*');
  const all = items || [];

  const practice = all.filter(i => ['yoga', 'meditation', 'breath'].includes(i.type));
  const nourish = all.filter(i => i.type === 'recipe');

  renderGrid('practice-grid', practice, i => i.type);
  renderGrid('nourish-grid', nourish, () => 'recipe');
  wireChips('practice-chips', 'practice-grid');

  // Recommended: naive tag match against current phase/trimester name
  const phaseTag = member.stage === 'pregnant'
    ? (computePregnant(member).week != null ? trimesterTag(computePregnant(member).week) : null)
    : (computeTtc(member).cycleDay != null ? phaseTag(computeTtc(member).cycleDay, computeTtc(member).cycleLength) : null);
  const recommended = phaseTag ? all.filter(i => (i.tags || []).includes(phaseTag)).slice(0, 3) : all.slice(0, 3);
  renderGrid('recommend-grid', recommended, i => i.type, true);
}

function phaseTag(day, len) {
  const name = phaseName(day, len);
  return { 'Menstrual Phase': 'menstrual', 'Follicular Phase': 'follicular', 'Fertile Window': 'ovulation', 'Luteal Phase': 'luteal' }[name];
}
function trimesterTag(week) {
  if (week <= 13) return 'first_trimester';
  if (week <= 27) return 'second_trimester';
  return 'third_trimester';
}

function renderGrid(elId, items, iconFor, showWhy) {
  const el = document.getElementById(elId);
  if (!items.length) {
    el.innerHTML = '<p style="font-size:13px;color:var(--ink-soft);">Nothing here yet — add rows to content_library in Supabase.</p>';
    return;
  }
  el.innerHTML = items.map(i => `
    <div class="tile" data-cat="${i.type}">
      <div class="tile-icon">${i.type === 'recipe' ? '✿' : '☾'}</div>
      <h3>${escapeHtml(i.title)}</h3>
      <p>${escapeHtml(i.description || '')}</p>
      ${showWhy ? `<div class="why">Matched to: ${(i.tags || []).join(', ')}</div>` : ''}
      <div class="meta"><span>${i.duration_min ? i.duration_min + ' min · ' : ''}${i.type}</span></div>
    </div>`).join('');
}

function wireChips(chipContainerId, gridId) {
  const container = document.getElementById(chipContainerId);
  const grid = document.getElementById(gridId);
  container.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      container.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', 'false'));
      chip.setAttribute('aria-pressed', 'true');
      const filter = chip.dataset.filter;
      grid.querySelectorAll('.tile').forEach(tile => {
        tile.style.display = (filter === 'all' || tile.dataset.cat === filter) ? '' : 'none';
      });
    });
  });
}

// ---------- JOURNEY ----------
async function loadJourney(memberId) {
  const { data: modules } = await supabase.from('journey_modules').select('*').order('week_number');
  const { data: progressRows } = await supabase.from('progress').select('*').eq('member_id', memberId);
  const progressByModule = {};
  (progressRows || []).forEach(p => { progressByModule[p.module_id] = p; });

  const mods = modules || [];
  document.getElementById('journey-path').innerHTML = mods.map(m => {
    const status = progressByModule[m.id]?.status || 'locked';
    return `<div class="step ${status}"><div class="connector"></div><div class="dot">${status === 'done' ? '✓' : m.week_number}</div><div class="label">${escapeHtml(m.title)}</div><div class="sub">Week ${m.week_number}</div></div>`;
  }).join('') || '<p style="font-size:13px;color:var(--ink-soft);">Add rows to journey_modules in Supabase to populate this.</p>';

  document.getElementById('module-list').innerHTML = mods.map(m => {
    const status = progressByModule[m.id]?.status || 'locked';
    return `<div class="module ${status}" data-module-id="${m.id}">
      <button class="module-head" data-toggle="module"><div class="dot">${status === 'done' ? '✓' : m.week_number}</div>
        <div class="titles"><h3>Week ${m.week_number} — ${escapeHtml(m.title)}</h3><div class="sub">${status}</div></div>
        <span class="chevron">⌄</span></button>
      <div class="module-body"><div class="module-body-inner">${escapeHtml(m.description || '')}
        <div class="actions">
          ${m.media_url ? `<a class="btn-primary" style="padding:8px 14px;text-decoration:none;" href="${m.media_url}" target="_blank" rel="noopener">Watch lesson</a>` : ''}
          ${m.workbook_url ? `<a class="btn-ghost" style="padding:8px 14px;text-decoration:none;" href="${m.workbook_url}" target="_blank" rel="noopener">Download workbook</a>` : ''}
          ${status === 'current' ? `<button class="btn-ghost" style="padding:8px 14px;" data-mark-done="${m.id}">Mark complete</button>` : ''}
        </div></div></div>
    </div>`;
  }).join('');

  document.querySelectorAll('[data-toggle="module"]').forEach(btn => {
    btn.addEventListener('click', () => btn.closest('.module').classList.toggle('open'));
  });
  document.querySelectorAll('[data-mark-done]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await supabase.from('progress').update({ status: 'done', completed_at: new Date().toISOString() })
        .eq('member_id', memberId).eq('module_id', btn.dataset.markDone);
      await loadJourney(memberId);
    });
  });
}

// ---------- CIRCLE SWITCH ----------
document.getElementById('switch-circle-btn').addEventListener('click', async () => {
  if (!currentMember) return;
  const next = currentMember.circle === 'birth' ? 'womb' : 'birth';
  await supabase.from('members').update({ circle: next }).eq('id', currentMember.id);
  currentMember.circle = next;
  document.getElementById('circle-name').textContent = next === 'birth' ? 'Birth Circle' : 'Womb Circle';
});

// ---------- ACCOUNT ----------
function renderAccount(member) {
  document.getElementById('account-details').innerHTML = `
    <div><strong style="color:var(--ink);">Email:</strong> ${escapeHtml(member.email)}</div>
    <div><strong style="color:var(--ink);">Stage:</strong> ${escapeHtml(member.stage)}</div>
    <div><strong style="color:var(--ink);">Tier:</strong> ${escapeHtml(member.tier || '—')}</div>`;

  document.getElementById('field-stage').value = member.stage === 'pregnant' ? 'pregnant' : 'ttc';
  document.getElementById('field-last-period').value = member.last_period_start || '';
  document.getElementById('field-cycle-length').value = member.cycle_length || 28;
  document.getElementById('field-due-date').value = member.due_date || '';
  toggleStageFields();
}

function toggleStageFields() {
  const stage = document.getElementById('field-stage').value;
  document.getElementById('ttc-fields').classList.toggle('hidden', stage !== 'ttc');
  document.getElementById('pregnant-fields').classList.toggle('hidden', stage !== 'pregnant');
}
document.getElementById('field-stage').addEventListener('change', toggleStageFields);

document.getElementById('save-cycle-btn').addEventListener('click', async () => {
  if (!currentMember) return;
  const statusEl = document.getElementById('save-status');
  const stage = document.getElementById('field-stage').value;
  const updates = { stage };
  if (stage === 'ttc') {
    updates.last_period_start = document.getElementById('field-last-period').value || null;
    updates.cycle_length = parseInt(document.getElementById('field-cycle-length').value, 10) || 28;
  } else {
    updates.due_date = document.getElementById('field-due-date').value || null;
  }
  statusEl.textContent = 'Saving...';
  const { error } = await supabase.from('members').update(updates).eq('id', currentMember.id);
  if (error) {
    statusEl.textContent = 'Something went wrong: ' + error.message;
    return;
  }
  Object.assign(currentMember, updates);
  statusEl.textContent = 'Saved.';
  renderToday(currentMember);
  await loadContent(currentMember);
  setTimeout(() => { statusEl.textContent = ''; }, 2500);
});

// ---------- PAGE ROUTING ----------
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + name));
  document.querySelectorAll('nav.portal-nav button, .bottom-nav button').forEach(b => {
    if (b.dataset.page === name) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  if (name === 'account' && currentMember) renderAccount(currentMember);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
document.querySelectorAll('nav.portal-nav button, .bottom-nav button').forEach(btn => {
  btn.addEventListener('click', () => showPage(btn.dataset.page));
});

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
