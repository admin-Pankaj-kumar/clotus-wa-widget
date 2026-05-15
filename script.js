/* ============================================================
   Clotus WhatsApp Widget — Read-Only build (Option C)
   ============================================================
   Loads conversation history via clotus_wa_load_conversation
   Deluge function. No AiSensy fetch calls. No send capability.
   No media binary downloads.
   ============================================================ */

(function () {
  'use strict';

  const state = {
    leadId: null,
    leadName: '...',
    messagesById: new Map(),
    renderedDateLabels: new Set(),
    latestSeenTimestamp: null,
    pageLoaded: 1,
    hasMoreOlder: false,
    replyDateTime: null,
    pollIntervalId: null
  };

  const POLL_INTERVAL_MS = 30000;
  const PAGE_SIZE = 50;

  let chatBody, chatTitle, loadMoreBar, loadMoreBtn, countdownEl;

  /* ---------- Utilities ---------- */
  function safeText(s) { return s == null ? '' : String(s); }

  function formatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  function formatDateLabel(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
  }

  /* ---------- Deluge wrapper ---------- */
  async function callDeluge(funcName, args) {
    const req = { arguments: JSON.stringify(args || {}) };
    const raw = await ZOHO.CRM.FUNCTIONS.execute(funcName, req);
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (parsed && parsed.code === 'success') {
      const output = parsed.details && parsed.details.output;
      return typeof output === 'string' ? JSON.parse(output) : output;
    }
    throw new Error(funcName + ' returned: ' + JSON.stringify(parsed));
  }

  /* ---------- Lead header ---------- */
  async function fetchLeadHeader(leadId) {
    try {
      const response = await ZOHO.CRM.API.getRecord({ Entity: 'Leads', approved: 'both', RecordID: leadId });
      const details = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
      const lead = details && details[0];
      state.leadName = (lead && (lead.Full_Name || lead.First_Name)) || 'Lead';
      chatTitle.textContent = state.leadName;
    } catch (e) {
      console.error('Lead lookup failed', e);
    }
  }

  /* ---------- Countdown (vanilla, no jQuery/GSAP dependency) ---------- */
  const Countdown = {
    interval: null,
    init: function (startIso) {
      if (this.interval) clearInterval(this.interval);

      if (!startIso) {
        countdownEl.classList.add('no-inbound');
        this.paint(0, 0, 0);
        return;
      }

      const start = new Date(startIso);
      if (isNaN(start.getTime())) {
        countdownEl.classList.add('no-inbound');
        this.paint(0, 0, 0);
        return;
      }
      countdownEl.classList.remove('no-inbound');

      const totalMs = 24 * 60 * 60 * 1000;
      const tick = () => {
        const remaining = totalMs - (Date.now() - start.getTime());
        if (remaining <= 0) {
          clearInterval(this.interval);
          this.paint(0, 0, 0);
          countdownEl.classList.add('no-inbound');
          return;
        }
        const totalSec = Math.floor(remaining / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        this.paint(h, m, s);
      };
      tick();
      this.interval = setInterval(tick, 1000);
    },
    paint: function (h, m, s) {
      this._setPair('hours', h);
      this._setPair('min', m);
      this._setPair('sec', s);
    },
    _setPair: function (cls, val) {
      const padded = String(val).padStart(2, '0');
      const figs = countdownEl.querySelectorAll('.bloc-time.' + cls + ' .figure');
      if (figs.length < 2) return;
      this._setFigure(figs[0], padded.charAt(0));
      this._setFigure(figs[1], padded.charAt(1));
    },
    _setFigure: function (figEl, digit) {
      const tops = figEl.querySelectorAll('.top, .bottom');
      tops.forEach(el => {
        // Only direct children spans (avoid nested .top-back / .bottom-back)
        if (el.children.length === 0) {
          el.textContent = digit;
        }
      });
      const backSpans = figEl.querySelectorAll('.top-back span, .bottom-back span');
      backSpans.forEach(s => s.textContent = digit);
    }
  };

  /* ---------- Message rendering ---------- */
  function ensureDateLabel(iso) {
    const label = formatDateLabel(iso);
    if (state.renderedDateLabels.has(label)) return;
    state.renderedDateLabels.add(label);

    const div = document.createElement('div');
    div.className = 'date-label';
    div.textContent = label;
    div.dataset.dateLabel = label;
    div.dataset.dateTime = new Date(iso).toISOString();
    insertInSortedPosition(div);
  }

  function insertInSortedPosition(el) {
    const target = new Date(el.dataset.dateTime).getTime();
    const kids = Array.from(chatBody.children).filter(c => c.id !== 'loadMoreBar');
    let inserted = false;
    for (const k of kids) {
      const t = k.dataset.dateTime ? new Date(k.dataset.dateTime).getTime() : -Infinity;
      if (t > target) {
        chatBody.insertBefore(el, k);
        inserted = true;
        break;
      }
    }
    if (!inserted) chatBody.appendChild(el);
  }

  function renderMessage(msg) {
    if (state.messagesById.has(msg.id)) {
      const existing = document.getElementById('msg-' + msg.id);
      if (existing) updateMessageStatus(existing, msg);
      state.messagesById.set(msg.id, msg);
      return;
    }
    state.messagesById.set(msg.id, msg);

    ensureDateLabel(msg.date_time);

    const isInbound = msg.type === 'Incomming';
    const div = document.createElement('div');
    div.id = 'msg-' + msg.id;
    div.className = isInbound ? 'bot-message time-group' : 'user-message time-group';
    div.dataset.dateTime = new Date(msg.date_time).toISOString();
    div.dataset.time = formatTime(msg.date_time);
    div.setAttribute('data-time', div.dataset.time);

    const body = document.createElement('span');
    const mt = msg.message_type;

    if (mt && mt !== 'text' && mt !== 'template' && mt !== null) {
      // Media message — show placeholder only (read-only build doesn't fetch binary)
      const label = msg.file_name || msg.message || 'file';
      body.textContent = '[' + mt + ': ' + label + ']';
      body.style.fontStyle = 'italic';
      body.style.color = '#666';
    } else {
      const rendered = safeText(msg.message).split('{{1}}').join(state.leadName);
      body.textContent = rendered;
    }
    div.appendChild(body);

    if (!isInbound) {
      const ticks = document.createElement('span');
      ticks.className = 'ticks';
      div.appendChild(ticks);
      updateMessageStatus(div, msg);
    }

    insertInSortedPosition(div);

    const ts = new Date(msg.date_time).getTime();
    if (!state.latestSeenTimestamp || ts > new Date(state.latestSeenTimestamp).getTime()) {
      state.latestSeenTimestamp = msg.date_time;
    }
  }

  function updateMessageStatus(div, msg) {
    if (msg.type === 'Incomming') return;
    const ticks = div.querySelector('.ticks');
    if (!ticks) return;
    ticks.innerHTML = '';
    ticks.className = 'ticks';

    const status = msg.status;
    if (status === 'sending') {
      ticks.innerHTML = '<i class="tick" aria-label="sending">🕐</i>';
    } else if (status === 'sent') {
      ticks.innerHTML = '<i class="tick" aria-label="sent">&#10003;</i>';
    } else if (status === 'delivered') {
      ticks.innerHTML = '<i class="tick">&#10003;</i><i class="tick">&#10003;</i>';
      ticks.classList.add('delivered');
    } else if (status === 'read') {
      ticks.innerHTML = '<i class="tick">&#10003;</i><i class="tick">&#10003;</i>';
      ticks.classList.add('read');
    } else if (status === 'failed') {
      ticks.classList.add('failed');
      const span = document.createElement('span');
      span.textContent = 'Failed';
      span.style.color = '#ef2f2f';
      span.style.fontSize = '12px';
      ticks.appendChild(span);
    }
  }

  /* ---------- Loaders ---------- */
  async function loadInitialConversation() {
    try {
      const result = await callDeluge('clotus_wa_load_conversation', {
        leadId: state.leadId,
        page: 1,
        perPage: PAGE_SIZE
      });
      handleConversationPayload(result, true);
    } catch (e) {
      console.error('initial load failed', e);
      showEmptyState('Unable to load conversation. ' + e.message);
    }
  }

  async function pollForNewMessages() {
    if (!state.latestSeenTimestamp) return;
    try {
      const result = await callDeluge('clotus_wa_load_conversation', {
        leadId: state.leadId,
        since: state.latestSeenTimestamp,
        perPage: PAGE_SIZE
      });
      handleConversationPayload(result, false);
    } catch (e) {
      console.error('poll failed', e);
    }
  }

  async function loadMoreOlder() {
    if (!state.hasMoreOlder) return;
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = 'Loading...';
    try {
      const result = await callDeluge('clotus_wa_load_conversation', {
        leadId: state.leadId,
        page: state.pageLoaded + 1,
        perPage: PAGE_SIZE
      });
      state.pageLoaded += 1;
      handleConversationPayload(result, false);
    } catch (e) {
      console.error('load more failed', e);
    } finally {
      loadMoreBtn.disabled = false;
      loadMoreBtn.textContent = 'Load older messages';
    }
  }

  function handleConversationPayload(payload, isInitial) {
    if (!payload || payload.status !== 'ok') {
      console.error('Bad payload', payload);
      return;
    }

    const records = (payload.records || []).slice();
    records.sort((a, b) => new Date(a.date_time) - new Date(b.date_time));
    records.forEach(renderMessage);

    if (payload.reply_date_time && payload.reply_date_time !== state.replyDateTime) {
      state.replyDateTime = payload.reply_date_time;
      Countdown.init(state.replyDateTime);
    } else if (isInitial && !payload.reply_date_time) {
      Countdown.init(null);
    }

    if (!payload.is_incremental) {
      state.hasMoreOlder = !!payload.has_more;
      loadMoreBar.classList.toggle('hidden', !state.hasMoreOlder);
    }

    if (isInitial && records.length === 0) {
      showEmptyState('No WhatsApp messages yet for this lead.');
    } else {
      clearEmptyState();
    }

    if (isInitial || (payload.is_incremental && records.length > 0)) {
      chatBody.scrollTop = chatBody.scrollHeight;
    }
  }

  function showEmptyState(text) {
    if (chatBody.querySelector('.empty-state')) return;
    const div = document.createElement('div');
    div.className = 'empty-state';
    div.textContent = text;
    chatBody.appendChild(div);
  }

  function clearEmptyState() {
    const el = chatBody.querySelector('.empty-state');
    if (el) el.remove();
  }

  /* ---------- Polling lifecycle ---------- */
  function startPolling() {
    if (state.pollIntervalId) clearInterval(state.pollIntervalId);
    state.pollIntervalId = setInterval(pollForNewMessages, POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (state.pollIntervalId) {
      clearInterval(state.pollIntervalId);
      state.pollIntervalId = null;
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopPolling();
    else startPolling();
  });

  /* ---------- Init ---------- */
  function resetState() {
    state.leadId = null;
    state.leadName = '...';
    state.messagesById.clear();
    state.renderedDateLabels.clear();
    state.latestSeenTimestamp = null;
    state.pageLoaded = 1;
    state.hasMoreOlder = false;
    state.replyDateTime = null;
    while (chatBody.firstChild) chatBody.removeChild(chatBody.firstChild);
    chatBody.appendChild(loadMoreBar);
    loadMoreBar.classList.add('hidden');
  }

  ZOHO.embeddedApp.on('PageLoad', async (data) => {
    chatBody    = document.getElementById('chatBody');
    chatTitle   = document.getElementById('user_full_name');
    loadMoreBar = document.getElementById('loadMoreBar');
    loadMoreBtn = document.getElementById('loadMoreBtn');
    countdownEl = document.getElementById('countdown');

    resetState();
    state.leadId = data.EntityId;

    loadMoreBtn.addEventListener('click', loadMoreOlder);

    await fetchLeadHeader(state.leadId);
    await loadInitialConversation();
    startPolling();
  });

  ZOHO.embeddedApp.init();
})();
