/* ============================================================
   Clotus WhatsApp Widget v3 — Send + Receive + Enhanced UX
   ============================================================
   Preserved from v0:
   - Template send, free-text reply, file upload
   - Emoji picker, status ticks, 30s polling, visibility-change
   - Direct AiSensy fetch calls (token hardcoded — defer to Connection)
   - Media rendering (image/video/audio/document)
   - Deluge function calls: aisensypro__get_aisensy_template_details_for_detail_page, allWaCommunications

   Fixed:
   - Per-lead state reset (lastRenderedTime leak)
   - XSS in appendMessage (user-supplied text)
   - Race condition in sortMessages (await async work)
   - 20-record cap honored from extension (we send everything we get)

   Added:
   - Lead info in header (name + phone always visible)
   - Relative timestamps with 60s auto-refresh
   - In-thread search with prev/next
   - Unread divider via localStorage
   - Refresh button
   ============================================================ */

/* ============================================================
   DOM REFS
   ============================================================ */
const dropdownList   = document.getElementById("dropdownList");
const searchInput    = document.getElementById("searchInput");
const userFullName   = document.getElementById("user_full_name");
const leadAvatarEl   = document.getElementById("leadAvatar");
const leadPhoneEl    = document.getElementById("leadPhone");
const statusDotEl    = document.getElementById("statusDot");
const statusTextEl   = document.getElementById("statusText");
const chatContainer  = document.getElementById("chatContainer");
const chatBody       = document.getElementById("chatBody");
const userInput      = document.getElementById("searchInput"); // composer input
const loader         = document.getElementById("loader");
const fileInput      = document.getElementById("fileInput");

const searchToggleEl   = document.getElementById("searchToggle");
const refreshBtnEl     = document.getElementById("refreshBtn");
const searchBarEl      = document.getElementById("searchBar");
const threadSearchInput = document.getElementById("threadSearchInput");
const searchCountEl    = document.getElementById("searchCount");
const searchPrevEl     = document.getElementById("searchPrev");
const searchNextEl     = document.getElementById("searchNext");
const searchCloseEl    = document.getElementById("searchClose");

/* ============================================================
   STATE
   ============================================================ */
let listofdata = '';
let tabSelcted = 'templates';
let timerInterval;
let lastRenderedTime = null;
let relativeTimeInterval = null;

let templateContent = '';
let templateData = null;
let userName = '...';
let leadPhone = null;

let templates = [];
let currentTemplate = null;
// Module-level template state — referenced by sendMessageToBackend (which is at module level)
let clotusTemplateMetaByName = {};
let currentTemplateVars = {};
let activeLeadFields = null;

let fistLoad = true;
let fistLoadData = [];

let lastViewedAt = null;
let unreadDividerInserted = false;
let unreadCount = 0;
const STORAGE_KEY_PREFIX = 'clotus_wa_lastview_';
const POLL_INTERVAL_MS = 10000;

let threadSearchMatches = [];
let threadSearchActiveIdx = -1;

/* ============================================================
   AISENSY TOKEN (hardcoded — TODO: move to Zoho Connection)
   ============================================================ */
const AISENSY_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhc3Npc3RhbnRJZCI6IjY2ZTAzMWNhYzEzMTY2MGI3ODc2NWFjNSIsImNsaWVudElkIjoiNjZlMDMxY2FjMTMxNjYwYjc4NzY1YWJmIiwiaWF0IjoxNzQzMTQyOTczfQ.fimSFx_BcZSgxxMS8Lq0J2BJGElf7MvwMO2w1jdYp9s';

/* ============================================================
   LOADER MARKUP
   ============================================================ */
const fileLoader = `
  <div class="file-loader file-message-container">
    <div class="file-loader-section">
      <div class="spinner"></div>
    </div>
  </div>`;

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
  if (digits.length === 12 && digits.startsWith('91')) {
    return '+91 ' + digits.slice(2, 7) + ' ' + digits.slice(7);
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return '+1 ' + digits.slice(1, 4) + ' ' + digits.slice(4, 7) + ' ' + digits.slice(7);
  }
  if (digits.length === 10) {
    return digits.slice(0, 5) + ' ' + digits.slice(5);
  }
  return raw;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function formatRelativeTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return diffMin + ' min ago';
  if (diffHr < 24 && isSameDay(d, new Date())) return formatTime(iso);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(d, yesterday)) return 'Yesterday ' + formatTime(iso);

  if (diffDay < 7) {
    return d.toLocaleDateString([], { weekday: 'short' }) + ' ' + formatTime(iso);
  }
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function formatTime(dateTimeStr) {
  return new Date(dateTimeStr).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function formatDateLabel(dateTimeStr) {
  const messageDate = new Date(dateTimeStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(messageDate, today)) return 'Today';
  if (isSameDay(messageDate, yesterday)) return 'Yesterday';

  const diffDays = Math.floor((today - messageDate) / 86400000);
  if (diffDays < 7) {
    return messageDate.toLocaleDateString([], { weekday: 'long' });
  }
  return messageDate.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: messageDate.getFullYear() === today.getFullYear() ? undefined : 'numeric'
  });
}

function getCurrentTime() {
  return new Date().toISOString();
}

function refreshAllRelativeTimes() {
  document.querySelectorAll('.msg-time').forEach(el => {
    const iso = el.dataset.iso;
    if (iso) el.textContent = formatRelativeTime(iso);
  });
}

/* ============================================================
   UNREAD BADGE
   ============================================================ */
function refreshUnreadBadge() {
  if (!refreshBtnEl) return;
  if (unreadCount > 0) {
    refreshBtnEl.classList.add('has-unread');
    refreshBtnEl.setAttribute('title', `${unreadCount} new message${unreadCount > 1 ? 's' : ''} — click to scroll`);
    let span = refreshBtnEl.querySelector('.unread-count');
    if (!span) {
      span = document.createElement('span');
      span.className = 'unread-count';
      refreshBtnEl.appendChild(span);
    }
    span.textContent = unreadCount > 9 ? '9+' : String(unreadCount);
  } else {
    refreshBtnEl.classList.remove('has-unread');
    refreshBtnEl.setAttribute('title', 'Refresh');
    const span = refreshBtnEl.querySelector('.unread-count');
    if (span) span.remove();
  }
}

function clearUnreadState() {
  unreadCount = 0;
  document.querySelectorAll('.bot-message.unread').forEach(el => el.classList.remove('unread'));
  document.querySelectorAll('.unread-divider').forEach(el => el.remove());
  refreshUnreadBadge();
  if (listofdata?.EntityId) {
    lastViewedAt = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + listofdata.EntityId, String(lastViewedAt));
    } catch (e) {}
  }
}

/* ============================================================
   MIME / FILE TYPE DETECTION (kept from v0)
   ============================================================ */
async function getMimeTypeFromBuffer(bufferData) {
  try {
    const uint8Array = new Uint8Array(bufferData.data);
    if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8) return 'image/jpeg';
    if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && uint8Array[2] === 0x4E && uint8Array[3] === 0x47 &&
        uint8Array[4] === 0x0D && uint8Array[5] === 0x0A && uint8Array[6] === 0x1A && uint8Array[7] === 0x0A) return 'image/png';
    if (uint8Array[0] === 0x47 && uint8Array[1] === 0x49 && uint8Array[2] === 0x46 && uint8Array[3] === 0x38 &&
        (uint8Array[4] === 0x37 || uint8Array[4] === 0x39) && uint8Array[5] === 0x61) return 'image/gif';
    if (uint8Array[0] === 0x52 && uint8Array[1] === 0x49 && uint8Array[2] === 0x46 && uint8Array[3] === 0x46 &&
        uint8Array[8] === 0x57 && uint8Array[9] === 0x45 && uint8Array[10] === 0x42 && uint8Array[11] === 0x50) return 'image/webp';
    if (uint8Array[0] === 0x25 && uint8Array[1] === 0x50 && uint8Array[2] === 0x44 && uint8Array[3] === 0x46) return 'application/pdf';
    if (uint8Array[0] === 0x50 && uint8Array[1] === 0x4B &&
        (uint8Array[2] === 0x03 || uint8Array[2] === 0x05 || uint8Array[2] === 0x07) &&
        (uint8Array[3] === 0x04 || uint8Array[3] === 0x06 || uint8Array[3] === 0x08)) {
      const asString = new TextDecoder().decode(uint8Array);
      if (asString.includes('[Content_Types].xml')) {
        if (asString.includes('word/')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        if (asString.includes('ppt/')) return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        if (asString.includes('xl/')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      }
      return 'application/zip';
    }
    if (uint8Array[0] === 0x52 && uint8Array[1] === 0x61 && uint8Array[2] === 0x72 && uint8Array[3] === 0x21 &&
        uint8Array[4] === 0x1A && uint8Array[5] === 0x07 && (uint8Array[6] === 0x00 || uint8Array[6] === 0x01)) return 'application/x-rar-compressed';
    if (uint8Array[0] === 0x37 && uint8Array[1] === 0x7A && uint8Array[2] === 0xBC && uint8Array[3] === 0xAF &&
        uint8Array[4] === 0x27 && uint8Array[5] === 0x1C) return 'application/x-7z-compressed';
    const ustar = new TextDecoder().decode(uint8Array.slice(257, 262));
    if (ustar === 'ustar') return 'application/x-tar';
    if (uint8Array[0] === 0xD0 && uint8Array[1] === 0xCF && uint8Array[2] === 0x11 && uint8Array[3] === 0xE0 &&
        uint8Array[4] === 0xA1 && uint8Array[5] === 0xB1 && uint8Array[6] === 0x1A && uint8Array[7] === 0xE1) return 'application/vnd.ms-office';
    if (uint8Array[4] === 0x66 && uint8Array[5] === 0x74 && uint8Array[6] === 0x79 && uint8Array[7] === 0x70) {
      const brand = String.fromCharCode(uint8Array[8], uint8Array[9], uint8Array[10], uint8Array[11]);
      if (['isom', 'iso2', 'mp41', 'mp42', 'avc1', 'M4V '].includes(brand)) return 'video/mp4';
      if (brand === 'qt  ') return 'video/quicktime';
      if (['3gp4', '3gp5', '3g2a'].includes(brand)) return 'video/3gpp';
    }
    if (uint8Array[0] === 0x1A && uint8Array[1] === 0x45 && uint8Array[2] === 0xDF && uint8Array[3] === 0xA3) return 'video/x-matroska';
    if (uint8Array[0] === 0x52 && uint8Array[1] === 0x49 && uint8Array[2] === 0x46 && uint8Array[3] === 0x46 &&
        uint8Array[8] === 0x41 && uint8Array[9] === 0x56 && uint8Array[10] === 0x49 && uint8Array[11] === 0x20) return 'video/x-msvideo';
    if (await isLikelyText(uint8Array)) return 'text/plain';
    return 'application/octet-stream';
  } catch (error) {
    console.error('Error detecting MIME type:', error);
    return 'application/octet-stream';
  }
}

async function isLikelyText(uint8Array) {
  const sample = uint8Array.slice(0, 512);
  const textChars = sample.filter(b =>
    (b >= 0x20 && b <= 0x7E) || b === 0x09 || b === 0x0A || b === 0x0D
  ).length;
  return (textChars / sample.length) > 0.95;
}

function getFileCategory(file, mimeType = '') {
  const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const videoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
  const audioTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
  const documentTypes = [
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ];
  const archiveTypes = ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed', 'application/x-tar'];
  if (imageTypes.includes(mimeType)) return 'image';
  if (videoTypes.includes(mimeType)) return 'video';
  if (audioTypes.includes(mimeType)) return 'audio';
  if (documentTypes.includes(mimeType)) return mimeType;
  if (archiveTypes.includes(mimeType)) return mimeType;

  const extension = file?.name?.split('.')?.pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) return 'image';
  if (['mp4', 'mov', 'avi', 'webm'].includes(extension)) return 'video';
  if (['mp3', 'wav', 'ogg'].includes(extension)) return 'audio';
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) return 'document';
  if (['zip', 'rar', '7z', 'tar'].includes(extension)) return 'archive';
  return 'document';
}

function getFileIcon(mimeType, fileName) {
  const extension = (fileName || '').split('.').pop().toLowerCase();
  if (mimeType === 'application/pdf' || extension === 'pdf') return '<i class="fas fa-file-pdf fa-2x"></i>';
  if ((mimeType || '').includes('word') || ['doc', 'docx'].includes(extension)) return '<i class="fas fa-file-word fa-2x"></i>';
  if ((mimeType || '').includes('excel') || ['xls', 'xlsx'].includes(extension)) return '<i class="fas fa-file-excel fa-2x"></i>';
  if ((mimeType || '').includes('powerpoint') || ['ppt', 'pptx'].includes(extension)) return '<i class="fas fa-file-powerpoint fa-2x"></i>';
  if (mimeType === 'text/plain' || extension === 'txt') return '<i class="fas fa-file-alt fa-2x"></i>';
  if (['zip', 'rar', '7z', 'tar'].includes(extension)) return '<i class="fas fa-file-archive fa-2x"></i>';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) return '<i class="fas fa-file-image fa-2x"></i>';
  if (['mp4', 'mov', 'avi', 'webm'].includes(extension)) return '<i class="fas fa-file-video fa-2x"></i>';
  if (['mp3', 'wav', 'ogg'].includes(extension)) return '<i class="fas fa-file-audio fa-2x"></i>';
  return '<i class="fas fa-file fa-2x"></i>';
}

function getDocClass(mimeType, fileName) {
  const extension = (fileName || '').split('.').pop().toLowerCase();
  if (mimeType === 'application/pdf' || extension === 'pdf') return 'is-pdf';
  if ((mimeType || '').includes('word') || ['doc', 'docx'].includes(extension)) return 'is-docx';
  if ((mimeType || '').includes('excel') || ['xls', 'xlsx'].includes(extension)) return 'is-xlsx';
  if ((mimeType || '').includes('powerpoint') || ['ppt', 'pptx'].includes(extension)) return 'is-pptx';
  return '';
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/* ============================================================
   MEDIA RENDERING (kept from v0, file URLs are escaped via DOM)
   ============================================================ */
async function dispalyFileToChat(bufferData, sender, msgTime, timeGroup, item = null) {
  let fileURL, fileName, fileSize, fileType, messageContent, mimeFileType, file_id;
  let time = msgTime;
  fileName = item?.fileName;
  file_id = item?.message;

  const uint8Array = new Uint8Array(bufferData.data);
  mimeFileType = await getMimeTypeFromBuffer(bufferData) || 'application/octet-stream';
  fileType = getFileCategory('', mimeFileType);
  const blob = new Blob([uint8Array], { type: fileType });

  fileURL = URL.createObjectURL(blob);
  fileSize = formatFileSize(bufferData.data.length);

  const safeName = escapeHtml(fileName);
  const safeURL = encodeURI(fileURL);
  const safeMime = escapeHtml(mimeFileType);

  switch (fileType) {
    case 'image':
      messageContent = `
        <div class="file-message-container">
          <div class="file-message image-message">
            <img src="${safeURL}" alt="${safeName}" class="chat-image">
            <div class="file-meta">
              <span class="file-name">${safeName}</span>
              <span class="file-size">${fileSize} |
                <a href="${safeURL}" download="${safeName}" class="download-btn">
                  <img src="download-icon.svg" alt="Download">
                </a>
              </span>
            </div>
          </div>
        </div>`;
      break;

    case 'video':
      messageContent = `
        <div class="file-message-container">
          <div class="file-message video-message">
            <video controls class="chat-video">
              <source src="${safeURL}" type="${safeMime}">
              Your browser doesn't support videos
            </video>
            <div class="file-meta">
              <span class="file-name">${safeName}</span>
              <span class="file-size">${fileSize} |
                <a href="${safeURL}" download="${safeName}" class="download-btn">
                  <img src="download-icon.svg" alt="Download">
                </a>
              </span>
            </div>
          </div>
        </div>`;
      break;

    case 'audio':
      messageContent = `
        <div class="file-message-container">
          <div class="file-message audio-message">
            <div class="audio-container">
              <audio controls class="chat-audio">
                <source src="${safeURL}" type="${safeMime}">
                Your browser doesn't support audio
              </audio>
            </div>
            <div class="file-meta">
              <span class="file-name">${safeName}</span>
              <span class="file-size">${fileSize} |
                <a href="${safeURL}" download="${safeName}" class="download-btn">
                  <img src="download-icon.svg" alt="Download">
                </a>
              </span>
            </div>
          </div>
        </div>`;
      break;

    default: {
      const docClass = getDocClass(mimeFileType, fileName);
      const innerIcon = docClass
        ? `<i class="fas fa-file-${docClass.replace('is-', '') === 'pdf' ? 'pdf' : docClass.replace('is-', '').replace('xlsx', 'excel').replace('docx', 'word').replace('pptx', 'powerpoint')}"></i>`
        : getFileIcon(mimeFileType, fileName);
      messageContent = `
        <div class="file-message-container">
          <div class="file-message document-message">
            <div class="document-icon ${docClass}">${innerIcon}</div>
            <div class="document-info">
              <span class="file-name">${safeName}</span>
              <span class="file-size">${fileSize}</span>
            </div>
            <a href="${safeURL}" download="${safeName}" class="download-btn">
              <img src="download-icon.svg" alt="Download">
            </a>
          </div>
        </div>`;
    }
  }

  await appendMessage(messageContent, sender, time, timeGroup, file_id, item, /* isHtml */ true);
}

/* ============================================================
   FILE UPLOAD HANDLER (kept from v0)
   ============================================================ */
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

    let messageContent = '';
    const time = getCurrentTime();

    switch (fileCategory) {
      case 'image':
        messageContent = `
          <div class="file-message-container">
            <div class="file-message image-message">
              <img src="${safeURL}" alt="${safeName}" class="chat-image">
              <div class="file-meta">
                <span class="file-name">${safeName}</span>
                <span class="file-size">${fileSize}</span>
              </div>
            </div>
          </div>`;
        break;
      case 'video':
        messageContent = `
          <div class="file-message-container">
            <div class="file-message video-message">
              <video controls class="chat-video">
                <source src="${safeURL}" type="${safeMime}">
                Your browser doesn't support videos
              </video>
              <div class="file-meta">
                <span class="file-name">${safeName}</span>
                <span class="file-size">${fileSize}</span>
              </div>
            </div>
          </div>`;
        break;
      case 'audio':
        messageContent = `
          <div class="file-message-container">
            <div class="file-message audio-message">
              <div class="audio-container">
                <audio controls class="chat-audio">
                  <source src="${safeURL}" type="${safeMime}">
                  Your browser doesn't support audio
                </audio>
              </div>
              <div class="file-meta">
                <span class="file-name">${safeName}</span>
                <span class="file-size">${fileSize}</span>
              </div>
            </div>
          </div>`;
        break;
      default: {
        const docClass = getDocClass(fileType, fileName);
        const innerIcon = docClass
          ? `<i class="fas fa-file-${docClass.replace('is-', '') === 'pdf' ? 'pdf' : docClass.replace('is-', '').replace('xlsx', 'excel').replace('docx', 'word').replace('pptx', 'powerpoint')}"></i>`
          : getFileIcon(fileType, fileName);
        messageContent = `
          <div class="file-message-container">
            <div class="file-message document-message">
              <div class="document-icon ${docClass}">${innerIcon}</div>
              <div class="document-info">
                <span class="file-name">${safeName}</span>
                <span class="file-size">${fileSize}</span>
              </div>
              <a href="${safeURL}" download="${safeName}" class="download-btn">
                <img src="download-icon.svg" alt="Download">
              </a>
            </div>
          </div>`;
      }
    }

    const newMessage = { type: 'Outbound', message: null, outboundDate: time };
    if (!fistLoad) fistLoadData.push(newMessage);

    await appendMessage(messageContent, 'user', time, 'time-group', null, { 'status': 'sent' }, /* isHtml */ true);

    try {
      const uploadedFile = await uploadFileToAisensy(file);
      const document_id = typeof uploadedFile === "string" ? JSON.parse(uploadedFile) : uploadedFile;
      await sendMessageToBackend(templateData, fileCategory, document_id?.id, time, fileName);
    } catch (err) {
      console.error('File upload chain failed', err);
    }

    timerInterval = setInterval(() => { loadAllMessages(listofdata); }, POLL_INTERVAL_MS);
    event.target.value = '';
  };
  reader.readAsDataURL(file);
}

/* ============================================================
   DELUGE: SEND (kept logic, refactored a bit)
   ============================================================ */
function sendMessageToBackend(data, file_type = '', media_id = '', time = '', media_name = '') {
  let media_type = '';
  const mediaFileType = ['image', 'video', 'audio'];

  if (!mediaFileType.includes(file_type) && media_id != '') {
    media_type = 'document';
  }
  if (mediaFileType.includes(file_type) && media_id != '') {
    media_type = file_type;
  }

  return new Promise((resolve, reject) => {
    const func_name = "aisensypro__get_aisensy_template_details_for_detail_page";

    // For template sends, enrich the template object with resolved variable values.
    // The Deluge function may use either:
    //   (a) templateParams array (standard AiSensy format), OR
    //   (b) The pre-substituted body text
    // We provide BOTH so whichever path the function takes, it gets correct data.
    let outgoingTemplate = currentTemplate;
    if (tabSelcted !== 'reply' && currentTemplate && currentTemplateVars && Object.keys(currentTemplateVars).length > 0) {
      const vars = Object.keys(currentTemplateVars).sort((a, b) => parseInt(a) - parseInt(b));
      const templateParams = vars.map(k => String(currentTemplateVars[k] || ''));

      let substitutedBody = currentTemplate.body || '';
      vars.forEach(v => {
        const val = currentTemplateVars[v] || '';
        substitutedBody = substitutedBody.replaceAll(`{{${v}}}`, val);
      });

      outgoingTemplate = {
        ...currentTemplate,
        body: substitutedBody,
        templateParams: templateParams,
        // Also include the raw map for debugging
        _resolvedVars: currentTemplateVars
      };
      console.log('[v3] Sending template with resolved vars:', { templateName: currentTemplate.name, templateParams });
    }

    const body_args = media_type == '' ? {
      "arguments": JSON.stringify({
        [tabSelcted == 'reply' ? "message" : "template"]: tabSelcted == 'reply' ? userInput.value : outgoingTemplate,
        "leadIds": data?.EntityId,
        "outbound_date_time": time
      })
    } : {
      "arguments": JSON.stringify({
        media_type, media_id, media_name,
        "leadIds": data?.EntityId,
        "outbound_date_time": time
      })
    };

    ZOHO.CRM.FUNCTIONS.execute(func_name, body_args)
      .then(function (response) {
        try {
          const parsedResponse = typeof response === "string" ? JSON.parse(response) : response;
          if (parsedResponse?.code === 'success') resolve(parsedResponse);
          else reject(parsedResponse);
        } catch (parseError) {
          console.error("JSON Parsing Error:", parseError);
          reject(parseError);
        }
      })
      .catch(function (error) {
        console.error("Error sending message:", error);
        reject(error);
      });
  });
}

/* ============================================================
   SEND MESSAGE (template or reply)
   ============================================================ */
async function sendMessage() {
  clearInterval(timerInterval);

  const message = userInput.value.trim();
  const time = getCurrentTime();
  const newMessage = { type: 'Outbound', message: null, outboundDate: time };

  if (!fistLoad) fistLoadData.push(newMessage);

  if (tabSelcted == 'templates' && currentTemplate == null) return;
  if (message === "") return;

  try {
    await appendMessage(message, 'user', time, 'time-group', null, { 'status': 'sent' });
    sendMessageToBackend(templateData, '', '', time);
    userInput.value = "";
  } catch (error) {
    console.error("Failed to send to backend:", error);
  }

  timerInterval = setInterval(() => { loadAllMessages(listofdata); }, POLL_INTERVAL_MS);
}

userInput.addEventListener('keypress', function (event) {
  if (event.key === 'Enter' || event.keyCode === 13) {
    sendMessage();
    event.preventDefault();
  }
});

/* ============================================================
   STATUS TICKS
   ============================================================ */
function updateMessageTicks(messageObj) {
  const div = document.querySelector(`div[data-date-time="${messageObj.outboundDate}"]`);
  if (!div || messageObj.type !== "Outbound") return;

  let ticks = div.querySelector('.ticks');
  if (!ticks) {
    // Find or create footer in this message
    let footer = div.querySelector('.msg-footer');
    if (!footer) {
      footer = document.createElement('div');
      footer.className = 'msg-footer';
      div.appendChild(footer);
    }
    ticks = document.createElement('span');
    ticks.className = 'ticks';
    footer.appendChild(ticks);
  }

  ticks.innerHTML = '';
  ticks.classList.remove('read', 'delivered', 'failed');

  if (messageObj?.status === "sent") {
    ticks.innerHTML = `<i class="tick">✓</i>`;
  } else if (messageObj?.status === "delivered" || messageObj?.status === "read") {
    ticks.innerHTML = `<i class="tick">✓</i><i class="tick">✓</i>`;
    ticks.classList.add(messageObj?.status === "read" ? "read" : "delivered");
  } else if (messageObj?.status == "failed") {
    ticks.classList.add('failed');
    ticks.innerHTML = `<button class="retry-button" type="button">Message failed!</button>`;
  }
}

/* ============================================================
   APPEND MESSAGE (XSS-safe for text; allows trusted HTML for media)
   ============================================================ */
async function appendMessage(text, sender, msgTime, group = 'normal-group', fileId = null, dataObj = {}, isHtml = false) {
  let absoluteTime = formatTime(msgTime);
  let file_id = dataObj?.message;
  let isInbound = sender !== 'user' && sender !== 'Outbound';

  // Update existing message (file id reuse)
  if (file_id && document.getElementById(file_id)) {
    const existingDiv = document.getElementById(file_id);
    while (existingDiv.firstChild) existingDiv.removeChild(existingDiv.firstChild);

    if (text === "type-file") {
      existingDiv.innerHTML = fileLoader;
    } else {
      const bodyEl = document.createElement('span');
      bodyEl.className = 'msg-body';
      if (isHtml) bodyEl.innerHTML = text;
      else bodyEl.textContent = text;
      existingDiv.appendChild(bodyEl);
      appendMessageFooter(existingDiv, msgTime, dataObj, sender);
    }
    existingDiv.setAttribute("data-time", absoluteTime);
    existingDiv.setAttribute("data-date-time", msgTime);
    existingDiv.className = `${sender === "user" || sender === "Outbound" ? "user-message" : "bot-message"} ${group === 'time-group' ? group : 'normal-group'}`;
    return;
  }

  // Build new message div
  const messageDiv = document.createElement("div");
  const isOutbound = sender === 'user' || sender === 'Outbound';
  messageDiv.classList.add(isOutbound ? "user-message" : "bot-message");
  messageDiv.classList.add(group === 'time-group' ? group : 'normal-group');
  messageDiv.setAttribute("data-time", absoluteTime);
  messageDiv.setAttribute("data-date-time", msgTime);

  // Mark inbound as unread if it arrived after lastViewedAt
  if (!isOutbound && lastViewedAt) {
    const msgT = new Date(msgTime).getTime();
    if (msgT > lastViewedAt) {
      messageDiv.classList.add('unread');
      unreadCount++;
      refreshUnreadBadge();
    }
  }

  if (text === "type-file") {
    messageDiv.innerHTML = fileLoader;
    if (file_id) messageDiv.id = file_id;
  } else {
    const bodyEl = document.createElement('span');
    bodyEl.className = 'msg-body';
    if (isHtml) {
      bodyEl.innerHTML = text;
    } else {
      bodyEl.textContent = text;
    }
    messageDiv.appendChild(bodyEl);
    appendMessageFooter(messageDiv, msgTime, dataObj, sender);
  }

  chatBody.appendChild(messageDiv);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function appendMessageFooter(messageDiv, msgTime, dataObj, sender) {
  const footer = document.createElement('div');
  footer.className = 'msg-footer';

  const timeEl = document.createElement('span');
  timeEl.className = 'msg-time';
  timeEl.dataset.iso = msgTime;
  timeEl.textContent = formatRelativeTime(msgTime);
  footer.appendChild(timeEl);

  const isOutbound = sender === 'user' || sender === 'Outbound';
  if (isOutbound) {
    const ticks = document.createElement("span");
    ticks.classList.add("ticks");
    if (dataObj?.status === "sent") {
      ticks.innerHTML = `<i class="tick">&#10003;</i>`;
    } else if (dataObj?.status === "delivered" || dataObj?.status === "read") {
      ticks.innerHTML = `<i class="tick">&#10003;</i><i class="tick">&#10003;</i>`;
      ticks.classList.add(dataObj?.status === "read" ? "read" : "delivered");
    } else if (dataObj?.status == "failed") {
      ticks.classList.add('failed');
      ticks.innerHTML = `<button class="retry-button" type="button">Message failed!</button>`;
    }
    footer.appendChild(ticks);
  }

  messageDiv.appendChild(footer);
}

/* ============================================================
   SORT + REGROUP (run AFTER all async work completes)
   ============================================================ */
function sortMessages() {
  const messages = Array.from(chatBody.querySelectorAll('.user-message, .bot-message'));
  messages.sort((a, b) => new Date(a.getAttribute('data-date-time')) - new Date(b.getAttribute('data-date-time')));

  // Wipe and rebuild
  chatBody.innerHTML = '';

  let currentDate = null;
  let unreadDividerPlaced = false;

  messages.forEach((message, idx) => {
    const messageDate = new Date(message.getAttribute('data-date-time'));
    const dateLabelText = formatDateLabel(message.getAttribute('data-date-time'));

    if (dateLabelText !== currentDate) {
      currentDate = dateLabelText;
      const dateLabel = document.createElement('div');
      dateLabel.className = 'date-label';
      dateLabel.textContent = dateLabelText;
      chatBody.appendChild(dateLabel);
    }

    // Insert unread divider before first unread message
    if (!unreadDividerPlaced && message.classList.contains('unread')) {
      const div = document.createElement('div');
      div.className = 'unread-divider';
      div.textContent = '↓ New messages';
      chatBody.appendChild(div);
      unreadDividerPlaced = true;
    }

    chatBody.appendChild(message);
  });

  regroupMessages();
  chatBody.scrollTop = chatBody.scrollHeight;
}

function regroupMessages() {
  const msgs = Array.from(chatBody.querySelectorAll('.user-message, .bot-message'));
  msgs.forEach(el => el.classList.remove('same-sender', 'last-in-group'));

  msgs.forEach((el, i) => {
    const next = msgs[i + 1];
    const prev = msgs[i - 1];
    const dir = el.classList.contains('user-message') ? 'out' : 'in';
    const nextDir = next ? (next.classList.contains('user-message') ? 'out' : 'in') : null;
    const prevDir = prev ? (prev.classList.contains('user-message') ? 'out' : 'in') : null;

    // Same-sender: previous element in chat body is same-direction message
    if (prevDir === dir && areAdjacent(prev, el)) {
      el.classList.add('same-sender');
    }
    // Last-in-group: no next element, or next is different direction, or a non-message between
    if (!next || nextDir !== dir || !areAdjacent(el, next)) {
      el.classList.add('last-in-group');
    }
  });
}

function areAdjacent(a, b) {
  let n = a.nextElementSibling;
  while (n && n !== b) {
    if (n.classList.contains('date-label') || n.classList.contains('unread-divider')) return false;
    n = n.nextElementSibling;
  }
  return n === b;
}

/* ============================================================
   IS-NEW DEDUP (kept from v0)
   ============================================================ */
function isNewMessage(newMessage, records) {
  if (newMessage?.outboundDate) {
    return records?.some(record =>
      record?.outboundDate === newMessage.outboundDate &&
      record?.type === newMessage.type
    );
  } else {
    return records?.some(record =>
      record?.date_time === newMessage.date_time &&
      (record?.type === newMessage.type)
    );
  }
}

/* ============================================================
   LOAD ALL MESSAGES (refactored: awaits async work before sort)
   ============================================================ */
async function loadAllMessages(data) {
  if (!data || !data.EntityId) return;
  console.log('load all messages call');

  const req_msg = { "arguments": JSON.stringify({ "leadIds": data?.EntityId }) };
  const fun_name_load_message = 'allWaCommunications';

  try {
    const response = await ZOHO.CRM.FUNCTIONS.execute(fun_name_load_message, req_msg);
    const parsedResponse = typeof response === "string" ? JSON.parse(response) : response;

    if (parsedResponse?.code !== 'success') {
      console.error("API Error:", parsedResponse);
      return;
    }

    const loadData = JSON.parse(parsedResponse?.details?.output);
    const sortedMessages = (loadData?.recordList || []).sort((a, b) =>
      new Date(a.date_time) - new Date(b.date_time)
    );

    Countdown.init(loadData?.replyDateTime ? new Date(loadData?.replyDateTime) : null);

    if (fistLoad) fistLoadData = [...sortedMessages];

    // Collect all append promises so sort runs after they resolve
    const appendPromises = [];

    for (const item of sortedMessages) {
      if (item?.type === 'Outbound') {
        updateMessageTicks(item);
      }

      const isAlreadyKnown = isNewMessage(item, fistLoadData);
      const shouldRender = (isAlreadyKnown && fistLoad) || !isAlreadyKnown;
      if (!shouldRender) continue;

      const messageTime = new Date(item.date_time).getTime();
      if (lastRenderedTime && messageTime <= new Date(lastRenderedTime).getTime() && !fistLoad) {
        continue;
      }

      const text = item?.message?.replaceAll?.('{{1}}', userName) || item?.message;
      const sender = item.type === "Incomming" ? "bot" : "user";
      const time = item.date_time;

      if (item?.message_type != null && item?.message_type !== 'text' && item?.message_type !== 'template') {
        const p = (async () => {
          await appendMessage('type-file', sender, time, 'time-group', null, item);
          try {
            const mediaFile = await GetFileFromAisensy(item?.message);
            await dispalyFileToChat(mediaFile, sender, time, 'time-group', item);
          } catch (e) {
            console.error('media fetch failed', e);
          }
        })();
        appendPromises.push(p);
      } else {
        appendPromises.push(appendMessage(text, sender, time, 'time-group', null, item));
      }

      lastRenderedTime = item.date_time;
    }

    // CRITICAL FIX: await all async work before sorting
    await Promise.all(appendPromises);

    fistLoad = false;
    sortMessages();

    // After first load, set lastViewedAt to now (after a short delay so user actually sees)
    if (!lastViewedAt && data?.EntityId) {
      setTimeout(() => {
        lastViewedAt = Date.now();
        try {
          localStorage.setItem(STORAGE_KEY_PREFIX + data.EntityId, String(lastViewedAt));
        } catch (e) {}
      }, 2000);
    }
  } catch (error) {
    console.error("Error fetching messages:", error);
  }
}

/* ============================================================
   AISENSY DIRECT FETCH (kept from v0)
   ============================================================ */
async function GetFileFromAisensy(mediaId) {
  const response = await fetch('https://backend.aisensy.com/direct-apis/t1/get-media', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + AISENSY_TOKEN
    },
    body: JSON.stringify({ id: mediaId })
  });
  if (!response.ok) {
    const typingIndicator = document.querySelector('.typing-indicator');
    if (typingIndicator) typingIndicator.remove();
    throw new Error(`Media fetch failed with status ${response.status}`);
  }
  return await response.json();
}

async function uploadFileToAisensy(file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('https://backend.aisensy.com/direct-apis/t1/media', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Authorization': 'Bearer ' + AISENSY_TOKEN
    },
    body: formData
  });
  if (!response.ok) {
    const typingIndicator = document.querySelector('.typing-indicator');
    if (typingIndicator) typingIndicator.remove();
    throw new Error(`Upload failed with status ${response.status}`);
  }
  return await response.json();
}

/* ============================================================
   LEAD DETAILS (extended: phone + status)
   ============================================================ */
async function fetchLeadDetails(data) {
  try {
    const response = await ZOHO.CRM.API.getRecord({
      Entity: "Leads",
      approved: "both",
      RecordID: data.EntityId
    });
    const details = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
    const lead = details[0] || {};

    userName = lead?.Full_Name || lead?.First_Name || 'Lead';
    leadPhone = lead?.Mobile || lead?.Phone || null;
    userFullName.textContent = userName;
    leadAvatarEl.textContent = getInitials(userName);
    leadPhoneEl.textContent = leadPhone ? formatPhoneDisplay(leadPhone) : 'No phone';

    const status = lead?.Lead_Status || null;
    if (status) {
      const lower = status.toLowerCase();
      let dotClass = 'status-dot--unknown';
      if (lower.includes('contacted') || lower.includes('qualified') || lower.includes('active')) {
        dotClass = 'status-dot--online';
      } else if (lower.includes('not') || lower.includes('lost') || lower.includes('dead')) {
        dotClass = 'status-dot--offline';
      } else if (lower.includes('attempt') || lower.includes('pending')) {
        dotClass = 'status-dot--warn';
      }
      statusDotEl.className = 'status-dot ' + dotClass;
      statusTextEl.textContent = status;
    } else {
      statusDotEl.className = 'status-dot status-dot--unknown';
      statusTextEl.textContent = 'Lead';
    }
  } catch (error) {
    console.error("Error fetching lead details:", error);
    userFullName.textContent = 'Lead';
  }
}

/* ============================================================
   TAB SWITCHING (kept from v0)
   ============================================================ */
const tabs = document.querySelectorAll('input[name="tabs"]');
tabs.forEach(tab => {
  tab.addEventListener('change', function () {
    if (this.checked) {
      switch (this.value) {
        case 'templates':
          tabSelcted = 'templates';
          searchInput.value = '';
          searchInput.placeholder = 'Select Template';
          updateEmojiButton('templates');
          break;
        case 'reply':
          tabSelcted = 'reply';
          searchInput.value = '';
          searchInput.placeholder = 'Send Message';
          dropdownList.style.display = "none";
          updateEmojiButton('reply');
          hideTemplateVarInputs();
          break;
      }
    }
  });
});

/* ============================================================
   THREAD SEARCH
   ============================================================ */
function openThreadSearch() {
  searchBarEl.classList.add('open');
  threadSearchInput.focus();
}

function closeThreadSearch() {
  searchBarEl.classList.remove('open');
  threadSearchInput.value = '';
  clearThreadSearchHighlights();
  threadSearchMatches = [];
  threadSearchActiveIdx = -1;
  updateThreadSearchCount();
}

function clearThreadSearchHighlights() {
  document.querySelectorAll('.msg-body').forEach(body => {
    const original = body.dataset.originalText;
    if (original !== undefined) {
      body.textContent = original;
    }
  });
}

function runThreadSearch(term) {
  clearThreadSearchHighlights();
  threadSearchMatches = [];
  threadSearchActiveIdx = -1;

  if (!term || term.length < 2) {
    updateThreadSearchCount();
    return;
  }

  const lowerTerm = term.toLowerCase();
  const bodies = chatBody.querySelectorAll('.msg-body');

  bodies.forEach(body => {
    // Skip if has child HTML elements (media); only text bodies are searchable
    if (body.querySelector('.file-message-container')) return;
    const text = body.textContent;
    if (body.dataset.originalText === undefined) {
      body.dataset.originalText = text;
    }
    const lower = text.toLowerCase();
    let idx = lower.indexOf(lowerTerm);
    if (idx === -1) return;

    body.innerHTML = '';
    let cursor = 0;
    while (idx !== -1) {
      if (idx > cursor) body.appendChild(document.createTextNode(text.substring(cursor, idx)));
      const mark = document.createElement('span');
      mark.className = 'search-highlight';
      mark.textContent = text.substring(idx, idx + term.length);
      body.appendChild(mark);
      threadSearchMatches.push(mark);
      cursor = idx + term.length;
      idx = lower.indexOf(lowerTerm, cursor);
    }
    if (cursor < text.length) body.appendChild(document.createTextNode(text.substring(cursor)));
  });

  if (threadSearchMatches.length > 0) {
    threadSearchActiveIdx = 0;
    activateThreadMatch(0);
  }
  updateThreadSearchCount();
}

function activateThreadMatch(idx) {
  threadSearchMatches.forEach((m, i) => m.classList.toggle('active', i === idx));
  if (threadSearchMatches[idx]) {
    threadSearchMatches[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  updateThreadSearchCount();
}

function updateThreadSearchCount() {
  if (threadSearchMatches.length === 0) {
    searchCountEl.textContent = '0 / 0';
  } else {
    searchCountEl.textContent = (threadSearchActiveIdx + 1) + ' / ' + threadSearchMatches.length;
  }
}

function nextThreadMatch() {
  if (threadSearchMatches.length === 0) return;
  threadSearchActiveIdx = (threadSearchActiveIdx + 1) % threadSearchMatches.length;
  activateThreadMatch(threadSearchActiveIdx);
}

function prevThreadMatch() {
  if (threadSearchMatches.length === 0) return;
  threadSearchActiveIdx = (threadSearchActiveIdx - 1 + threadSearchMatches.length) % threadSearchMatches.length;
  activateThreadMatch(threadSearchActiveIdx);
}

searchToggleEl?.addEventListener('click', openThreadSearch);
searchCloseEl?.addEventListener('click', closeThreadSearch);
threadSearchInput?.addEventListener('input', e => runThreadSearch(e.target.value));
threadSearchInput?.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    e.shiftKey ? prevThreadMatch() : nextThreadMatch();
  } else if (e.key === 'Escape') {
    closeThreadSearch();
  }
});
searchPrevEl?.addEventListener('click', prevThreadMatch);
searchNextEl?.addEventListener('click', nextThreadMatch);

refreshBtnEl?.addEventListener('click', async () => {
  refreshBtnEl.disabled = true;

  // If there are unread messages, scroll to them and clear state
  if (unreadCount > 0) {
    const firstUnread = chatBody.querySelector('.bot-message.unread');
    if (firstUnread) {
      firstUnread.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setTimeout(() => {
      clearUnreadState();
      refreshBtnEl.disabled = false;
    }, 800);
    return;
  }

  // Otherwise: standard refresh
  refreshBtnEl.style.opacity = '0.5';
  try {
    await loadAllMessages(listofdata);
  } finally {
    setTimeout(() => {
      refreshBtnEl.disabled = false;
      refreshBtnEl.style.opacity = '1';
    }, 600);
  }
});

/* ============================================================
   IMAGE LIGHTBOX (click to zoom)
   ============================================================ */
chatBody.addEventListener('click', (e) => {
  const img = e.target.closest('.chat-image');
  if (!img) return;
  openImageLightbox(img.src, img.alt);
});

function openImageLightbox(src, alt) {
  const overlay = document.createElement('div');
  overlay.className = 'image-lightbox';
  overlay.innerHTML = `
    <button class="image-lightbox-close" aria-label="Close">&times;</button>
    <img src="${encodeURI(src)}" alt="${escapeHtml(alt || '')}">
  `;
  overlay.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
  document.addEventListener('keydown', function escHandler(ev) {
    if (ev.key === 'Escape') {
      overlay.remove();
      document.removeEventListener('keydown', escHandler);
    }
  });
}

/* ============================================================
   AUTO-CLEAR UNREAD WHEN USER SCROLLS TO BOTTOM
   ============================================================ */
chatBody.addEventListener('scroll', () => {
  if (unreadCount === 0) return;
  const atBottom = chatBody.scrollHeight - chatBody.scrollTop - chatBody.clientHeight < 50;
  if (atBottom) clearUnreadState();
});

/* ============================================================
   DROPDOWN CLOSE-ON-OUTSIDE (kept, deduped)
   ============================================================ */
document.addEventListener("click", function (event) {
  if (!event.target.matches("#searchInput") && !dropdownList.contains(event.target)) {
    dropdownList.style.display = "none";
  }
  if (tabSelcted === 'reply') {
    currentTemplate = null;
    dropdownList.style.display = "none";
  }
});

/* ============================================================
   POLLING + VISIBILITY (10s interval)
   ============================================================ */
timerInterval = setInterval(() => { loadAllMessages(listofdata); }, POLL_INTERVAL_MS);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearInterval(timerInterval);
  } else {
    timerInterval = setInterval(() => { loadAllMessages(listofdata); }, POLL_INTERVAL_MS);
  }
});

/* ============================================================
   PAGE LOAD INIT
   ============================================================ */
ZOHO.embeddedApp.on("PageLoad", async (data) => {
  // FIX: per-lead state reset (prevents lastRenderedTime leak)
  if (listofdata && listofdata.EntityId !== data.EntityId) {
    lastRenderedTime = null;
    fistLoad = true;
    fistLoadData = [];
    unreadDividerInserted = false;
    unreadCount = 0;
    lastViewedAt = null;
    chatBody.innerHTML = '';
    refreshUnreadBadge();
  }

  templateData = data;
  listofdata = data;

  // Load lastViewedAt for this lead
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PREFIX + data.EntityId);
    if (stored) lastViewedAt = parseInt(stored, 10);
  } catch (e) {}

  await fetchLeadDetails(data);
  await loadAllMessages(data);

  // Start relative-time auto-refresh
  if (relativeTimeInterval) clearInterval(relativeTimeInterval);
  relativeTimeInterval = setInterval(refreshAllRelativeTimes, 60000);

  /* ----- Templates ----- */
  // (Module-level state: clotusTemplateMetaByName, currentTemplateVars, activeLeadFields
  //  declared at the top so sendMessageToBackend can reference them.)

  async function fetchClotusTemplateMeta() {
    try {
      const resp = await ZOHO.CRM.API.getAllRecords({
        Entity: 'Clotus_WA_Templates',
        per_page: 200,
        page: 1
      });
      const list = typeof resp.data === 'string' ? JSON.parse(resp.data) : resp.data;
      const map = {};
      (list || []).forEach(rec => {
        if (rec.Name) {
          let fieldMap = {};
          if (rec.Variable_Field_Map) {
            try { fieldMap = JSON.parse(rec.Variable_Field_Map); } catch (e) { fieldMap = {}; }
          }
          map[rec.Name] = {
            id: rec.id,
            variable_field_map: fieldMap,
            variable_count: parseInt(rec.Variable_Count, 10) || 0,
            body_text: rec.Body_Text || '',
            status: rec.Status
          };
        }
      });
      clotusTemplateMetaByName = map;
      console.log('[v3] Loaded', Object.keys(map).length, 'template field maps from Clotus_WA_Templates');
    } catch (e) {
      console.warn('[v3] Could not fetch Clotus_WA_Templates field maps — falling back to userName substitution', e);
      clotusTemplateMetaByName = {};
    }
  }

  async function fetchActiveLeadFields(leadId) {
    if (!leadId) return null;
    if (activeLeadFields && activeLeadFields.__lead_id === leadId) return activeLeadFields;
    try {
      const resp = await ZOHO.CRM.API.getRecord({ Entity: 'Leads', RecordID: leadId });
      const rec = typeof resp.data === 'string' ? JSON.parse(resp.data) : resp.data;
      const r = Array.isArray(rec) ? rec[0] : rec;
      if (r) {
        r.__lead_id = leadId;
        activeLeadFields = r;
        return r;
      }
    } catch (e) {
      console.warn('[v3] fetchActiveLeadFields failed', e);
    }
    return null;
  }

  /* Resolve a CRM field API name to a display value from the lead record.
     Handles lookup fields (returns .name), nested fields. */
  function resolveLeadFieldValue(leadRec, fieldApiName) {
    if (!leadRec || !fieldApiName) return '';
    const v = leadRec[fieldApiName];
    if (v == null) return '';
    if (typeof v === 'object') return v.name || v.id || '';
    return String(v);
  }

  /* Extract distinct variable numbers from a template body (e.g. "{{1}} {{3}}" → ['1','3']) */
  function extractTemplateVars(bodyText) {
    if (!bodyText) return [];
    const matches = bodyText.match(/\{\{(\d+)\}\}/g) || [];
    return [...new Set(matches.map(m => m.replace(/[\{\}]/g, '')))].sort((a, b) => parseInt(a) - parseInt(b));
  }

  /* Render the variable inputs strip above the composer */
  function renderTemplateVarInputs(template, leadRec) {
    const strip = document.getElementById('tmplVarsStrip');
    const list = document.getElementById('tmplVarsList');
    if (!strip || !list) return;

    const vars = extractTemplateVars(template.body);
    if (vars.length === 0) {
      strip.classList.add('hidden');
      list.innerHTML = '';
      currentTemplateVars = {};
      return;
    }

    const meta = clotusTemplateMetaByName[template.name];
    const fieldMap = meta?.variable_field_map || {};
    currentTemplateVars = {};

    list.innerHTML = '';
    vars.forEach(v => {
      const apiName = fieldMap[v] || '';
      const resolved = apiName ? resolveLeadFieldValue(leadRec, apiName) : '';
      currentTemplateVars[v] = resolved;

      const row = document.createElement('div');
      row.className = 'tmpl-var-row';

      const isEmpty = !resolved;
      const metaText = apiName
        ? `from <b>${escapeHtmlSafe(apiName)}</b>${isEmpty ? ' (empty — please fill)' : ''}`
        : '<em>no field mapped — please enter a value</em>';

      row.innerHTML = `
        <span class="tmpl-var-badge">{{${v}}}</span>
        <div>
          <input type="text"
                 class="tmpl-var-input ${isEmpty ? 'is-empty' : ''}"
                 data-var="${v}"
                 placeholder="Enter value for {{${v}}}"
                 value="${escapeHtmlAttr(resolved)}">
          <div class="tmpl-var-meta">${metaText}</div>
        </div>
      `;
      list.appendChild(row);
    });

    // Wire input change → update state + refresh preview in searchInput
    list.querySelectorAll('input.tmpl-var-input').forEach(input => {
      input.addEventListener('input', e => {
        const v = e.target.dataset.var;
        currentTemplateVars[v] = e.target.value;
        if (e.target.value.trim()) e.target.classList.remove('is-empty');
        else e.target.classList.add('is-empty');
        // Live-refresh the preview text in the composer input
        refreshTemplatePreview();
      });
    });

    strip.classList.remove('hidden');
  }

  /* Rebuild the searchInput.value preview by substituting current var values into the body */
  function refreshTemplatePreview() {
    if (!currentTemplate || !templateContent) return;
    let preview = templateContent;
    Object.keys(currentTemplateVars).forEach(v => {
      const value = currentTemplateVars[v] || `{{${v}}}`;
      preview = preview.replaceAll(`{{${v}}}`, value);
    });
    searchInput.value = preview;
  }

  /* Helpers to safely insert into HTML/attrs */
  function escapeHtmlSafe(s) {
    if (s == null) return '';
    const div = document.createElement('div');
    div.textContent = String(s);
    return div.innerHTML;
  }
  function escapeHtmlAttr(s) {
    return escapeHtmlSafe(s).replace(/"/g, '&quot;');
  }

  /* Hide variable inputs strip — used when switching to Reply tab or clearing template */
  function hideTemplateVarInputs() {
    const strip = document.getElementById('tmplVarsStrip');
    if (strip) strip.classList.add('hidden');
    currentTemplateVars = {};
  }

  async function fetchTemplates() {
    loader.style.display = "inline-block";
    try {
      const req_data = {
        parameters: {},
        headers: { "Authorization": "Bearer " + AISENSY_TOKEN },
        method: "GET",
        url: "https://backend.aisensy.com/direct-apis/t1/get-templates"
      };
      const aisensyTempplateData = await ZOHO.CRM.HTTP.get(req_data);
      const parsedResponse = typeof aisensyTempplateData === "string" ? JSON.parse(aisensyTempplateData) : aisensyTempplateData;
      templates = parsedResponse?.data?.map(template => {
        const bodyComponent = template.components.find(comp => comp.type === "BODY");
        return {
          id: template.id,
          name: template.name,
          body: bodyComponent ? bodyComponent.text : "No body text available"
        };
      });
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      loader.style.display = "none";
    }
  }

  async function loadTemplates(loadTemp = null) {
    if (tabSelcted == 'reply') return;
    if (templates.length === 0) await fetchTemplates();
    dropdownList.innerHTML = "";
    templates.forEach(template => {
      const item = document.createElement("div");
      item.textContent = template.name;
      item.onclick = () => showTemplate(template);
      dropdownList.appendChild(item);
    });
    if (!loadTemp && templates.length) {
      dropdownList.style.display = "block";
    }
  }

  window.filterTemplates = function () {
    if (tabSelcted == 'reply') return;
    const searchTerm = searchInput.value.toLowerCase();
    dropdownList.innerHTML = "";
    const filtered = templates.filter(template => template.name.toLowerCase().includes(searchTerm));
    if (filtered.length === 0) {
      currentTemplate = null;
      const div = document.createElement('div');
      div.textContent = 'No results found';
      dropdownList.appendChild(div);
    } else {
      filtered.forEach(template => {
        const item = document.createElement("div");
        item.textContent = template.name;
        item.onclick = () => showTemplate(template);
        dropdownList.appendChild(item);
      });
      dropdownList.style.display = "block";
    }
  };

  async function showTemplate(template) {
    currentTemplate = typeof template === "string" ? JSON.parse(template) : template;
    searchInput.value = currentTemplate?.name;
    templateContent = currentTemplate?.body;

    // Pull lead's record (cached) so we can pre-fill variable values
    const leadRec = await fetchActiveLeadFields(data?.EntityId);
    // Render the editable var inputs from the field map
    renderTemplateVarInputs(currentTemplate, leadRec);
    // And preview the substituted body in the composer input
    refreshTemplatePreview();
  }

  searchInput.addEventListener("click", () => loadTemplates());

  searchInput.addEventListener("keyup", function () {
    const searchTerm = searchInput.value.trim();
    if (searchTerm === "") {
      searchInput.value = "";
      currentTemplate = null;
      hideTemplateVarInputs();
      loadTemplates();
    }
  });

  searchInput.addEventListener("input", window.filterTemplates);

  // Load AiSensy templates list + Clotus_WA_Templates field-map cache in parallel
  Promise.all([loadTemplates('load'), fetchClotusTemplateMeta()]).catch(e => console.warn('[v3] Init load partial failure', e));
});

ZOHO.embeddedApp.init();
