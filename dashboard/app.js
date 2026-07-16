// ============================================================
// Merely Mindful — Member Dashboard app logic (simplified launch version)
// Real Supabase auth + data. No hardcoded member data lives here.
// Deliberately stripped down for the initial launch: no yoga/meditation/
// recipe content library, no 6-week Journey — just cycle/pregnancy
// tracking, the 9-Day Portal's daily-unlocking modules, Circle, and
// Account. See /supabase/schema.sql + migration_portal_days.sql.
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
  await loadSteps(member.id);

  const showCircleTab = !!member.circle_enrolled;
  document.getElementById('nav-circle').classList.toggle('hidden', !showCircleTab);
  document.getElementById('nav-circle-mobile').classList.toggle('hidden', !showCircleTab);
  if (showCircleTab) {
    document.getElementById('circle-name').textContent = member.circle === 'birth' ? 'Birth Circle' : 'Womb Circle';
  }

  const showPortalTab = !!member.portal_enrolled;
  document.getElementById('nav-portaldays').classList.toggle('hidden', !showPortalTab);
  document.getElementById('nav-portaldays-mobile').classList.toggle('hidden', !showPortalTab);
  if (showPortalTab) await loadPortalDays();

  // "Your Plan" and "Nourish" show for the same members as Portal Days for
  // now — all part of the 9-Day Portal onboarding. Revisit this gate once
  // other programs also get personalised plans.
  document.getElementById('nav-yourplan').classList.toggle('hidden', !showPortalTab);
  document.getElementById('nav-yourplan-mobile').classList.toggle('hidden', !showPortalTab);
  document.getElementById('nav-nourish').classList.toggle('hidden', !showPortalTab);
  document.getElementById('nav-nourish-mobile').classList.toggle('hidden', !showPortalTab);
  if (showPortalTab) await loadYourPlan(member.id);
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
  const countToggle = document.getElementById('count-toggle');
  const stepsBar = document.getElementById('steps-bar');

  if (member.stage === 'sensitive_care') {
    setRing('care', {});
    document.getElementById('phase-name').textContent = 'We are holding space for you';
    document.getElementById('phase-detail').textContent =
      'There is no need to track anything right now. When you are ready, Oshika would like to speak with you directly.';
    document.getElementById('wheel-caption').classList.add('hidden-count');
    countToggle.classList.add('hidden');
    stepsBar.innerHTML = '<p class="care-quiet">There is nothing on your list right now — that is alright.</p>';
    document.getElementById('affirmation').textContent = '"You are held, exactly as you are, in this moment."';
    return;
  }

  countToggle.classList.remove('hidden');

  if (member.stage === 'pregnant') {
    const { week } = computePregnant(member);
    setRing('pregnant', { week });
    document.getElementById('wheel-eyebrow').textContent = 'Pregnancy Week';
    document.getElementById('wheel-big').textContent = week != null ? `Week ${week}` : 'Add your due date';
    document.getElementById('wheel-small').textContent = week != null ? 'of 40 weeks' : '';
    document.getElementById('phase-name').textContent = week != null ? trimesterName(week) : '—';
    document.getElementById('phase-detail').textContent = week != null
      ? 'Energy and needs shift week to week as your pregnancy progresses.'
      : 'Add a due date in Account so we can personalize this view.';
    document.getElementById('affirmation').textContent = '"I trust my body to grow and carry this life, one day at a time."';
  } else {
    const { cycleDay, cycleLength } = computeTtc(member);
    setRing('ttc', { cycleDay, cycleLength });
    document.getElementById('wheel-eyebrow').textContent = 'Cycle Day';
    document.getElementById('wheel-big').textContent = cycleDay ? `Day ${cycleDay}` : 'Add your last period date';
    document.getElementById('wheel-small').textContent = cycleDay ? `of ${cycleLength}` : '';
    document.getElementById('phase-name').textContent = cycleDay ? phaseName(cycleDay, cycleLength) : '—';
    document.getElementById('phase-detail').textContent = cycleDay
      ? 'Here is where you are in your cycle right now.'
      : 'Add your last period start date in Account so we can personalize this view.';
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

// ---------- PORTAL DAYS (9-Day Conception Portal, daily unlock) ----------
// Single shared cohort start date — update this when a new cohort begins.
// All 9 modules unlock automatically based on today's date vs. this,
// the same for every enrolled member (no per-member progress needed).
const PORTAL_START_DATE = new Date('2026-07-15T00:00:00Z');

function currentPortalDay() {
  const diffDays = Math.floor((new Date() - PORTAL_START_DATE) / 86400000) + 1;
  return Math.max(0, diffDays);
}

async function loadPortalDays() {
  const { data: modules } = await supabase.from('portal_modules').select('*').order('day_number');
  const mods = modules || [];
  const currentDay = currentPortalDay();

  document.getElementById('portal-day-label').textContent =
    currentDay >= 1 && currentDay <= 9 ? `Day ${currentDay} of 9` : (currentDay > 9 ? 'Complete' : 'Starting soon');

  document.getElementById('portal-days-grid').innerHTML = mods.map(m => {
    const unlocked = m.day_number <= currentDay;
    if (unlocked) {
      
      // OVERRIDE: Point Day 1 and Day 2 to your local HTML files
      let linkHref = m.media_url;
      if (m.day_number === 1) linkHref = 'day1.html';
      if (m.day_number === 2) linkHref = 'day2.html';

      return `<div class="tile portal-day unlocked">
        <div class="eyebrow">Day ${m.day_number}</div>
        <h3>${escapeHtml(m.title || ('Day ' + m.day_number))}</h3>
        <div class="meta" style="margin-top:10px;">
          ${linkHref ? `<a class="btn-primary" style="padding:8px 14px;text-decoration:none;display:inline-block;" href="${linkHref}">Open</a>` : '<span style="color:var(--ink-soft);font-size:12px;">Material coming soon</span>'}
          ${m.workbook_url ? `<a class="btn-ghost" style="padding:8px 14px;text-decoration:none;display:inline-block;margin-left:8px;" href="${m.workbook_url}" target="_blank" rel="noopener">Workbook</a>` : ''}
        </div>
      </div>`;
    }
    
    return `<div class="tile portal-day locked">
      <div class="eyebrow">Day ${m.day_number}</div>
      <h3>Locked <span class="lock-icon">🔒</span></h3>
      <div class="meta" style="margin-top:10px;color:var(--ink-faint);font-size:12px;">Unlocks on day ${m.day_number}</div>
    </div>`;
  }).join('') || '<p style="font-size:13px;color:var(--ink-soft);">Add rows to portal_modules in Supabase to populate this.</p>';
}

// ---------- YOUR PLAN (personalised, written by hand — no auto-generation) ----------
// Update this if the intake form's URL ever changes.
const INTAKE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSc0K5LW5VnsFEhjkdU6v3a8QNTAjDk_A5SRMQ2lPnfdQAhskA/viewform';

const PLAN_SECTION_LABELS = {
  diet: 'Diet',
  morning_routine: 'Morning Routine',
  evening_routine: 'Evening Routine',
  womb_detox: 'Womb Detox Plan',
  movement: 'Movement',
  subconscious_reprogramming: 'Subconscious Reprogramming',
  journaling: 'Journalling',
  affirmations: 'Affirmations'
};

async function loadYourPlan(memberId) {
  document.getElementById('plan-form-link').href = INTAKE_FORM_URL;
  document.getElementById('nourish-form-link').href = INTAKE_FORM_URL;
  const { data: plan } = await supabase.from('member_plans').select('*').eq('member_id', memberId).maybeSingle();

  const locked = document.getElementById('plan-locked');
  const content = document.getElementById('plan-content');
  const nourishLocked = document.getElementById('nourish-locked');
  const nourishContent = document.getElementById('nourish-content');

  if (!plan) {
    locked.classList.remove('hidden');
    content.classList.add('hidden');
    nourishLocked.classList.remove('hidden');
    nourishContent.classList.add('hidden');
    return;
  }

  locked.classList.add('hidden');
  content.classList.remove('hidden');

  nourishLocked.classList.add('hidden');
  nourishContent.classList.remove('hidden');
  nourishContent.textContent = plan.recipes || 'No recipe suggestions added yet.';

  document.getElementById('plan-opening').textContent = plan.opening_letter || '';
  document.getElementById('plan-profile').textContent = plan.profile_summary || '';
  document.getElementById('plan-checklist').textContent = plan.daily_checklist || '';
  document.getElementById('plan-closing').textContent = plan.closing_letter || '';

  const sectionsHtml = Object.keys(PLAN_SECTION_LABELS).map((key, i) => {
    const text = plan[key];
    if (!text) return '';
    return `<div class="module${i === 0 ? ' open' : ''}">
      <button class="module-head" data-toggle="module"><div class="dot" style="border:none;">🌿</div>
        <div class="titles"><h3>${PLAN_SECTION_LABELS[key]}</h3></div>
        <span class="chevron">⌄</span></button>
      <div class="module-body"><div class="module-body-inner">${escapeHtml(text)}</div></div>
    </div>`;
  }).join('');
  document.getElementById('plan-sections').innerHTML = sectionsHtml ||
    '<p style="font-size:13px;color:var(--ink-soft);">This plan has no section content yet.</p>';

  document.querySelectorAll('#plan-sections [data-toggle="module"]').forEach(btn => {
    btn.addEventListener('click', () => btn.closest('.module').classList.toggle('open'));
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
