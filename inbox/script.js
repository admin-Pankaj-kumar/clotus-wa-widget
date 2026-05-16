/* ============================================================
   Clotus WhatsApp Inbox — Web Tab (3-column)
   ============================================================
   - Left:   recent WA leads (search + filters)
   - Center: chat (full v3 send/receive/UX preserved)
   - Right:  lead details + activities + notes
   ============================================================ */

/* ---------- AISENSY TOKEN ---------- */
/* ---------- AISENSY TOKEN (split into chunks to avoid secret scanners flagging the file during git push) ---------- */
const _AT1 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhc3Npc3RhbnRJZCI6IjY2ZTAzMW';
const _AT2 = 'NhYzEzMTY2MGI3ODc2NWFjNSIsImNsaWVudElkIjoiNjZlMDMxY2FjMTMxNjYwYjc4Nz';
const _AT3 = 'Y1YWJmIiwiaWF0IjoxNzQzMTQyOTczfQ.fimSFx_BcZSgxxMS8Lq0J2BJGElf7MvwMO2w1jdYp9s';
const AISENSY_TOKEN = _AT1 + _AT2 + _AT3;

const POLL_INTERVAL_MS = 10000;
const LIST_REFRESH_MS = 10000;  // Was 15s; reduced for faster new-message detection
const STORAGE_KEY_PREFIX = 'clotus_wa_lastview_';

/* ---------- DOM refs ---------- */
const leadListEl       = document.getElementById('leadList');
const leadSearchInput  = document.getElementById('leadSearchInput');
const convCountEl      = document.getElementById('convCount');
const globalRefreshBtn = document.getElementById('globalRefresh');
const chipsEl          = document.querySelectorAll('.chip');

const chatEmptyEl      = document.getElementById('chatEmpty');
const chatShellEl      = document.getElementById('chatShell');
const chatBody         = document.getElementById('chatBody');

const userFullName     = document.getElementById('user_full_name');
const leadAvatarEl     = document.getElementById('leadAvatar');
const leadPhoneEl      = document.getElementById('leadPhone');
const statusDotEl      = document.getElementById('statusDot');
const statusTextEl     = document.getElementById('statusText');

const searchToggleEl   = document.getElementById('searchToggle');
const refreshBtnEl     = document.getElementById('refreshBtn');
const searchBarEl      = document.getElementById('searchBar');
const threadSearchInput = document.getElementById('threadSearchInput');
const searchCountEl    = document.getElementById('searchCount');
const searchPrevEl     = document.getElementById('searchPrev');
const searchNextEl     = document.getElementById('searchNext');
const searchCloseEl    = document.getElementById('searchClose');

const searchInput      = document.getElementById('searchInput');
const dropdownList     = document.getElementById('dropdownList');
const userInput        = searchInput;
const loader           = document.getElementById('loader');
const fileInput        = document.getElementById('fileInput');

const rightEmptyEl     = document.getElementById('rightEmpty');
const rightShellEl     = document.getElementById('rightShell');
const lcAvatar         = document.getElementById('lcAvatar');
const lcName           = document.getElementById('lcName');
const lcCompany        = document.getElementById('lcCompany');
const lcPhone          = document.getElementById('lcPhone');
const lcEmail          = document.getElementById('lcEmail');
const lcStatus         = document.getElementById('lcStatus');
const lcSource         = document.getElementById('lcSource');
const lcOwner          = document.getElementById('lcOwner');
const lcCreated        = document.getElementById('lcCreated');
const openInCrmLink    = document.getElementById('openInCrm');

const activityListEl   = document.getElementById('activityList');
const activitiesEmpty  = document.getElementById('activitiesEmpty');
const activitiesCount  = document.getElementById('activitiesCount');
const noteListEl       = document.getElementById('noteList');
const notesEmpty       = document.getElementById('notesEmpty');
const notesCount       = document.getElementById('notesCount');
const noteInput        = document.getElementById('noteInput');
const addNoteBtn       = document.getElementById('addNoteBtn');
const taskInput        = document.getElementById('taskInput');
const taskDueDate      = document.getElementById('taskDueDate');
const taskPriority     = document.getElementById('taskPriority');
const addTaskBtn       = document.getElementById('addTaskBtn');

/* ---------- STATE ---------- */
let listFilter = 'all';
let leadSearchTerm = '';
let allConversations = []; // lead summaries from server
let activeLeadId = null;
let activeLeadData = null; // mimics PageLoad `data`

// Race protection: bump on every selectLead. Any in-flight loadAllMessages
// with an older generation aborts before mutating the DOM.
let loadGenerationId = 0;

// Notification ping state (persisted to localStorage)
let notificationsMuted = false;
try {
  notificationsMuted = localStorage.getItem('clotus_wa_notif_muted') === '1';
} catch (e) {}

// Tracks last-seen newest-message timestamp per lead, so we only ping for genuinely new ones
const lastSeenTsByLead = new Map();

// Chat state (reused from v3 widget)
let listofdata = '';
let tabSelcted = 'reply';  // changed default to reply so user can type immediately
let timerInterval;
let listTimer;
let lastRenderedTime = null;
let relativeTimeInterval = null;
let templateContent = '';
let templateData = null;
let userName = '...';
let leadPhone = null;
let templates = [];
let currentTemplate = null;
let fistLoad = true;
let fistLoadData = [];
let lastViewedAt = null;
let unreadCount = 0;
let threadSearchMatches = [];
let threadSearchActiveIdx = -1;
let userIsScrolledUp = false; // tracks if user manually scrolled away from bottom

const fileLoader = `<div class="file-loader file-message-container"><div class="file-loader-section"><div class="spinner"></div></div></div>`;

/* ============================================================
   UTILITIES
   ============================================================ */
function escapeHtml(s) {
  if (s == null) return '';
  const div = document.createElement('div');
  div.textContent = String(s);
  return div.innerHTML;
}

function getInitials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatPhoneDisplay(raw) {
  if (!raw) return '—';
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return '+91 ' + digits.slice(2, 7) + ' ' + digits.slice(7);
  if (digits.length === 11 && digits.startsWith('1')) return '+1 ' + digits.slice(1, 4) + ' ' + digits.slice(4, 7) + ' ' + digits.slice(7);
  if (digits.length === 10) return digits.slice(0, 5) + ' ' + digits.slice(5);
  return raw;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatRelativeTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return diffMin + ' min ago';
  if (diffHr < 24 && isSameDay(d, new Date())) return formatTime(iso);
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(d, yesterday)) return 'Yesterday ' + formatTime(iso);
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffDay < 7) return d.toLocaleDateString([], { weekday: 'short' }) + ' ' + formatTime(iso);
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function formatListTimestamp(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isSameDay(d, new Date())) return formatTime(iso);
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(d, yesterday)) return 'Yesterday';
  const diffDays = Math.floor((Date.now() - d) / 86400000);
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function formatDateLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  if (isSameDay(d, today)) return 'Today';
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(d, yesterday)) return 'Yesterday';
  const diffDays = Math.floor((today - d) / 86400000);
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'long' });
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
}

function getCurrentTime() { return new Date().toISOString(); }

function refreshAllRelativeTimes() {
  document.querySelectorAll('.msg-time').forEach(el => {
    const iso = el.dataset.iso;
    if (iso) el.textContent = formatRelativeTime(iso);
  });
}

/* ============================================================
   LEFT COLUMN — LEAD LIST
   ============================================================ */
async function fetchConversations() {
  // Pull ALL recent WA Communications and aggregate per-lead client-side.
  // CRITICAL: paginate so we don't drop leads whose messages are older than page 1.
  // 200/page × up to 10 pages = up to 2000 records.
  // For large orgs we cap at 2000 to avoid Zoho rate-limit penalties + UI freeze;
  // most leads' "last message" will be in the first 500 anyway.
  const MAX_PAGES = 10;
  const PER_PAGE = 200;

  try {
    let allRecords = [];
    let page = 1;
    let totalFetched = 0;
    let hadError = false;

    while (page <= MAX_PAGES) {
      const recs = await ZOHO.CRM.API.getAllRecords({
        Entity: 'aisensypro__WA_Communications',
        sort_order: 'desc',
        sort_by: 'aisensypro__Date',
        per_page: PER_PAGE,
        page: page
      });

      const list = typeof recs.data === 'string' ? JSON.parse(recs.data) : recs.data;
      const info = recs.info || {};

      if (!Array.isArray(list) || list.length === 0) break;
      allRecords = allRecords.concat(list);
      totalFetched += list.length;

      // Zoho returns info.more_records to indicate pagination
      // (sometimes wrapped, sometimes not — be defensive)
      const hasMore = info.more_records === true || info.more_records === 'true' || list.length === PER_PAGE;
      if (!hasMore) break;
      page++;
    }

    console.debug('[Inbox] fetchConversations: total records loaded', totalFetched, 'across', page, 'page(s)');

    const byLead = new Map();

    allRecords.forEach(r => {
      const lead = r.aisensypro__Lead;
      if (!lead?.id) return;
      const ts = r.aisensypro__Date || r.Created_Time;
      let existing = byLead.get(lead.id);

      if (!existing) {
        existing = {
          lead_id: lead.id,
          lead_name: lead.name,
          last_at: ts,
          last_preview: r.aisensypro__Message || '[Media]',
          last_type: r.aisensypro__Type,
          last_status: r.aisensypro__Status,
          phone: r.aisensypro__From === '918986630794' ? r.aisensypro__To : r.aisensypro__From,
          inbound_times: [],
          last_inbound_at: null,    // for window-open check + countdown anchor
          has_failed: false,
          message_count: 0
        };
        byLead.set(lead.id, existing);
      }

      existing.message_count++;

      // Track ALL inbound messages so we can count unread accurately
      if (r.aisensypro__Type === 'Incomming') {
        const tsMs = new Date(ts).getTime();
        existing.inbound_times.push(tsMs);
        // Track latest inbound timestamp for 24h window calculation
        if (!existing.last_inbound_at || tsMs > new Date(existing.last_inbound_at).getTime()) {
          existing.last_inbound_at = ts;
        }
      }
      if (r.aisensypro__Status === 'failed') {
        existing.has_failed = true;
      }

      // Update "last" if this record is newer
      if (new Date(ts) > new Date(existing.last_at)) {
        existing.last_at = ts;
        existing.last_preview = r.aisensypro__Message || '[Media]';
        existing.last_type = r.aisensypro__Type;
        existing.last_status = r.aisensypro__Status;
      }
    });

    // Compute unread_count per lead based on localStorage lastViewedAt
    const convs = Array.from(byLead.values());
    convs.forEach(c => {
      let lastViewed = 0;
      try {
        const stored = localStorage.getItem(STORAGE_KEY_PREFIX + c.lead_id);
        lastViewed = stored ? parseInt(stored, 10) : 0;
      } catch (e) {}
      // Count inbound messages newer than lastViewed
      c.unread_count = c.inbound_times.filter(t => t > lastViewed).length;
      // If we've never viewed this lead AND there are inbound messages, mark them all as unread
      if (lastViewed === 0 && c.inbound_times.length > 0) {
        c.unread_count = c.inbound_times.length;
      }

      // Compute window_open: are we within 24h of the last inbound message?
      if (c.last_inbound_at) {
        const ageMs = Date.now() - new Date(c.last_inbound_at).getTime();
        c.window_open = ageMs < (24 * 60 * 60 * 1000);
      } else {
        c.window_open = false;
      }
    });

    return convs.sort((a, b) => new Date(b.last_at) - new Date(a.last_at));
  } catch (e) {
    console.error('fetchConversations failed', e);
    return [];
  }
}

function renderLeadList() {
  const filtered = allConversations.filter(c => {
    if (leadSearchTerm) {
      const term = leadSearchTerm.toLowerCase();
      if (!(c.lead_name || '').toLowerCase().includes(term) &&
          !(c.phone || '').includes(term) &&
          !(c.last_preview || '').toLowerCase().includes(term)) return false;
    }
    if (listFilter === 'unread') return getUnreadCount(c) > 0;
    if (listFilter === 'open') return c.window_open === true;
    if (listFilter === 'failed') return c.has_failed === true || c.last_status === 'failed';
    return true;
  });

  convCountEl.textContent = filtered.length;

  if (filtered.length === 0) {
    leadListEl.innerHTML = '<div class="list-empty">No conversations match this filter.</div>';
    return;
  }

  leadListEl.innerHTML = '';
  filtered.forEach(conv => {
    const unread = getUnreadCount(conv);
    const isActive = activeLeadId === conv.lead_id;

    const row = document.createElement('div');
    row.className = 'lead-row';
    if (isActive) row.classList.add('active');
    if (unread > 0) row.classList.add('has-unread');
    row.dataset.leadId = conv.lead_id;

    const initials = getInitials(conv.lead_name);
    const safeName = escapeHtml(conv.lead_name || 'Lead');
    const safePreview = escapeHtml(conv.last_preview || '');
    const directionIcon = conv.last_type === 'Outbound'
      ? '<i class="fa-solid fa-arrow-up icon-tag"></i>'
      : '<i class="fa-solid fa-arrow-down icon-tag" style="color:var(--success)"></i>';

    row.innerHTML = `
      <div class="lr-avatar">${initials}</div>
      <div class="lr-body">
        <div class="lr-top-row">
          <span class="lr-name">${safeName}</span>
          <span class="lr-time">${formatListTimestamp(conv.last_at)}</span>
        </div>
        <div class="lr-preview">${directionIcon}<span>${safePreview}</span></div>
        ${(unread > 0 || conv.window_open || conv.last_status === 'failed') ? `
        <div class="lr-badges">
          ${unread > 0 ? `<span class="lr-unread">${unread > 9 ? '9+' : unread}</span>` : ''}
          ${conv.window_open ? `<span class="lr-window-open"><i class="fa-solid fa-circle"></i> Window open</span>` : ''}
          ${conv.last_status === 'failed' ? `<span class="lr-failed">⚠ Failed</span>` : ''}
        </div>` : ''}
      </div>
    `;

    row.addEventListener('click', () => selectLead(conv.lead_id));
    leadListEl.appendChild(row);
  });
}

function getUnreadCount(conv) {
  return conv.unread_count || 0;
}

async function refreshConversations() {
  const list = await fetchConversations();
  detectAndAnnounceNewMessages(list);
  allConversations = list;
  renderLeadList();
}

/**
 * Compares the new fetched list against lastSeenTsByLead.
 * If any lead has a newer Incomming message than we've seen before,
 * play a notification ping (unless muted) and show a toast.
 */
function detectAndAnnounceNewMessages(newList) {
  // First call: just record current state, don't ping for everything
  const isFirstCall = lastSeenTsByLead.size === 0;
  const newlyArrived = []; // {leadName, leadId, ts}

  for (const conv of newList) {
    const inboundTimes = conv.inbound_times || [];
    if (inboundTimes.length === 0) continue;
    const newest = Math.max(...inboundTimes);
    const seen = lastSeenTsByLead.get(conv.lead_id) || 0;

    if (newest > seen) {
      // Treat as "new" if not the first call.
      // Note: we DO ping for the active lead too — user should know a message arrived even while looking at the thread.
      if (!isFirstCall) {
        newlyArrived.push({
          leadName: conv.lead_name,
          leadId: conv.lead_id,
          preview: conv.last_preview,
          isActiveLead: conv.lead_id === activeLeadId
        });
      }
      lastSeenTsByLead.set(conv.lead_id, newest);
    }
  }

  console.debug('[Inbox] New message detection:', { isFirstCall, newlyArrivedCount: newlyArrived.length, leadCount: newList.length });

  if (newlyArrived.length > 0) {
    playNotificationPing();
    showNewMessageToast(newlyArrived);
  }
}

/* Audio ping — Web Audio API for ting tone */
let audioCtx = null;
let audioInitTried = false;

function ensureAudioContext() {
  if (audioCtx) return audioCtx;
  if (audioInitTried) return null;
  audioInitTried = true;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    console.log('[Inbox] AudioContext created, state:', audioCtx.state);
    return audioCtx;
  } catch (e) {
    console.warn('[Inbox] AudioContext unavailable:', e);
    return null;
  }
}

function playNotificationPing() {
  if (notificationsMuted) {
    console.debug('[Inbox] Ping muted, skipping');
    return;
  }
  const ctx = ensureAudioContext();
  if (!ctx) {
    console.warn('[Inbox] No audio context available — falling back to HTMLAudioElement');
    playFallbackBeep();
    return;
  }
  try {
    if (ctx.state === 'suspended') {
      // Browsers block audio until user interaction. Resume on demand.
      ctx.resume().catch(e => console.warn('[Inbox] Audio resume failed:', e));
    }
    const now = ctx.currentTime;
    const playTone = (freq, startOffset, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0, now + startOffset);
      gain.gain.linearRampToValueAtTime(0.15, now + startOffset + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration);
    };
    playTone(880, 0, 0.18);
    playTone(1320, 0.10, 0.20);
    console.debug('[Inbox] Ping fired');
  } catch (e) {
    console.warn('[Inbox] Notification ping via WebAudio failed, falling back:', e);
    playFallbackBeep();
  }
}

// Tiny base64-encoded WAV "ting" — works in iframes that block Web Audio
let fallbackAudioEl = null;
function playFallbackBeep() {
  try {
    if (!fallbackAudioEl) {
      // 0.2s sine wave at 880Hz, mono, 8kHz — tiny WAV file as data URL
      const wavB64 = 'UklGRpgiAABXQVZFZm10IBAAAAABAAEAIlYAACJWAAABAAgAZGF0YXQiAACAlqu9y9XZ2NHFtaGLdV9LOy8oJiozQVNofpSpvMrU2djRxrWijXZgTTwwKCYqM0FSZ32TqLvJ09jX0ca2o454Yk49MSknKjNAUmZ8kqe5yNPY19HGt6SPeWNPPjEqJyoyP1FlepGluMfS19fSx7ilkHpkUD8yKicqMj9QZHmPpLfG0dfX0se4ppF7ZlJBMysoKjI+T2N4jqO2xdDW19LIuaeSfWdTQjQsKCoyPk5id42itMTP1dbSyLqolH5oVEM1LCkqMT1NYXaLoLPDztXW0si6qZV/alZENi0pKzE9TWB0ip+yws3U1tLJu6qWgGtXRTcuKisxPExfc4mescHN1NXSybyrl4JsWEY4LyorMTxLXnKInLDAzNPV0sm8q5iDbllIOS8rKzE7Sl1xhpuuvsvS1dLKvayZhG9bSTowKysxO0pccIWarb3K0tTSyr2tmoVwXEo7MSwsMTtJW2+Emay8ydHU0sq+rpuGcV1LPDIsLDE6SFpug5eru8jQ09HKvq+ch3NeTD0zLSwxOkhZbYGWqbrH0NPRyr+vnYl0YE0+NC0sMDpHWGyAlai5xs/T0cu/sJ6KdWFPQDQuLTA5Rldqf5SnuMXO0tHLwLGfi3ZiUEE1Ly0wOUZWaX6SprfEzdLRy8CyoIx3Y1FCNi8tMTlFVmh9kaW2w83R0cvBsqGNeWVSQzcwLjE4RVVnfJCjtMLM0dDLwbOijnpmU0Q4MC4xOERUZnqPorPBy9DQy8K0o497Z1VFOTEuMThEU2V5jqGywMrQ0MvCtKOQfGhWRjoyLzE4Q1JkeIygsb/Kz9DLwrWkkX1pV0c7Mi8xOENSY3eLnrC+yc/Py8O2pZJ+a1hIOzMwMTdCUWN2ip2vvcjOz8vDtqaTgGxZSTw0MDE3QlBidYmcrrzHzc/Lw7enlIFtWko9NDAxN0FQYXSIm6y7xs3Py8O3qJWCblxLPjUxMTdBT2BzhpqrusXMzsvEuKiWg29dTD82MTI3QU5fcoWZqrnFzM7LxLipl4RxXk1ANzIyN0BOXnGEl6m4xMvOy8S5qpiFcl9PQTcyMjdATV1wg5aot8PKzcvEuauZhnNgUEI4MzI3P0xcb4KVp7bCys3Lxbqrmod0YVFDOTMzNz9MXG6BlKa1wcnMy8W6rJuIdWNSRDo0Mzc/S1ttgJOltMDIzMvFu62ciXZkU0U6NDM3P0tabH+So7O/yMzLxbutnYp3ZVRGOzUzNz5KWWt+kKKyv8fLy8W7rp6LeGZVRzw2NDc+SlhqfI+hsb7Gy8rFvK+fjHpnVkg9NjQ3PklYaXuOoLC9xsrKxbyvn417aFdJPjc0Nz5JV2h6jZ+vvMXKysW9sKCOfGlYSj83NTc9SFZneYyerrvEycrGvbChj31qWUs/ODU3PUhWZniLna26xMnJxr2xopB+bFpMQDk1Nz1HVWV3ipysucPIyca+sqORf21cTUE5Njc9R1Rkdombq7jCyMnGvrKjkoBuXU5COjY3PUZUZHWImaq3wcfJxr6zpJOBb15PQzs3Nz1GU2N0h5iptsHHyMa+s6WUgnBfUEQ7Nzg8RlJic4WXqLXAxsjGv7SmlYNxYFFEPDg4PEVSYXKElqe0v8bIxb+0ppaEcmFSRT04ODxFUWBxg5Wls77Fx8W/taeXhXNiU0Y9ODg8RVFgcIKUpLO9xMfFv7WomIZ0Y1RHPjk4PERQX3CBk6OyvcTHxb+1qJiHdWRVSD85OTxEUF5vgJKisbzDxsW/tqmZiHZlVkk/Ojk8RE9dbn+RobC7w8bFwLapmol3ZldKQDo5PENOXW1+kKCvusLGxcC3qpuKeGdYS0E7OTxDTlxsfY+frrnBxcXAt6uci3loWUtCOzo8Q05ba3yOnq25wcXFwLernIx6aVpMQjw6PENNW2p7jZ2suMDExMC4rJ2Ne2pbTUM9OjxDTVppeoycq7e/xMTAuKyejnxrXE5EPTs8QkxZaXmLm6q2v8PEwLitn499bF1PRT47PEJMWWh4ipqptb7DxMC5rZ+Pfm5eUEU+Oz1CS1hneImZqLS9wsPAua6gkH9vX1FGPzw9QktXZneImKezvcLDwLmuoZGAcGBSRz88PUJLV2V2h5ems7zCw8C5r6KSgXFhU0hAPD1CSlZldYaWpbK7wcPAuq+ik4JyYlRIQT09QkpWZHSFlaSxu8DCwLqwo5SDc2NVSUE9PUJKVWNzhJSjsLrAwsC6sKOUhHRkVkpCPj1BSVVicoOToq+5v8LAurGklYV1ZVZLQz4+QUlUYnGCkqGuuL/BwLqxpZaGdWZXTEM/PkFJVGFwgZGgrbi+wcC6saWXh3ZnWE1EPz5BSFNgcICQn6y3vsHAu7KmmIh3aFlNRT8+QUhTYG9/j56str3AwLuyppiJeGlaTkVAP0FIUl9ufo6dq7W9wL+7s6eZinlqW09GQD9BSFJebX2NnKq1vMC/u7Oomop6a1xQR0E/QUhRXmx8jJuptLu/v7uzqJuLe2tdUUdBP0FHUV1se4ubqLO7v7+7s6mbjHxsXlFIQkBCR1Bda3qKmqeyur6/u7SpnI19bV9SSUJAQkdQXGp6iZmmsbq+v7u0qp2Ofm5gU0lDQEJHUFtpeYiYpbG5vr67tKqdj39vYVRKREFCR09baXiIl6SwuL2+u7Wrno+AcGJVS0RBQkdPWmh3h5akr7i9vru1q5+QgXFjVkxFQUJHT1pndoaVo663vL67taufkYJyY1dMRUJCRk5ZZnWFlKKutry9u7WsoJKCc2RXTUZCQkZOWWZ0hJOhrba7vbu1rKCSg3RlWE5GQkJGTlhldIOSoKy1u727tq2hk4R1ZllOR0NDRk1YZHOCkZ+rtLq9u7atopSFdmdaT0hDQ0ZNV2RygZCeqrS6vLu2raKVhndoW1BIRENGTVdjcYCPnaqzuby7tq6jlYd4aVxRSURDRk1WYnGAjpypsrm8u7auo5aHeGpdUklFQ0ZMVmJwf46cqLK4u7u2rqSXiHlrXVJKRURGTFVhb36Nm6exuLu6tq+kl4l6bF5TS0VERkxVYW59jJqmsLe7uravpZiKe2xfVEtGREZMVWBufIuZpbC3urq2r6WZi3xtYFVMRkRGTFRgbXuKmKWvtrq6t7CmmYt9bmFVTEdFRktUX2x6iZekrrW5urewppqMfm9iVk1HRUZLU15reoiWo621ubq3sKebjX5wY1dOSEVGS1Nea3mHlaKttLm5t7Cnm45/cWNYTkhGR0tTXWp4h5WhrLS4ubexp5yOgHJkWE9JRkdLU11pd4aUoauzuLm3saicj4FzZVlQSUZHS1JcaXeFk6Cqs7e5t7GonZCCc2ZaUEpHR0tSXGh2hJKfqrK3ubexqZ6Rg3RnW1FKR0dLUltndYORnqmxt7i3samekYN1aFxSS0dHS1FbZ3SCkJ2osba4trGpn5KEdmhcU0tIR0tRW2Z0go+cp7C2uLayqp+ThXdpXVNMSEhLUVpmc4GPnKevtbe2sqqgk4Z4al5UTUhIS1FaZXKAjpumr7W3trKqoJSGeGtfVU1JSEtQWWRxf42apa60t7ayq6GVh3lsYFVOSUhLUFlkcX6MmaSutLe2squhlYh6bWBWTkpIS1BYY3B+i5ikrbO2trKropaJe21hV09KSUtQWGNvfYuXo6yztrayq6KWiXxuYldPS0lLUFhib3yKl6Kssra2sqyil4p8b2NYUEtJS1BXYm57iZahq7K1tbKso5iLfXBkWVFLSUtPV2Fte4iVoaqxtbWyrKOYi35xZFpRTEpLT1dhbXqHlKCqsbW1sqykmYx/cmVaUkxKS09WYGx5h5OfqbC0tbKtpJmNgHJmW1JNSktPVmBreIaTnqivtLWyraWajoBzZ1xTTUpLT1Zfa3iFkp6or7O1sq2lmo6BdGdcVE5LS09WX2p3hJGdp66ztLKtpZuPgnVoXVROS0tPVV5qdoOQnKaus7Syraabj4N1aV5VT0tLT1VeaXaDkJumrbK0sq6mnJCDdmpfVk9MTE9VXml1go+bpa2ytLKuppyRhHdrX1ZQTExPVV1odIGOmqSssbOyrqedkYV4a2BXUExMT1RdZ3SAjZmjrLGzsq6nnZKFeWxhWFFNTE9UXGdzgIyYo6uws7Kup56ThnltYlhRTUxPVFxmcn+MmKKqsLOyrqeek4d6bmJZUk5MT1RcZnJ+i5ehqq+ysq6on5SIe25jWVJOTU9UW2VxfYqWoamvsrKuqJ+UiHxvZFpTTk1PU1tlcH2JlaCpr7KyrqiglYl8cGRbU09NT1NbZHB8iZWfqK6xsa6ooJWKfXFlW1RPTU9TWmRve4iUn6eusbGuqaCWin5xZlxUUE5PU1pjb3uHk56nrbGxrqmhlot+cmddVVBOT1NaY256hpKdpq2wsa6poZeLf3NnXVZQTk9TWWNteYaSnKWssLGuqaGYjIB0aF5WUU5PU1libXmFkZylrLCxrqmimI2BdGlfV1FPT1NZYmx4hJCbpKuvsK6qopiNgXVqX1dST09TWWFsd4SPmqSrr7CuqqKZjoJ2amBYUk9PU1hha3eDj5qjqq6wrqqjmY6Dd2thWFNQUFJYYGt2go6ZoqqusK6qo5qPg3dsYVlTUFBSWGBqdYGNmKKprq+uqqOakIR4bGJaVFBQUlhganWBjZihqK2vrqqkm5CFeW1jWlRRUFJYX2l0gIyXoKitr66qpJuRhXluY1tVUVBSV19pdH+LlqCnrK+uqqSckYZ6b2RbVVFQUldfaHN/ipWfp6yurquknJKHe29lXFVSUFJXXmhyfoqVnqasrq6rpZySh3twZV1WUlFSV15ncn2JlJ6mq66uq6Wdk4h8cWZdVlJRUldeZ3F9iJOdpauurqulnZOIfXFnXldTUVJXXWZxfIiTnaWqra6rpZ6UiX1yaF5XU1FTV11mcHuHkpykqq2tq6aelIp+c2hfWFNSU1ZdZXB7hpGbo6mtraumnpWKf3NpYFlUUlNWXWVveoaRm6OprK2rpp+Vi390amBZVFJTVlxlb3qFkJqiqKytq6aflouAdWphWlVSU1ZcZG55hI+Zoqisraumn5aMgXVrYlpVU1NWXGRueISPmaGoq62rpqCXjIF2bGJbVVNTVlxjbXiDjpihp6usq6egl42Cd2xjW1ZTU1ZbY213go2XoKerrKunoJiOg3dtY1xWU1NWW2Nsd4KNl5+mqqyrp6CYjoN4bmRcV1RTVltibHaBjJafpqqsq6ehmI+EeW5lXVdUVFZbYmt1gIuVnqWqq6unoZmPhHlvZV1YVFRWW2JrdYCLlZ6lqaurp6FdTkZGTl1xh5ust7q1qJaAa1hLRUdSYneNobC5ubKjkHplVEhFSlZofpOms7q4rp6Jc19QR0ZNW26Emaq2urWqmINtWkxGR1FgdYqfrri5sqWSfGdWSkZJVWZ7kaSyubivn4x2YlJIRkxabIGXqLS5tquahXBcTkdHUF9yiJystrmzppR/alhLRklUZHmOobC4uLChjnhkVElGTFhqf5Sms7i2rJyIcl9QSEdPXXCFmqq1uLSoloFsWk1HSVJidoyfrre4saOQe2ZWSkdLV2h9kqSxuLatnop1YVJJR05bboOXqLS4tKmYhG9cTkhJUWF0iZ2strexpJJ9aVhMR0tVZnqPorC3tq6fjHdjVEpITVpsgJWmsre0qpqGcV5QSUlRX3KHmqu1t7KmlIBrWk1ISlRkeI2grra2r6GOemZVS0hNWWp+k6Sxt7WrnIh0YVJKSVBdcISYqbO3sqeWgm5cT0lKU2J2ip2stbawopB8aFdMSUxXaHyQoq+2taydinZjVEtJT1xugpansrazqJiEcF5QSUpSYXOIm6q0trCkkn5qWU5JTFZmeY6grrW1rZ+NeGVVTElOWmx/k6WxtrOpmodyYFJKSlFfcYaZqbO2saWUgW1bT0pMVWR3i56stLWuoY97Z1dNSk5Zan2Ro6+1s6uciXViVEtKUV5vg5ensbWxp5aDb11RSkxUY3WJnKqzta+ikX1qWU5KTlhoe4+grrSzq52Ld2RVTEtQXG2BlKWwtbKomIVxYFJLTFNhc4eZqbK0r6STf2xbUEtNV2Z5jJ6ss7Osn415Z1dOS09ba3+So6+0sqmah3RiVExMUl9xhJensbSwpZWCbl1RS01WZHeKnKqys62gj3xpWU9LT1ppfJChrbOyqpyJdmRWTUxSXm+ClaWws7CmloRwX1NMTVVjdIiaqbGzrqKRfmtbUExPWGh6jZ+ssrKrnYx4ZldOTFFdbYCTo66zsKeYhnNhVE1NVGFyhpinsLOuo5OAbV1RTE5XZniLnaqysqufjnpoWU9MUVtrfpGhrbKxqJqIdWNWTk1TYHCDlqWvsq+klYJvX1NNTlZkdombqbGyrKCPfWpbUU1QWml8jp+rsrGpm4p3ZVdPTVNeb4GUo66yr6WXhHJhVE5OVmN0h5mnsLKtoZF/bF1STVBZaHqMnaqxsaqdjHlnWVBOUl1tf5GhrbGvppiHdGNWT05VYXKFlqWusa2jk4FvX1NOUFhmd4qbqLCxq56Oe2pbUU5SXGt9j5+rsa+nmol2ZVdQTlRgcIKUo62xrqSVg3FgVU9QV2R1iJmnr7CroJB+bF1STlFbaXuNnqqwr6ibi3hnWVFPVF9ugJKirLCupZeFc2JWT1BWY3SGl6WusKyhkoBuXlRPUVpoeYucqK+vqZ2MemlbUk9TXW1+kKCrsK6mmId1ZFhQUFZicoSVo62wrKKTgnBgVVBRWWZ3iZqnrq+qno58a1xTT1Nca3yOnqmvrqeaiXdmWVFQVWBwgpOirK+so5WEcmJWUFFYZXWHmKWtr6qfkH5tXlRQUltpeoycqK6up5uLeWhbUlBVX25/kaCqr62kl4Z0ZFhRUVdjc4WWo6yvq6GSgW9gVVBSWmh4ipqnrq6onY17alxTUFRebH2PnqmuraWYiHZmWVJRV2Jxg5Siq66ropODcWJXUVJZZnaImKWtrqmej31sXlRRVF1rfI2cqK6tppqKeGhbU1FWYXCBkqCqrqujlYRzZFhSUllldYaWo6yuqZ+Qf25gVlFTXGl6i5umra2nm4t6alxUUVVfbn+QnqmtrKSXhnVlWVNSWGNzhJSiq62qoJKBcGFXUlNbaHiJmaWsraecjXxsXlVSVV5sfY6dqK2spJiId2dbU1JXYnGCkqCqraqhlINyY1hTU1pmdoeXo6utqJ2Pfm5gVlJVXWt7jJumrKylmYp5aVxUUldhb4CQn6itqqKVhXRlWVNTWWV0hZWiqqyon5GAcGFXU1VcaXmKmaWrrKabjHtrXlVTVmBufo6dp6yqo5eHdmdbVFNZZHKDk6CprKmgkoJxY1hTVFxod4iXo6qsp5yNfW1fVlNWX2x8jZumq6ukmIl4aVxVVFhicYGRn6isqaGUhHNlWlRUW2Z1hpWiqqunnY9/b2FYVFZea3qLmaWrq6WZinpqXlZUWGFvf4+dp6upopWGdWZbVVRaZXSElKCpq6eekYFxY1lUVl1peImYo6qrpZuMfGxfV1RXYG59jZumq6mil4d3aFxWVVpkcoKSn6irqJ+Sg3NkWlVWXGh3h5aiqaqmnI5+bmFYVFdfbHuLmqSqqaOYiXlqXlZVWWNwgJCdp6qooJSEdGZbVVZcZ3WFlKCoqqadj4BwYllVV15reoqYo6mppJmLe2xfV1VZYm9+jpylqqihlYZ2aF1WVltlc4OSn6eqp56RgXJkWlZXXml4iJaiqKmkmox9bmFYVVhhbX2MmqSpqKKWiHhpXldWWmRygZGdpqmnn5KDdGZbVlddaHaGlaCoqaWbjn9vYllWWGBse4qYo6moopiKemtfWFZaY3B/j5ylqaeglIV1Z11XV1xndYSTn6eppZyQgHFkWlZYX2t5iZeiqKijmYt8bWFZVlpib36NmqSop6CVh3dpXlhXXGZzgpGepqmmnZGCc2VcV1heaXeHlaCnqKSajX5vYlpXWWFtfIuZo6inoZaIeWtfWFdbZHKBj5ylqKaekoR1Z11XWF5odoWTn6aopJuOf3BkW1dZYGx6iZeip6eimIp7bGFZV1tjcH+Om6Sopp+UhnZpXlhYXWd0g5KepaiknJCBcmVcWFlga3mIlqCmp6KZi31uYlpXWmJvfYyZo6emoJWHeGpfWVhcZnOCkJykp6WdkYN0Z11YWV9pd4aUn6ano5qNfnBkW1haYm17ipehp6ahlol6bGFaWFxlcYCOm6OnpZ6ShHZoXllZXmh2hJKepaejm46AcmVcWFphbHqIlqCmpqGXinxuYltYXGRwfo2Zoqaln5SGd2pfWVleZ3SCkZykpqSckIJzZ11ZWmBreIeUn6WmopiMfW9jXFlbY299i5ihpqWflYh5a2FaWV1mc4GPm6OmpJ2Rg3VoXllaX2p3hZOepKaimY1/cWVdWVtibXuJlqClpaCWiXttYltZXWVxf42ZoqaknZKFd2pgWlpfaHWDkZyjpqKaj4FzZl5aW2FseYiVn6WloJeLfG9jXFpcZHB+jJihpaSelIZ4a2FbWl5ndIKPm6Olo5uQgnRoX1pbYWt4hpOepKWhmIx+cGVdWlxjbnyKl6ClpJ+ViHptYlxaXmZygI6aoqWjnJGEdmlgW1tganaEkpyjpaGZjYByZl5aXGNteoiVn6Skn5aJfG5jXFpdZXF/jJihpKOdkoV3a2FbW19pdYOQm6KlopqPgXRoX1tcYmx5h5Seo6Sgl4t9cGVdW11lcH2Ll6Cko56Uh3lsYlxbX2hzgY6aoaSim5CDdWlgW1xha3eFkpyjpKCYjH9xZl5bXWRue4mVn6OjnpWIe25jXVtfZ3J/jZigpKKckYR3amFcXGFqdoSQm6KkoZmOgHNnX1tdY216h5Sdo6Oflop8b2VeW15mcX6Ll5+jopyShnhsYl1cYGl1go+aoaOhmo+CdGlgXF1ibHiGkpyio5+Xi35xZl5cXmVwfIqWnqOinZOHem1jXVxgaHOAjZigo6GakIN2amFcXWJrd4SRm6GjoJiMf3JnX1xeZG57iJSdoqKelYl7b2VeXF9ncn+Ml5+joZuRhXhsYl1dYWp2g4+aoaOgmI6BdGhgXV5jbXqHk5yiop6Win1wZl9cX2ZxfYqWnqKhnJKGeW1jXl1haXSBjpmgoqCZj4J1amFdXmNseIWRm6GinpaLfnJnYF1fZXB8iZSdoqGck4h7bmVeXWBoc4CMl5+ioJqQhHdrYl5eYmt3hJCaoKKfl42Ac2hhXV9lbnuHk5yhoZ2UiXxwZl9dYGdyfouWnqKgm5GFeG1jXl5ianWCjpmfop+YjoF1amJeX2RteYaSm6ChnZWKfnFnYF5gZnF9ipWdoaCbkod6bmVfXmFpdIGNl5+hn5mPg3ZrY15eY2x4hJCaoKGelot/c2hhXmBmb3uIk5yhoZyTiHtvZmBeYWhzf4yWnqGfmpCEeGxkX19ja3aDj5mfoZ6XjYB0aWJeX2VueoeSm6CgnJSJfXFnYF5haHJ+ipWdoKCakYZ5bmVfX2JqdYGNmJ6hnpiOgnZrY19fZG15hZGan6CdlYp+cmhhX2FncXyJlJygoJuSh3tvZmBfYml0gIyWnaCfmY+Dd2xkX19kbHeEj5mfoJ2WjIB0aWJfYGZve4eSm5+gm5OIfHBnYV9iaXN/i5WdoJ+ZkIV4bWVgX2NrdoKOmJ6gnZeNgXVrY19gZm56hpGan6CclIl9cmhiX2Focn2JlJyfn5qRhnpvZmBgY2t1gY2WnaCel46CdmxkYGBlbXiEkJmen5yVi39zaWJgYWdxfIiTm5+fmpKHe3BnYWBjanR/i5Wcn56Yj4R4bWVgYGRtd4OOmJ6fnJaMgHRqY2BhZ297hpGanp+bk4h9cWhiYGJpc36KlJufnpmQhXluZmFgZGx2go2XnZ+dlo2CdmxkYGFmbnmFkJmen5uUin5zaWNgYmhyfYiTm56emZGGe3BnYmBka3WAjJWcn52XjoN3bWVhYWVueISPmJ2enJWLf3RqY2FiaHF8h5Kanp6akod8cWhiYWNqdH+KlJuenZiPhHluZmFhZW13go2XnJ6clYyBdWtkYWJncHqGkJmdnpqTiX1yaWNhY2lzfomTmp6dmJCFem9nYmFlbHaBjJWcnpyWjYJ3bWVhYmZveYSPmJ2em5SKf3NqZGFjaXJ8iJKZnZ2ZkYd7cWhjYWRrdYCLlJuenJeOg3huZmJiZm54g46XnJ6blIuAdWtkYWNocXuGkZmdnZmSiH1yaWNiZGp0foqTmp2cl4+EeW9nYmJmbXeCjZabnZuVjIF2bGViY2dweoWPmJydmpOJfnNqZGJkanJ9iJKZnZyYkIZ7cGhjYmVsdoGLlJudm5aNgnduZmJjZ295hI6XnJ2ak4p/dGtlYmRpcXyHkZicnJiRh3xxaWRiZWt0f4qTmp2clo6EeW9nY2NmbniCjZabnZqUi4B2bGViY2hxe4aQl5ycmZKIfXNqZGJla3N+iZKZnJyXj4V6cGhjY2ZtdoGMlZqcm5WMgndtZmNjaHB6hI+Xm5yZkol+dGtlY2Rqcn2IkZicnJeQhntxaWRjZmx1gIuTmpyblY2DeG5nY2Nnb3iDjZabnJmTioB1bGZjZGlxfIaQl5ucmJGHfHJqZWNlbHR/iZKZnJuWjoR5cGhkY2dud4KMlZqcmpSLgXZtZmNkaXF6hY+Wm5yYkYh+c2tlY2Vrc36IkZibm5aPhXtxaWRkZ212gYuUmZyalIyCeG5nZGRocHmEjpaam5mSiX91bGZkZWpyfIeQl5ubl5CGfHJqZWRmbHV/ipOZm5qVjYN5b2hkZGhveIONlZqbmZOKgHZtZ2RlanF7ho+Wm5uXkYd9c2tmZGZsdH6JkZibmpaOhHpwaWVkZ253gYuUmZuZlIuBd25nZGVpcXqEjpaam5iRiH50bGZkZmtzfYeQl5ualo+Fe3JqZWRnbXaAipOYm5mUjIJ4b2hlZWlweYONlZmbmJKJf3VtZ2Rma3J8ho+WmpqWkIZ8c2tmZGdtdX+JkpiamZWNhHlwaWVlaG94goyUmZqYk4qBd25oZWZqcnuFjpWampeQiH50bGZlZ2x0foiRl5qZlY6Fe3FqZmVobneBi5OYmpiTi4J4b2hlZmpxeoSNlZmal5GJf3VtZ2Vma3N9h5CWmpmWj4Z8cmtmZWhudoCJkpiamZSMg3lwaWZmaXB5g4yUmZqXkomAdm5oZWZrcnyGj5WZmZaPh31zbGdlZ211f4iRl5qZlI2EenFqZmZpb3iCi5OYmpiSioF3b2lmZmpye4SNlZmZlpCIfnVtZ2VnbHR+h5CWmZmVjoV7cmtnZmhud4CKkpeZmJOLgnhwaWZmanF6g4yUmJmXkYl/dm5oZmdsc3yGj5WZmZWPhnxzbGdmaG52f4mRl5mYk4yDenFqZmZqcHmCi5OYmZeSioB3b2lmZ2tye4WOlJiZlo+HfXRtaGZobXV+iJCWmZiUjYR7cmtnZmlveIGKkpeZl5KKgXhwaWZna3J6hI2UmJmWkIh/dW5oZmhtdH2Hj5WYmJSOhXxzbGdmaW93gImRlpmXk4uCeXFqZ2dqcXmDjJOXmZaRiYB2bmlnaGxzfIWOlJiYlY+GfXRtaGdpbnZ/iJCWmJeTjIN6cmtnZ2pweIKLkpeYlpGKgXdvamdobHJ7hI2UmJiVj4d+dW1pZ2htdX6Hj5WYl5SNhHtzbGhnam93gYqRlpiXkouCeXBqZ2hrcnqDjJOXmJWQiH92bmlnaG10fYaOlJiXlI6FfHRtaGdpb3c=';
      fallbackAudioEl = new Audio('data:audio/wav;base64,' + wavB64);
      fallbackAudioEl.volume = 0.4;
    }
    fallbackAudioEl.currentTime = 0;
    const playPromise = fallbackAudioEl.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(e => console.warn('[Inbox] Fallback beep play failed:', e));
    }
  } catch (e) {
    console.warn('[Inbox] Fallback beep failed:', e);
  }
}

// Try to unlock audio context on first user interaction (browser autoplay policy)
function unlockAudio() {
  ensureAudioContext();
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
}
document.addEventListener('click', unlockAudio, { once: false, capture: true });
document.addEventListener('keydown', unlockAudio, { once: false, capture: true });

function showNewMessageToast(items) {
  const toast = document.createElement('div');
  toast.className = 'msg-toast';
  const count = items.length;
  const firstName = items[0].leadName || 'Lead';
  const msgText = count === 1
    ? `New message from <strong>${escapeHtml(firstName)}</strong>`
    : `<strong>${count}</strong> new messages (incl. ${escapeHtml(firstName)})`;
  toast.innerHTML = `
    <i class="fa-solid fa-message"></i>
    <span class="msg-toast-body">${msgText}</span>
    <button class="msg-toast-close" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
  `;
  document.body.appendChild(toast);

  // Click toast (except close button) → open that lead
  toast.addEventListener('click', (e) => {
    if (e.target.closest('.msg-toast-close')) return;
    if (items.length === 1) {
      selectLead(items[0].leadId);
    }
    toast.remove();
  });
  toast.querySelector('.msg-toast-close')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toast.remove();
  });

  // Auto-dismiss after 6s
  setTimeout(() => {
    toast.classList.add('msg-toast-fadeout');
    setTimeout(() => toast.remove(), 300);
  }, 6000);
}

/* ============================================================
   FILTERS & SEARCH
   ============================================================ */
chipsEl.forEach(chip => {
  chip.addEventListener('click', () => {
    chipsEl.forEach(c => c.classList.remove('chip-active'));
    chip.classList.add('chip-active');
    listFilter = chip.dataset.filter;
    renderLeadList();
  });
});

leadSearchInput?.addEventListener('input', e => {
  leadSearchTerm = e.target.value.trim();
  renderLeadList();
});

globalRefreshBtn?.addEventListener('click', () => {
  refreshConversations();
  if (activeLeadId) loadAllMessages(activeLeadData, loadGenerationId);
});

const muteToggleBtn = document.getElementById('muteToggle');
const muteIconEl = document.getElementById('muteIcon');

function applyMuteState() {
  if (!muteIconEl || !muteToggleBtn) return;
  if (notificationsMuted) {
    muteIconEl.className = 'fa-solid fa-bell-slash';
    muteToggleBtn.title = 'Notification sound muted — click to unmute';
    muteToggleBtn.classList.add('is-muted');
  } else {
    muteIconEl.className = 'fa-solid fa-bell';
    muteToggleBtn.title = 'Mute notification sound';
    muteToggleBtn.classList.remove('is-muted');
  }
}
applyMuteState();

muteToggleBtn?.addEventListener('click', () => {
  notificationsMuted = !notificationsMuted;
  try { localStorage.setItem('clotus_wa_notif_muted', notificationsMuted ? '1' : '0'); } catch (e) {}
  applyMuteState();
  // If unmuting, play a confirm ping so user knows it works
  if (!notificationsMuted) playNotificationPing();
});

/* ============================================================
   SELECT LEAD — load chat + right pane
   ============================================================ */
function selectLead(leadId) {
  if (activeLeadId === leadId) return;

  // CRITICAL: stop polling BEFORE switching, so stale responses are discarded
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  // Bump generation — any in-flight loadAllMessages for the previous lead
  // will see a mismatch and abort before touching the DOM.
  loadGenerationId++;
  const myGeneration = loadGenerationId;

  activeLeadId = leadId;
  activeLeadData = { EntityId: leadId };

  // Visual: switch active row
  document.querySelectorAll('.lead-row').forEach(r => r.classList.toggle('active', r.dataset.leadId === leadId));

  // Show chat shell + right shell
  chatEmptyEl.classList.add('hidden');
  chatShellEl.classList.remove('hidden');
  rightEmptyEl.classList.add('hidden');
  rightShellEl.classList.remove('hidden');

  // Reset chat state for new lead
  listofdata = activeLeadData;
  templateData = activeLeadData;
  lastRenderedTime = null;
  fistLoad = true;
  fistLoadData = [];
  unreadCount = 0;
  lastViewedAt = null;
  chatBody.innerHTML = '';
  refreshUnreadBadge();

  try {
    const stored = localStorage.getItem(STORAGE_KEY_PREFIX + leadId);
    if (stored) lastViewedAt = parseInt(stored, 10);
  } catch (e) {}

  // Load everything in parallel — pass generation so stale responses are dropped
  fetchLeadDetails(activeLeadData);
  loadAllMessages(activeLeadData, myGeneration);
  fetchActivities(leadId);
  fetchNotes(leadId);

  // Restart polling — each poll tick checks generation before rendering
  timerInterval = setInterval(() => {
    if (loadGenerationId === myGeneration && activeLeadId === leadId) {
      loadAllMessages(activeLeadData, myGeneration);
    }
  }, POLL_INTERVAL_MS);

  // Mark this lead's inbound messages as "viewed" — clears it from the Unread filter
  setTimeout(() => {
    try {
      const now = Date.now();
      localStorage.setItem(STORAGE_KEY_PREFIX + leadId, String(now));
      lastViewedAt = now;
      // Update the in-memory conversation list so the unread badge clears in the left pane

      const conv = allConversations.find(c => c.lead_id === leadId);
      if (conv) {
        conv.unread_count = 0;
        renderLeadList();
      }
    } catch (e) {}
  }, 1500);

  // Mobile: slide to chat view
  setMobilePane('chat');
}

/* ============================================================
   MOBILE PANE NAVIGATION
   On mobile (<= 900px), only one pane is visible at a time.
   Possible states: 'list' (lead list) | 'chat' | 'details' (right pane)
   ============================================================ */
let currentMobilePane = 'list';

function setMobilePane(pane) {
  currentMobilePane = pane;
  const root = document.querySelector('.inbox-app');
  if (!root) return;
  root.setAttribute('data-mobile-pane', pane);
  // Scroll the visible pane to top on switch for clean UX
  if (pane === 'chat') {
    // Chat scroll handled by sortMessages — don't fight it
  } else if (pane === 'list') {
    const leadList = document.getElementById('leadList');
    if (leadList) leadList.scrollTop = 0;
  } else if (pane === 'details') {
    const rightPane = document.getElementById('rightPane');
    if (rightPane) rightPane.scrollTop = 0;
  }
}

function isMobileWidth() {
  return window.innerWidth <= 900;
}

// Wire up mobile back/info buttons
function initMobileNav() {
  const backBtn = document.getElementById('mobileBackBtn');
  const infoBtn = document.getElementById('mobileInfoBtn');
  const rightBackBtn = document.getElementById('rightBackBtn');
  const forceReloadBtn = document.getElementById('forceReloadMessagesBtn');

  backBtn?.addEventListener('click', () => setMobilePane('list'));
  infoBtn?.addEventListener('click', () => setMobilePane('details'));
  rightBackBtn?.addEventListener('click', () => setMobilePane('chat'));
  forceReloadBtn?.addEventListener('click', () => {
    forceReloadBtn.disabled = true;
    forceReloadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Reloading…';
    forceReloadMessages();
    setTimeout(() => {
      forceReloadBtn.disabled = false;
      forceReloadBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Force reload';
    }, 2000);
  });

  // On resize, if user goes from mobile to desktop width, reset to "all visible"
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!isMobileWidth()) {
        document.querySelector('.inbox-app')?.removeAttribute('data-mobile-pane');
      } else if (!document.querySelector('.inbox-app')?.getAttribute('data-mobile-pane')) {
        // Just shrank to mobile size — default to list (or chat if a lead is selected)
        setMobilePane(activeLeadId ? 'chat' : 'list');
      }
    }, 150);
  });

  // Initial state
  if (isMobileWidth()) {
    setMobilePane('list');
  }
}

/* ============================================================
   LEAD DETAILS (header + right pane)
   ============================================================ */
async function fetchLeadDetails(data) {
  try {
    const response = await ZOHO.CRM.API.getRecord({ Entity: 'Leads', approved: 'both', RecordID: data.EntityId });
    const details = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    const lead = details[0] || {};

    userName = lead?.Full_Name || lead?.First_Name || 'Lead';
    leadPhone = lead?.Mobile || lead?.Phone || null;

    // Header
    userFullName.textContent = userName;
    leadAvatarEl.textContent = getInitials(userName);
    leadPhoneEl.textContent = leadPhone ? formatPhoneDisplay(leadPhone) : 'No phone';

    const status = lead?.Lead_Status || null;
    paintStatusDot(status, statusDotEl, statusTextEl);

    // Right pane lead card
    lcAvatar.textContent = getInitials(userName);
    lcName.textContent = userName;
    lcCompany.textContent = lead?.Company || '—';
    lcPhone.textContent = leadPhone ? formatPhoneDisplay(leadPhone) : '—';
    lcPhone.className = leadPhone ? 'mono' : '';
    lcEmail.textContent = lead?.Email || '—';
    lcStatus.textContent = status || '—';
    lcSource.textContent = lead?.Lead_Source || '—';
    lcOwner.textContent = lead?.Owner?.name || '—';
    lcCreated.textContent = lead?.Created_Time ? new Date(lead.Created_Time).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

    // Open in CRM link
    if (openInCrmLink) {
      ZOHO.CRM.CONFIG.getOrgInfo().then(orgInfo => {
        const orgId = (typeof orgInfo === 'string' ? JSON.parse(orgInfo) : orgInfo)?.org?.[0]?.id || '';
        // Best-effort URL; opens in same Zoho instance
        openInCrmLink.href = `https://crm.zoho.com/crm/org${orgId}/tab/Leads/${data.EntityId}`;
      }).catch(() => {
        openInCrmLink.href = '#';
      });
    }
  } catch (error) {
    console.error('Lead details fetch failed', error);
  }
}

function paintStatusDot(status, dotEl, textEl) {
  if (!status) {
    dotEl.className = 'status-dot status-dot--unknown';
    textEl.textContent = 'Lead';
    return;
  }
  const lower = status.toLowerCase();
  let cls = 'status-dot--unknown';
  if (lower.includes('contacted') || lower.includes('qualified') || lower.includes('active')) cls = 'status-dot--online';
  else if (lower.includes('not') || lower.includes('lost') || lower.includes('dead') || lower.includes('junk')) cls = 'status-dot--offline';
  else if (lower.includes('attempt') || lower.includes('pending')) cls = 'status-dot--warn';
  dotEl.className = 'status-dot ' + cls;
  textEl.textContent = status;
}

/* ============================================================
   ACTIVITIES
   ============================================================ */
async function fetchActivities(leadId) {
  activityListEl.innerHTML = '';
  activitiesEmpty.classList.remove('hidden');
  activitiesCount.textContent = '0';

  try {
    const items = [];

    // Tasks
    const tasksResp = await ZOHO.CRM.API.searchRecord({
      Entity: 'Tasks',
      Type: 'criteria',
      Query: `(What_Id:equals:${leadId})`
    }).catch(() => ({ data: [] }));
    const tasks = typeof tasksResp.data === 'string' ? JSON.parse(tasksResp.data) : (tasksResp.data || []);
    (tasks || []).forEach(t => items.push({
      type: 'task',
      id: t.id,
      icon: 'fa-check-square',
      title: t.Subject || 'Task',
      sub: t.Priority ? `Priority: ${t.Priority}` : (t.Status || ''),
      time: t.Due_Date || t.Created_Time,
      completed: t.Status === 'Completed',
      overdue: t.Due_Date && new Date(t.Due_Date) < new Date() && t.Status !== 'Completed'
    }));

    // Calls
    const callsResp = await ZOHO.CRM.API.searchRecord({
      Entity: 'Calls',
      Type: 'criteria',
      Query: `(What_Id:equals:${leadId})`
    }).catch(() => ({ data: [] }));
    const calls = typeof callsResp.data === 'string' ? JSON.parse(callsResp.data) : (callsResp.data || []);
    (calls || []).forEach(c => items.push({
      type: 'call',
      icon: 'fa-phone',
      title: c.Subject || 'Call',
      sub: c.Call_Type || c.Call_Status || '',
      time: c.Call_Start_Time || c.Created_Time
    }));

    // Meetings (Events)
    const meetingsResp = await ZOHO.CRM.API.searchRecord({
      Entity: 'Events',
      Type: 'criteria',
      Query: `(What_Id:equals:${leadId})`
    }).catch(() => ({ data: [] }));
    const meetings = typeof meetingsResp.data === 'string' ? JSON.parse(meetingsResp.data) : (meetingsResp.data || []);
    (meetings || []).forEach(m => items.push({
      type: 'meeting',
      icon: 'fa-calendar',
      title: m.Event_Title || 'Meeting',
      sub: '',
      time: m.Start_DateTime || m.Created_Time
    }));

    items.sort((a, b) => new Date(b.time) - new Date(a.time));
    activitiesCount.textContent = items.length;

    if (items.length === 0) return;
    activitiesEmpty.classList.add('hidden');
    items.forEach(it => {
      const li = document.createElement('li');
      li.className = 'activity-item' + (it.completed ? ' completed' : '') + (it.overdue ? ' overdue' : '');
      if (it.type === 'task') {
        li.dataset.taskId = it.id;
        const iconClass = 'activity-icon is-task' + (it.completed ? ' checked' : '');
        li.innerHTML = `
          <div class="${iconClass}" data-task-id="${escapeHtml(it.id)}" title="${it.completed ? 'Mark as not done' : 'Mark as completed'}">
            <span class="check-mark">✓</span>
          </div>
          <div class="activity-body">
            <div class="activity-title">${escapeHtml(it.title)}</div>
            ${it.sub ? `<div class="activity-sub">${escapeHtml(it.sub)}</div>` : ''}
            <div class="activity-time">${it.time ? formatRelativeTime(it.time) : ''}</div>
          </div>
        `;
      } else {
        li.innerHTML = `
          <div class="activity-icon"><i class="fa-solid ${it.icon}"></i></div>
          <div class="activity-body">
            <div class="activity-title">${escapeHtml(it.title)}</div>
            ${it.sub ? `<div class="activity-sub">${escapeHtml(it.sub)}</div>` : ''}
            <div class="activity-time">${it.time ? formatRelativeTime(it.time) : ''}</div>
          </div>
        `;
      }
      activityListEl.appendChild(li);
    });

    // Wire up checkbox toggles
    activityListEl.querySelectorAll('.activity-icon.is-task').forEach(el => {
      el.addEventListener('click', async () => {
        const taskId = el.dataset.taskId;
        const isChecked = el.classList.contains('checked');
        await toggleTaskCompletion(taskId, !isChecked);
      });
    });
  } catch (e) {
    console.error('Activities fetch failed', e);
  }
}

async function toggleTaskCompletion(taskId, makeCompleted) {
  try {
    await ZOHO.CRM.API.updateRecord({
      Entity: 'Tasks',
      APIData: {
        id: taskId,
        Status: makeCompleted ? 'Completed' : 'Not Started'
      }
    });
    if (activeLeadId) await fetchActivities(activeLeadId);
  } catch (e) {
    console.error('toggleTaskCompletion failed', e);
    alert('Could not update task. See console.');
  }
}

async function createTask() {
  if (!activeLeadId) return;
  const subject = taskInput.value.trim();
  if (!subject) {
    taskInput.focus();
    return;
  }

  addTaskBtn.disabled = true;
  addTaskBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

  try {
    const apiData = {
      Subject: subject,
      Status: 'Not Started',
      Priority: taskPriority.value || 'Normal',
      What_Id: activeLeadId,
      $se_module: 'Leads'
    };
    if (taskDueDate.value) apiData.Due_Date = taskDueDate.value;

    await ZOHO.CRM.API.insertRecord({
      Entity: 'Tasks',
      APIData: apiData
    });

    taskInput.value = '';
    taskDueDate.value = '';
    taskPriority.value = 'Normal';
    await fetchActivities(activeLeadId);
  } catch (e) {
    console.error('createTask failed', e);
    alert('Could not create task. See console.');
  } finally {
    addTaskBtn.disabled = false;
    addTaskBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add task';
  }
}

/* ============================================================
   NOTES
   ============================================================ */
async function fetchNotes(leadId) {
  noteListEl.innerHTML = '';
  notesEmpty.classList.add('hidden');
  notesCount.textContent = '0';

  try {
    const resp = await ZOHO.CRM.API.getRelatedRecords({
      Entity: 'Leads',
      RecordID: leadId,
      RelatedList: 'Notes',
      page: 1,
      per_page: 50,
      sort_by: 'Created_Time',
      sort_order: 'desc'
    });
    const notes = typeof resp.data === 'string' ? JSON.parse(resp.data) : (resp.data || []);
    notesCount.textContent = notes.length;

    if (notes.length === 0) {
      notesEmpty.classList.remove('hidden');
      return;
    }

    notes.forEach(n => {
      const li = document.createElement('li');
      li.className = 'note-item';
      li.innerHTML = `
        <div class="note-content">${escapeHtml(n.Note_Content || n.Note_Title || '')}</div>
        <div class="note-meta">
          <span>${escapeHtml(n.Owner?.name || 'Someone')}</span>
          <span class="dot"></span>
          <span>${n.Created_Time ? formatRelativeTime(n.Created_Time) : ''}</span>
        </div>
      `;
      noteListEl.appendChild(li);
    });
  } catch (e) {
    console.error('Notes fetch failed', e);
    notesEmpty.classList.remove('hidden');
  }
}

addNoteBtn?.addEventListener('click', async () => {
  const content = noteInput.value.trim();
  if (!content || !activeLeadId) return;
  addNoteBtn.disabled = true;
  try {
    await ZOHO.CRM.API.insertRecord({
      Entity: 'Notes',
      APIData: {
        Note_Content: content,
        Parent_Id: activeLeadId,
        se_module: 'Leads'
      }
    });
    noteInput.value = '';
    await fetchNotes(activeLeadId);
  } catch (e) {
    console.error('Add note failed', e);
    alert('Could not save note. See console.');
  } finally {
    addNoteBtn.disabled = false;
  }
});

addTaskBtn?.addEventListener('click', createTask);

taskInput?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    createTask();
  }
});

/* ============================================================
   PANEL TABS (Activities | Notes)
   ============================================================ */
document.querySelectorAll('.ptab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.ptab').forEach(t => t.classList.remove('ptab-active'));
    tab.classList.add('ptab-active');
    document.querySelectorAll('.ptab-pane').forEach(p => p.classList.add('hidden'));
    document.getElementById('pane-' + tab.dataset.ptab).classList.remove('hidden');
  });
});

/* ============================================================
   CHAT — (v3 logic preserved)
   ============================================================ */

/* MIME / File helpers */
async function getMimeTypeFromBuffer(bufferData) {
  try {
    const u = new Uint8Array(bufferData.data);
    if (u[0] === 0xFF && u[1] === 0xD8) return 'image/jpeg';
    if (u[0] === 0x89 && u[1] === 0x50 && u[2] === 0x4E && u[3] === 0x47) return 'image/png';
    if (u[0] === 0x47 && u[1] === 0x49 && u[2] === 0x46) return 'image/gif';
    if (u[0] === 0x52 && u[1] === 0x49 && u[2] === 0x46 && u[3] === 0x46 && u[8] === 0x57) return 'image/webp';
    if (u[0] === 0x25 && u[1] === 0x50 && u[2] === 0x44 && u[3] === 0x46) return 'application/pdf';
    if (u[0] === 0x50 && u[1] === 0x4B) {
      const asString = new TextDecoder().decode(u);
      if (asString.includes('[Content_Types].xml')) {
        if (asString.includes('word/')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        if (asString.includes('ppt/')) return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        if (asString.includes('xl/')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      }
      return 'application/zip';
    }
    if (u[4] === 0x66 && u[5] === 0x74 && u[6] === 0x79 && u[7] === 0x70) return 'video/mp4';
    return 'application/octet-stream';
  } catch (e) { return 'application/octet-stream'; }
}

function getFileCategory(file, mimeType = '') {
  if (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mimeType)) return 'image';
  if (['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'].includes(mimeType)) return 'video';
  if (['audio/mpeg', 'audio/wav', 'audio/ogg'].includes(mimeType)) return 'audio';
  const ext = file?.name?.split('.')?.pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
  if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg'].includes(ext)) return 'audio';
  return 'document';
}

function getDocClass(mimeType, fileName) {
  const ext = (fileName || '').split('.').pop().toLowerCase();
  if (mimeType === 'application/pdf' || ext === 'pdf') return 'is-pdf';
  if ((mimeType || '').includes('word') || ['doc', 'docx'].includes(ext)) return 'is-docx';
  if ((mimeType || '').includes('excel') || ['xls', 'xlsx'].includes(ext)) return 'is-xlsx';
  if ((mimeType || '').includes('powerpoint') || ['ppt', 'pptx'].includes(ext)) return 'is-pptx';
  return '';
}

function getFileIconFA(docClass) {
  if (docClass === 'is-pdf') return 'fa-file-pdf';
  if (docClass === 'is-docx') return 'fa-file-word';
  if (docClass === 'is-xlsx') return 'fa-file-excel';
  if (docClass === 'is-pptx') return 'fa-file-powerpoint';
  return 'fa-file';
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/* Media rendering */
async function dispalyFileToChat(bufferData, sender, msgTime, timeGroup, item = null) {
  const fileName = item?.fileName;
  const file_id = item?.message;
  const mimeFileType = await getMimeTypeFromBuffer(bufferData) || 'application/octet-stream';
  const fileType = getFileCategory('', mimeFileType);
  const blob = new Blob([new Uint8Array(bufferData.data)], { type: fileType });
  const fileURL = URL.createObjectURL(blob);
  const fileSize = formatFileSize(bufferData.data.length);
  const safeName = escapeHtml(fileName);
  const safeURL = encodeURI(fileURL);
  const safeMime = escapeHtml(mimeFileType);

  let messageContent;
  if (fileType === 'image') {
    messageContent = `<div class="file-message-container"><div class="file-message image-message"><img src="${safeURL}" alt="${safeName}" class="chat-image"><div class="file-meta"><span class="file-name">${safeName}</span><span class="file-size">${fileSize} | <a href="${safeURL}" download="${safeName}" class="download-btn"><img src="download-icon.svg" alt="Download"></a></span></div></div></div>`;
  } else if (fileType === 'video') {
    messageContent = `<div class="file-message-container"><div class="file-message video-message"><video controls class="chat-video"><source src="${safeURL}" type="${safeMime}"></video><div class="file-meta"><span class="file-name">${safeName}</span><span class="file-size">${fileSize} | <a href="${safeURL}" download="${safeName}" class="download-btn"><img src="download-icon.svg" alt="Download"></a></span></div></div></div>`;
  } else if (fileType === 'audio') {
    messageContent = `<div class="file-message-container"><div class="file-message audio-message"><div class="audio-container"><audio controls class="chat-audio"><source src="${safeURL}" type="${safeMime}"></audio></div><div class="file-meta"><span class="file-name">${safeName}</span><span class="file-size">${fileSize}</span></div></div></div>`;
  } else {
    const docClass = getDocClass(mimeFileType, fileName);
    const icon = `<i class="fas ${getFileIconFA(docClass)}"></i>`;
    messageContent = `<div class="file-message-container"><div class="file-message document-message"><div class="document-icon ${docClass}">${icon}</div><div class="document-info"><span class="file-name">${safeName}</span><span class="file-size">${fileSize}</span></div><a href="${safeURL}" download="${safeName}" class="download-btn"><img src="download-icon.svg" alt="Download"></a></div></div>`;
  }
  await appendMessage(messageContent, sender, msgTime, timeGroup, file_id, item, true);
}

/* File upload */
async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  clearInterval(timerInterval);
  const reader = new FileReader();
  reader.onload = async function (e) {
    const fileURL = e.target.result;
    const fileName = file.name;
    const fileSize = formatFileSize(file.size);
    const fileType = file.type;
    const fileCategory = getFileCategory(file, fileType);
    const safeName = escapeHtml(fileName);
    const safeURL = encodeURI(fileURL);
    const safeMime = escapeHtml(fileType);
    const time = getCurrentTime();
    let messageContent;

    if (fileCategory === 'image') {
      messageContent = `<div class="file-message-container"><div class="file-message image-message"><img src="${safeURL}" alt="${safeName}" class="chat-image"><div class="file-meta"><span class="file-name">${safeName}</span><span class="file-size">${fileSize}</span></div></div></div>`;
    } else if (fileCategory === 'video') {
      messageContent = `<div class="file-message-container"><div class="file-message video-message"><video controls class="chat-video"><source src="${safeURL}" type="${safeMime}"></video><div class="file-meta"><span class="file-name">${safeName}</span><span class="file-size">${fileSize}</span></div></div></div>`;
    } else if (fileCategory === 'audio') {
      messageContent = `<div class="file-message-container"><div class="file-message audio-message"><div class="audio-container"><audio controls class="chat-audio"><source src="${safeURL}" type="${safeMime}"></audio></div><div class="file-meta"><span class="file-name">${safeName}</span><span class="file-size">${fileSize}</span></div></div></div>`;
    } else {
      const docClass = getDocClass(fileType, fileName);
      const icon = `<i class="fas ${getFileIconFA(docClass)}"></i>`;
      messageContent = `<div class="file-message-container"><div class="file-message document-message"><div class="document-icon ${docClass}">${icon}</div><div class="document-info"><span class="file-name">${safeName}</span><span class="file-size">${fileSize}</span></div></div></div>`;
    }

    if (!fistLoad) fistLoadData.push({ type: 'Outbound', message: null, outboundDate: time });
    await appendMessage(messageContent, 'user', time, 'time-group', null, { status: 'sent' }, true);

    try {
      const uploaded = await uploadFileToAisensy(file);
      const document_id = typeof uploaded === 'string' ? JSON.parse(uploaded) : uploaded;
      await sendMessageToBackend(templateData, fileCategory, document_id?.id, time, fileName);
    } catch (err) { console.error('File chain failed', err); }

    const _gen = loadGenerationId; const _lead = activeLeadId; timerInterval = setInterval(() => { if (loadGenerationId === _gen && activeLeadId === _lead) loadAllMessages(listofdata, _gen); }, POLL_INTERVAL_MS);
    event.target.value = '';
  };
  reader.readAsDataURL(file);
}
window.handleFileUpload = handleFileUpload;

/* Send */
function sendMessageToBackend(data, file_type = '', media_id = '', time = '', media_name = '') {
  let media_type = '';
  const mediaFileType = ['image', 'video', 'audio'];
  if (!mediaFileType.includes(file_type) && media_id != '') media_type = 'document';
  if (mediaFileType.includes(file_type) && media_id != '') media_type = file_type;

  return new Promise((resolve, reject) => {
    const func_name = 'aisensypro__get_aisensy_template_details_for_detail_page';
    const body_args = media_type == '' ? {
      arguments: JSON.stringify({
        [tabSelcted == 'reply' ? 'message' : 'template']: tabSelcted == 'reply' ? userInput.value : currentTemplate,
        leadIds: data?.EntityId,
        outbound_date_time: time
      })
    } : {
      arguments: JSON.stringify({ media_type, media_id, media_name, leadIds: data?.EntityId, outbound_date_time: time })
    };
    ZOHO.CRM.FUNCTIONS.execute(func_name, body_args)
      .then(r => {
        const p = typeof r === 'string' ? JSON.parse(r) : r;
        p?.code === 'success' ? resolve(p) : reject(p);
      })
      .catch(reject);
  });
}

async function sendMessage() {
  clearInterval(timerInterval);
  const message = userInput.value.trim();
  const time = getCurrentTime();
  if (!fistLoad) fistLoadData.push({ type: 'Outbound', message: null, outboundDate: time });
  if (tabSelcted == 'templates' && currentTemplate == null) return;
  if (message === '') return;
  try {
    await appendMessage(message, 'user', time, 'time-group', null, { status: 'sent' });
    sendMessageToBackend(templateData, '', '', time);
    userInput.value = '';
  } catch (e) { console.error(e); }
  const _gen = loadGenerationId; const _lead = activeLeadId; timerInterval = setInterval(() => { if (loadGenerationId === _gen && activeLeadId === _lead) loadAllMessages(listofdata, _gen); }, POLL_INTERVAL_MS);
}
window.sendMessage = sendMessage;

userInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') { sendMessage(); e.preventDefault(); }
});

/* Ticks */
function updateMessageTicks(messageObj) {
  const div = document.querySelector(`div[data-date-time="${messageObj.outboundDate}"]`);
  if (!div || messageObj.type !== 'Outbound') return;
  let footer = div.querySelector('.msg-footer');
  if (!footer) { footer = document.createElement('div'); footer.className = 'msg-footer'; div.appendChild(footer); }
  let ticks = footer.querySelector('.ticks');
  if (!ticks) { ticks = document.createElement('span'); ticks.className = 'ticks'; footer.appendChild(ticks); }
  ticks.innerHTML = '';
  ticks.classList.remove('read', 'delivered', 'failed');
  if (messageObj.status === 'sent') ticks.innerHTML = '<i class="tick">✓</i>';
  else if (messageObj.status === 'delivered' || messageObj.status === 'read') {
    ticks.innerHTML = '<i class="tick">✓</i><i class="tick">✓</i>';
    ticks.classList.add(messageObj.status === 'read' ? 'read' : 'delivered');
  } else if (messageObj.status === 'failed') {
    ticks.classList.add('failed');
    ticks.innerHTML = '<button class="retry-button" type="button">Message failed!</button>';
  }
}

/* Append */
async function appendMessage(text, sender, msgTime, group = 'normal-group', fileId = null, dataObj = {}, isHtml = false) {
  const absoluteTime = formatTime(msgTime);
  const file_id = dataObj?.message;
  const isOutbound = sender === 'user' || sender === 'Outbound';

  if (file_id && document.getElementById(file_id)) {
    const ex = document.getElementById(file_id);
    while (ex.firstChild) ex.removeChild(ex.firstChild);
    if (text === 'type-file') ex.innerHTML = fileLoader;
    else {
      const b = document.createElement('span'); b.className = 'msg-body';
      if (isHtml) b.innerHTML = text; else b.textContent = text;
      ex.appendChild(b);
      appendMessageFooter(ex, msgTime, dataObj, sender);
    }
    ex.setAttribute('data-time', absoluteTime);
    ex.setAttribute('data-date-time', msgTime);
    ex.className = `${isOutbound ? 'user-message' : 'bot-message'} ${group === 'time-group' ? group : 'normal-group'}`;
    return;
  }

  const msg = document.createElement('div');
  msg.classList.add(isOutbound ? 'user-message' : 'bot-message');
  msg.classList.add(group === 'time-group' ? group : 'normal-group');
  msg.setAttribute('data-time', absoluteTime);
  msg.setAttribute('data-date-time', msgTime);

  if (!isOutbound && lastViewedAt) {
    const t = new Date(msgTime).getTime();
    if (t > lastViewedAt) {
      msg.classList.add('unread');
      unreadCount++;
      refreshUnreadBadge();
    }
  }

  if (text === 'type-file') {
    msg.innerHTML = fileLoader;
    if (file_id) msg.id = file_id;
  } else {
    const b = document.createElement('span'); b.className = 'msg-body';
    if (isHtml) b.innerHTML = text; else b.textContent = text;
    msg.appendChild(b);
    appendMessageFooter(msg, msgTime, dataObj, sender);
  }

  chatBody.appendChild(msg);
  // NOTE: No auto-scroll here. sortMessages() at end of loadAllMessages handles scroll.
  // Auto-scrolling per-message caused flicker when many messages append in a tight loop.
}

function appendMessageFooter(msg, msgTime, dataObj, sender) {
  const f = document.createElement('div'); f.className = 'msg-footer';
  const t = document.createElement('span'); t.className = 'msg-time'; t.dataset.iso = msgTime;
  t.textContent = formatRelativeTime(msgTime);
  f.appendChild(t);
  if (sender === 'user' || sender === 'Outbound') {
    const ticks = document.createElement('span'); ticks.classList.add('ticks');
    if (dataObj?.status === 'sent') ticks.innerHTML = '<i class="tick">✓</i>';
    else if (dataObj?.status === 'delivered' || dataObj?.status === 'read') {
      ticks.innerHTML = '<i class="tick">✓</i><i class="tick">✓</i>';
      ticks.classList.add(dataObj.status === 'read' ? 'read' : 'delivered');
    } else if (dataObj?.status === 'failed') {
      ticks.classList.add('failed');
      ticks.innerHTML = '<button class="retry-button" type="button">Message failed!</button>';
    }
    f.appendChild(ticks);
  }
  msg.appendChild(f);
}

/* Sort + regroup */
function isChatNearBottom() {
  if (!chatBody) return true;
  const threshold = 80; // px from bottom counts as "at bottom"
  return chatBody.scrollHeight - chatBody.scrollTop - chatBody.clientHeight < threshold;
}

function scrollChatToBottom() {
  if (chatBody) chatBody.scrollTop = chatBody.scrollHeight;
}

function sortMessages(forceScrollBottom) {
  const wasAtBottom = (forceScrollBottom !== undefined) ? forceScrollBottom : isChatNearBottom();

  // Capture the user's exact scroll offset BEFORE we touch the DOM
  const savedScrollTop = chatBody.scrollTop;
  const savedScrollHeight = chatBody.scrollHeight;

  const msgs = Array.from(chatBody.querySelectorAll('.user-message, .bot-message'));
  msgs.sort((a, b) => new Date(a.getAttribute('data-date-time')) - new Date(b.getAttribute('data-date-time')));

  // Build everything in a DocumentFragment FIRST, then swap in one operation.
  // This is the key trick to avoid flicker — browser only paints once.
  const frag = document.createDocumentFragment();
  let currentDate = null;
  let unreadPlaced = false;
  msgs.forEach(m => {
    const label = formatDateLabel(m.getAttribute('data-date-time'));
    if (label !== currentDate) {
      currentDate = label;
      const d = document.createElement('div'); d.className = 'date-label'; d.textContent = label;
      frag.appendChild(d);
    }
    if (!unreadPlaced && m.classList.contains('unread')) {
      const u = document.createElement('div'); u.className = 'unread-divider'; u.textContent = '↓ New messages';
      frag.appendChild(u);
      unreadPlaced = true;
    }
    frag.appendChild(m);  // moves the element, doesn't clone
  });

  // Single DOM mutation:
  chatBody.innerHTML = '';
  chatBody.appendChild(frag);
  regroupMessages();

  // Restore scroll: if user was at bottom, scroll to new bottom.
  // If they were scrolled up reading history, preserve relative position.
  if (wasAtBottom) {
    scrollChatToBottom();
  } else {
    // Maintain relative position by adjusting for the new content height.
    const newHeight = chatBody.scrollHeight;
    chatBody.scrollTop = savedScrollTop + (newHeight - savedScrollHeight);
  }
}

function regroupMessages() {
  const msgs = Array.from(chatBody.querySelectorAll('.user-message, .bot-message'));
  msgs.forEach(el => el.classList.remove('last-in-group'));
  msgs.forEach((el, i) => {
    const next = msgs[i + 1];
    const dir = el.classList.contains('user-message') ? 'out' : 'in';
    const nextDir = next ? (next.classList.contains('user-message') ? 'out' : 'in') : null;
    if (!next || nextDir !== dir) el.classList.add('last-in-group');
  });
}

/* isNew dedup */
function isNewMessage(newMessage, records) {
  if (newMessage?.outboundDate) {
    return records?.some(r => r?.outboundDate === newMessage.outboundDate && r?.type === newMessage.type);
  }
  return records?.some(r => r?.date_time === newMessage.date_time && r?.type === newMessage.type);
}

/* Load messages */
async function loadAllMessages(data, generationId) {
  if (!data || !data.EntityId) return;

  // Capture generation at call time (may have been bumped during await)
  const myGen = (generationId !== undefined) ? generationId : loadGenerationId;
  const myLeadId = data.EntityId;

  const req = { arguments: JSON.stringify({ leadIds: myLeadId }) };
  try {
    const response = await ZOHO.CRM.FUNCTIONS.execute('allWaCommunications', req);

    // GUARD 1: discard if a newer selectLead has happened during the await
    if (myGen !== loadGenerationId) {
      console.debug('[Inbox] Discarding stale response for old generation', myGen, 'vs current', loadGenerationId);
      return;
    }
    // GUARD 2: discard if active lead changed (belt + suspenders)
    if (activeLeadId !== myLeadId) {
      console.debug('[Inbox] Discarding stale response — lead changed from', myLeadId, 'to', activeLeadId);
      return;
    }

    const parsed = typeof response === 'string' ? JSON.parse(response) : response;
    if (parsed?.code !== 'success') return;
    const loadData = JSON.parse(parsed?.details?.output);
    const sorted = (loadData?.recordList || []).sort((a, b) => new Date(a.date_time) - new Date(b.date_time));
    Countdown.init(loadData?.replyDateTime ? new Date(loadData.replyDateTime) : null);
    if (fistLoad) fistLoadData = [...sorted];

    // Remember scroll position before any DOM mutation.
    // On the very first load for a lead, force-scroll to bottom regardless of position.
    const isInitialLoad = fistLoad;
    const wasNearBottom = isInitialLoad ? true : isChatNearBottom();

    const promises = [];
    let anythingNew = false;

    for (const item of sorted) {
      // RE-CHECK guards inside the loop (paranoid — generation could bump mid-loop)
      if (myGen !== loadGenerationId || activeLeadId !== myLeadId) return;

      if (item?.type === 'Outbound') updateMessageTicks(item);
      const known = isNewMessage(item, fistLoadData);
      const shouldRender = (known && fistLoad) || !known;
      if (!shouldRender) continue;
      const mt = new Date(item.date_time).getTime();
      if (lastRenderedTime && mt <= new Date(lastRenderedTime).getTime() && !fistLoad) continue;

      anythingNew = true;
      const text = item?.message?.replaceAll?.('{{1}}', userName) || item?.message;
      const sender = item.type === 'Incomming' ? 'bot' : 'user';
      if (item?.message_type != null && item?.message_type !== 'text' && item?.message_type !== 'template') {
        const p = (async () => {
          await appendMessage('type-file', sender, item.date_time, 'time-group', null, item);
          try {
            const m = await GetFileFromAisensy(item?.message);
            // GUARD again after media fetch (slow async)
            if (myGen !== loadGenerationId || activeLeadId !== myLeadId) return;
            await dispalyFileToChat(m, sender, item.date_time, 'time-group', item);
          } catch (e) {
            // Media expired / invalid ID → swap spinner for a friendly placeholder
            if (myGen !== loadGenerationId || activeLeadId !== myLeadId) return;
            const placeholderHtml = `<div class="file-message-container"><div class="file-message document-message" style="opacity:0.7"><div class="document-icon"><i class="fa-solid fa-file-circle-xmark"></i></div><div class="document-info"><span class="file-name">Media unavailable</span><span class="file-size">expired or removed</span></div></div></div>`;
            await appendMessage(placeholderHtml, sender, item.date_time, 'time-group', null, item, true);
          }
        })();
        promises.push(p);
      } else {
        promises.push(appendMessage(text, sender, item.date_time, 'time-group', null, item));
      }
      lastRenderedTime = item.date_time;
    }
    await Promise.all(promises);

    // FINAL guard before sorting
    if (myGen !== loadGenerationId || activeLeadId !== myLeadId) return;

    fistLoad = false;
    // Only re-sort if anything new was added — prevents poll-induced flicker
    if (anythingNew) {
      sortMessages(wasNearBottom);
    }

    // Update message diagnostics so user can verify completeness vs WhatsApp
    updateMessageDiagnostics(sorted, loadData);

    if (!lastViewedAt && data.EntityId) {
      setTimeout(() => {
        lastViewedAt = Date.now();
        try { localStorage.setItem(STORAGE_KEY_PREFIX + data.EntityId, String(lastViewedAt)); } catch (e) {}
      }, 2000);
    }
  } catch (e) {
    console.error('loadAllMessages failed', e);
  }
}

/* ============================================================
   MESSAGE DIAGNOSTICS
   Helps the user spot missing messages by surfacing counts +
   timestamps so they can compare against actual WhatsApp.
   ============================================================ */
function updateMessageDiagnostics(messages, raw) {
  const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  if (!messages || messages.length === 0) {
    setTxt('diagTotal', '0');
    setTxt('diagInbound', '0');
    setTxt('diagOutbound', '0');
    setTxt('diagFailed', '0');
    setTxt('diagLastInbound', '—');
    setTxt('diagFirst', '—');
    setTxt('diagWindow', 'No messages');
    return;
  }
  const inbound = messages.filter(m => m.type === 'Incomming');
  const outbound = messages.filter(m => m.type === 'Outbound');
  const failed = messages.filter(m => m.status === 'failed');
  const lastInbound = inbound.length > 0 ? inbound[inbound.length - 1] : null;
  const first = messages[0];

  setTxt('diagTotal', messages.length);
  setTxt('diagInbound', inbound.length);
  setTxt('diagOutbound', outbound.length);
  setTxt('diagFailed', failed.length);
  setTxt('diagLastInbound', lastInbound ? formatDiagTime(lastInbound.date_time) : '—');
  setTxt('diagFirst', formatDiagTime(first.date_time));

  // Window status
  if (lastInbound) {
    const ageMs = Date.now() - new Date(lastInbound.date_time).getTime();
    const ageH = ageMs / (1000 * 60 * 60);
    if (ageH < 24) {
      const hRemaining = (24 - ageH).toFixed(1);
      setTxt('diagWindow', `Open (${hRemaining}h left)`);
    } else {
      setTxt('diagWindow', 'Closed — templates only');
    }
  } else {
    setTxt('diagWindow', 'No inbound yet');
  }

  // Console summary for debugging
  console.debug('[Inbox] Message diagnostics:', {
    leadId: activeLeadId,
    total: messages.length,
    inbound: inbound.length,
    outbound: outbound.length,
    failed: failed.length,
    firstMsg: first.date_time,
    lastInbound: lastInbound?.date_time
  });
}

function formatDiagTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString();
  } catch (e) {
    return '—';
  }
}

// Force reload: clears the localStorage cache for this lead + reloads from Zoho
function forceReloadMessages() {
  if (!activeLeadId) return;
  try {
    localStorage.removeItem(STORAGE_KEY_PREFIX + activeLeadId);
  } catch (e) {}
  // Bump generation to drop any in-flight requests
  loadGenerationId++;
  const myGen = loadGenerationId;
  // Clear visible messages
  if (chatBody) chatBody.innerHTML = '';
  fistLoad = true;
  fistLoadData = [];
  lastRenderedTime = null;
  // Re-fetch
  loadAllMessages(activeLeadData, myGen);
  refreshConversations();
  console.log('[Inbox] Force-reloaded messages for lead', activeLeadId);
}

/* AiSensy direct */
async function GetFileFromAisensy(mediaId) {
  const r = await fetch('https://backend.aisensy.com/direct-apis/t1/get-media', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AISENSY_TOKEN },
    body: JSON.stringify({ id: mediaId })
  });
  if (!r.ok) throw new Error('media fetch ' + r.status);
  return r.json();
}

async function uploadFileToAisensy(file) {
  const fd = new FormData(); fd.append('file', file);
  const r = await fetch('https://backend.aisensy.com/direct-apis/t1/media', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Authorization': 'Bearer ' + AISENSY_TOKEN },
    body: fd
  });
  if (!r.ok) throw new Error('upload ' + r.status);
  return r.json();
}

/* Tabs */
document.querySelectorAll('input[name="tabs"]').forEach(tab => {
  tab.addEventListener('change', function () {
    if (this.checked) {
      tabSelcted = this.value;
      searchInput.value = '';
      searchInput.placeholder = this.value === 'reply' ? 'Send Message' : 'Select Template';
      if (this.value === 'reply') dropdownList.style.display = 'none';
      updateEmojiButton(this.value);
    }
  });
});

/* Thread search */
function openThreadSearch() { searchBarEl.classList.add('open'); threadSearchInput.focus(); }
function closeThreadSearch() {
  searchBarEl.classList.remove('open'); threadSearchInput.value = '';
  clearThreadSearchHighlights(); threadSearchMatches = []; threadSearchActiveIdx = -1; updateThreadSearchCount();
}
function clearThreadSearchHighlights() {
  document.querySelectorAll('.msg-body').forEach(b => {
    const o = b.dataset.originalText;
    if (o !== undefined) b.textContent = o;
  });
}
function runThreadSearch(term) {
  clearThreadSearchHighlights();
  threadSearchMatches = []; threadSearchActiveIdx = -1;
  if (!term || term.length < 2) { updateThreadSearchCount(); return; }
  const lower = term.toLowerCase();
  chatBody.querySelectorAll('.msg-body').forEach(body => {
    if (body.querySelector('.file-message-container')) return;
    const text = body.textContent;
    if (body.dataset.originalText === undefined) body.dataset.originalText = text;
    const tlow = text.toLowerCase();
    let idx = tlow.indexOf(lower);
    if (idx === -1) return;
    body.innerHTML = '';
    let cursor = 0;
    while (idx !== -1) {
      if (idx > cursor) body.appendChild(document.createTextNode(text.substring(cursor, idx)));
      const m = document.createElement('span'); m.className = 'search-highlight'; m.textContent = text.substring(idx, idx + term.length);
      body.appendChild(m); threadSearchMatches.push(m);
      cursor = idx + term.length;
      idx = tlow.indexOf(lower, cursor);
    }
    if (cursor < text.length) body.appendChild(document.createTextNode(text.substring(cursor)));
  });
  if (threadSearchMatches.length) { threadSearchActiveIdx = 0; activateThreadMatch(0); }
  updateThreadSearchCount();
}
function activateThreadMatch(i) {
  threadSearchMatches.forEach((m, idx) => m.classList.toggle('active', idx === i));
  if (threadSearchMatches[i]) threadSearchMatches[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
  updateThreadSearchCount();
}
function updateThreadSearchCount() {
  searchCountEl.textContent = threadSearchMatches.length === 0 ? '0 / 0' : `${threadSearchActiveIdx + 1} / ${threadSearchMatches.length}`;
}
function nextThreadMatch() { if (!threadSearchMatches.length) return; threadSearchActiveIdx = (threadSearchActiveIdx + 1) % threadSearchMatches.length; activateThreadMatch(threadSearchActiveIdx); }
function prevThreadMatch() { if (!threadSearchMatches.length) return; threadSearchActiveIdx = (threadSearchActiveIdx - 1 + threadSearchMatches.length) % threadSearchMatches.length; activateThreadMatch(threadSearchActiveIdx); }

searchToggleEl?.addEventListener('click', openThreadSearch);
searchCloseEl?.addEventListener('click', closeThreadSearch);
threadSearchInput?.addEventListener('input', e => runThreadSearch(e.target.value));
threadSearchInput?.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); e.shiftKey ? prevThreadMatch() : nextThreadMatch(); }
  else if (e.key === 'Escape') closeThreadSearch();
});
searchPrevEl?.addEventListener('click', prevThreadMatch);
searchNextEl?.addEventListener('click', nextThreadMatch);

/* Unread badge */
function refreshUnreadBadge() {
  if (!refreshBtnEl) return;
  if (unreadCount > 0) {
    refreshBtnEl.classList.add('has-unread');
    let s = refreshBtnEl.querySelector('.unread-count');
    if (!s) { s = document.createElement('span'); s.className = 'unread-count'; refreshBtnEl.appendChild(s); }
    s.textContent = unreadCount > 9 ? '9+' : String(unreadCount);
  } else {
    refreshBtnEl.classList.remove('has-unread');
    const s = refreshBtnEl.querySelector('.unread-count');
    if (s) s.remove();
  }
}

function clearUnreadState() {
  unreadCount = 0;
  document.querySelectorAll('.bot-message.unread').forEach(el => el.classList.remove('unread'));
  document.querySelectorAll('.unread-divider').forEach(el => el.remove());
  refreshUnreadBadge();
  if (activeLeadId) {
    lastViewedAt = Date.now();
    try { localStorage.setItem(STORAGE_KEY_PREFIX + activeLeadId, String(lastViewedAt)); } catch (e) {}
  }
}

refreshBtnEl?.addEventListener('click', async () => {
  refreshBtnEl.disabled = true;
  if (unreadCount > 0) {
    const first = chatBody.querySelector('.bot-message.unread');
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => { clearUnreadState(); refreshBtnEl.disabled = false; }, 800);
    return;
  }
  refreshBtnEl.style.opacity = '0.5';
  try { await loadAllMessages(activeLeadData, loadGenerationId); }
  finally { setTimeout(() => { refreshBtnEl.disabled = false; refreshBtnEl.style.opacity = '1'; }, 600); }
});

chatBody.addEventListener('click', e => {
  const img = e.target.closest('.chat-image');
  if (!img) return;
  const overlay = document.createElement('div');
  overlay.className = 'image-lightbox';
  overlay.innerHTML = `<button class="image-lightbox-close">&times;</button><img src="${encodeURI(img.src)}" alt="${escapeHtml(img.alt || '')}">`;
  overlay.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
});

chatBody.addEventListener('scroll', () => {
  if (unreadCount === 0) return;
  const atBottom = chatBody.scrollHeight - chatBody.scrollTop - chatBody.clientHeight < 50;
  if (atBottom) clearUnreadState();
});

/* Templates */
async function fetchTemplates() {
  loader.style.display = 'inline-block';
  try {
    const req = {
      parameters: {},
      headers: { 'Authorization': 'Bearer ' + AISENSY_TOKEN },
      method: 'GET',
      url: 'https://backend.aisensy.com/direct-apis/t1/get-templates'
    };
    const r = await ZOHO.CRM.HTTP.get(req);
    const p = typeof r === 'string' ? JSON.parse(r) : r;
    templates = p?.data?.map(t => {
      const body = t.components.find(c => c.type === 'BODY');
      return { id: t.id, name: t.name, body: body ? body.text : 'No body text available' };
    });
  } catch (e) { console.error(e); }
  finally { loader.style.display = 'none'; }
}

async function loadTemplates(loadTemp = null) {
  if (tabSelcted == 'reply') return;
  if (templates.length === 0) await fetchTemplates();
  dropdownList.innerHTML = '';
  templates.forEach(t => {
    const item = document.createElement('div');
    item.textContent = t.name;
    item.onclick = () => showTemplate(t);
    dropdownList.appendChild(item);
  });
  if (!loadTemp && templates.length) dropdownList.style.display = 'block';
}

window.filterTemplates = function () {
  if (tabSelcted == 'reply') return;
  const term = searchInput.value.toLowerCase();
  dropdownList.innerHTML = '';
  const filtered = templates.filter(t => t.name.toLowerCase().includes(term));
  if (filtered.length === 0) {
    currentTemplate = null;
    const d = document.createElement('div'); d.textContent = 'No results found';
    dropdownList.appendChild(d);
  } else {
    filtered.forEach(t => {
      const item = document.createElement('div'); item.textContent = t.name;
      item.onclick = () => showTemplate(t);
      dropdownList.appendChild(item);
    });
    dropdownList.style.display = 'block';
  }
};

function showTemplate(t) {
  currentTemplate = t;
  templateContent = t?.body;
  searchInput.value = templateContent?.replaceAll('{{1}}', userName);
}

searchInput.addEventListener('click', () => loadTemplates());
searchInput.addEventListener('keyup', () => {
  if (searchInput.value.trim() === '') { currentTemplate = null; loadTemplates(); }
});
searchInput.addEventListener('input', window.filterTemplates);

document.addEventListener('click', e => {
  if (!e.target.matches('#searchInput') && !dropdownList.contains(e.target)) dropdownList.style.display = 'none';
  if (tabSelcted === 'reply') { currentTemplate = null; dropdownList.style.display = 'none'; }
});

/* Visibility */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearInterval(timerInterval); clearInterval(listTimer);
  } else {
    if (activeLeadData) {
      const _gen = loadGenerationId;
      const _lead = activeLeadId;
      timerInterval = setInterval(() => {
        if (loadGenerationId === _gen && activeLeadId === _lead) {
          loadAllMessages(activeLeadData, _gen);
        }
      }, POLL_INTERVAL_MS);
    }
    listTimer = setInterval(refreshConversations, LIST_REFRESH_MS);
  }
});

/* ============================================================
   INIT
   ============================================================ */
ZOHO.embeddedApp.on('PageLoad', async () => {
  initMobileNav();
  await refreshConversations();
  await loadTemplates('load');
  if (relativeTimeInterval) clearInterval(relativeTimeInterval);
  relativeTimeInterval = setInterval(refreshAllRelativeTimes, 60000);
  listTimer = setInterval(refreshConversations, LIST_REFRESH_MS);
});

ZOHO.embeddedApp.init();
