/* ============================================================
   Clotus WhatsApp Inbox — Web Tab (3-column)
   ============================================================
   - Left:   recent WA leads (search + filters)
   - Center: chat (full v3 send/receive/UX preserved)
   - Right:  lead details + activities + notes
   ============================================================ */

/* ---------- AISENSY TOKEN ---------- */
const AISENSY_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhc3Npc3RhbnRJZCI6IjY2ZTAzMWNhYzEzMTY2MGI3ODc2NWFjNSIsImNsaWVudElkIjoiNjZlMDMxY2FjMTMxNjYwYjc4NzY1YWJmIiwiaWF0IjoxNzQzMTQyOTczfQ.fimSFx_BcZSgxxMS8Lq0J2BJGElf7MvwMO2w1jdYp9s';

const POLL_INTERVAL_MS = 10000;
const LIST_REFRESH_MS = 15000;
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

/* ---------- STATE ---------- */
let listFilter = 'all';
let leadSearchTerm = '';
let allConversations = []; // lead summaries from server
let activeLeadId = null;
let activeLeadData = null; // mimics PageLoad `data`

// Chat state (reused from v3 widget)
let listofdata = '';
let tabSelcted = 'templates';
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
  try {
    // Strategy: use COQL via Deluge to fetch leads with WA Communications
    // We'll need a Deluge function: clotus_wa_inbox_list
    // For now, use existing extension API approach.
    const req = { "arguments": JSON.stringify({ "limit": 100 }) };
    const response = await ZOHO.CRM.FUNCTIONS.execute('clotus_wa_inbox_list', req);
    const parsed = typeof response === 'string' ? JSON.parse(response) : response;
    if (parsed?.code === 'success') {
      const data = typeof parsed.details?.output === 'string' ? JSON.parse(parsed.details.output) : parsed.details.output;
      return data?.conversations || [];
    }
  } catch (e) {
    console.warn('clotus_wa_inbox_list unavailable, falling back to COQL via getRecord', e);
  }

  // Fallback: pull recent WA Communications and group client-side
  try {
    const recs = await ZOHO.CRM.API.getAllRecords({
      Entity: 'aisensypro__WA_Communications',
      sort_order: 'desc',
      sort_by: 'aisensypro__Date',
      per_page: 200,
      page: 1
    });
    const list = typeof recs.data === 'string' ? JSON.parse(recs.data) : recs.data;
    const byLead = new Map();
    (list || []).forEach(r => {
      const lead = r.aisensypro__Lead;
      if (!lead?.id) return;
      const existing = byLead.get(lead.id);
      const ts = r.aisensypro__Date || r.Created_Time;
      if (!existing || new Date(ts) > new Date(existing.last_at)) {
        byLead.set(lead.id, {
          lead_id: lead.id,
          lead_name: lead.name,
          last_at: ts,
          last_preview: r.aisensypro__Message || '[Media]',
          last_type: r.aisensypro__Type,
          last_status: r.aisensypro__Status,
          phone: r.aisensypro__From === '918986630794' ? r.aisensypro__To : r.aisensypro__From
        });
      }
    });
    return Array.from(byLead.values()).sort((a, b) => new Date(b.last_at) - new Date(a.last_at));
  } catch (e) {
    console.error('Conversation fetch failed', e);
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
    if (listFilter === 'failed') return c.last_status === 'failed';
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
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PREFIX + conv.lead_id);
    const lastViewed = stored ? parseInt(stored, 10) : 0;
    const lastAt = new Date(conv.last_at).getTime();
    if (!stored) return conv.last_type === 'Incomming' ? 1 : 0;
    return lastAt > lastViewed && conv.last_type === 'Incomming' ? 1 : 0;
  } catch (e) {
    return 0;
  }
}

async function refreshConversations() {
  const list = await fetchConversations();
  allConversations = list;
  renderLeadList();
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
  if (activeLeadId) loadAllMessages(activeLeadData);
});

/* ============================================================
   SELECT LEAD — load chat + right pane
   ============================================================ */
function selectLead(leadId) {
  if (activeLeadId === leadId) return;
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

  // Load everything in parallel
  fetchLeadDetails(activeLeadData);
  loadAllMessages(activeLeadData);
  fetchActivities(leadId);
  fetchNotes(leadId);

  // Restart polling
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => loadAllMessages(activeLeadData), POLL_INTERVAL_MS);
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
      icon: 'fa-check-square',
      title: t.Subject || 'Task',
      sub: t.Status || '',
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
      li.innerHTML = `
        <div class="activity-icon"><i class="fa-solid ${it.icon}"></i></div>
        <div class="activity-body">
          <div class="activity-title">${escapeHtml(it.title)}</div>
          ${it.sub ? `<div class="activity-sub">${escapeHtml(it.sub)}</div>` : ''}
          <div class="activity-time">${it.time ? formatRelativeTime(it.time) : ''}</div>
        </div>
      `;
      activityListEl.appendChild(li);
    });
  } catch (e) {
    console.error('Activities fetch failed', e);
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

    timerInterval = setInterval(() => loadAllMessages(listofdata), POLL_INTERVAL_MS);
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
  timerInterval = setInterval(() => loadAllMessages(listofdata), POLL_INTERVAL_MS);
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
  chatBody.scrollTop = chatBody.scrollHeight;
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
function sortMessages() {
  const msgs = Array.from(chatBody.querySelectorAll('.user-message, .bot-message'));
  msgs.sort((a, b) => new Date(a.getAttribute('data-date-time')) - new Date(b.getAttribute('data-date-time')));
  chatBody.innerHTML = '';
  let currentDate = null;
  let unreadPlaced = false;
  msgs.forEach(m => {
    const label = formatDateLabel(m.getAttribute('data-date-time'));
    if (label !== currentDate) {
      currentDate = label;
      const d = document.createElement('div'); d.className = 'date-label'; d.textContent = label;
      chatBody.appendChild(d);
    }
    if (!unreadPlaced && m.classList.contains('unread')) {
      const u = document.createElement('div'); u.className = 'unread-divider'; u.textContent = '↓ New messages';
      chatBody.appendChild(u);
      unreadPlaced = true;
    }
    chatBody.appendChild(m);
  });
  regroupMessages();
  chatBody.scrollTop = chatBody.scrollHeight;
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
async function loadAllMessages(data) {
  if (!data || !data.EntityId) return;
  const req = { arguments: JSON.stringify({ leadIds: data.EntityId }) };
  try {
    const response = await ZOHO.CRM.FUNCTIONS.execute('allWaCommunications', req);
    const parsed = typeof response === 'string' ? JSON.parse(response) : response;
    if (parsed?.code !== 'success') return;
    const loadData = JSON.parse(parsed?.details?.output);
    const sorted = (loadData?.recordList || []).sort((a, b) => new Date(a.date_time) - new Date(b.date_time));
    Countdown.init(loadData?.replyDateTime ? new Date(loadData.replyDateTime) : null);
    if (fistLoad) fistLoadData = [...sorted];

    const promises = [];
    for (const item of sorted) {
      if (item?.type === 'Outbound') updateMessageTicks(item);
      const known = isNewMessage(item, fistLoadData);
      const shouldRender = (known && fistLoad) || !known;
      if (!shouldRender) continue;
      const mt = new Date(item.date_time).getTime();
      if (lastRenderedTime && mt <= new Date(lastRenderedTime).getTime() && !fistLoad) continue;
      const text = item?.message?.replaceAll?.('{{1}}', userName) || item?.message;
      const sender = item.type === 'Incomming' ? 'bot' : 'user';
      if (item?.message_type != null && item?.message_type !== 'text' && item?.message_type !== 'template') {
        const p = (async () => {
          await appendMessage('type-file', sender, item.date_time, 'time-group', null, item);
          try {
            const m = await GetFileFromAisensy(item?.message);
            await dispalyFileToChat(m, sender, item.date_time, 'time-group', item);
          } catch (e) { console.error('media', e); }
        })();
        promises.push(p);
      } else {
        promises.push(appendMessage(text, sender, item.date_time, 'time-group', null, item));
      }
      lastRenderedTime = item.date_time;
    }
    await Promise.all(promises);
    fistLoad = false;
    sortMessages();
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
  try { await loadAllMessages(activeLeadData); }
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
    if (activeLeadData) timerInterval = setInterval(() => loadAllMessages(activeLeadData), POLL_INTERVAL_MS);
    listTimer = setInterval(refreshConversations, LIST_REFRESH_MS);
  }
});

/* ============================================================
   INIT
   ============================================================ */
ZOHO.embeddedApp.on('PageLoad', async () => {
  await refreshConversations();
  await loadTemplates('load');
  if (relativeTimeInterval) clearInterval(relativeTimeInterval);
  relativeTimeInterval = setInterval(refreshAllRelativeTimes, 60000);
  listTimer = setInterval(refreshConversations, LIST_REFRESH_MS);
});

ZOHO.embeddedApp.init();
