/* ============================================================
   Clotus WhatsApp Templates — Web Tab
   ============================================================
   - Lists templates from AiSensy direct API
   - Creates new templates via AiSensy API
   - Mirrors records in CRM module (when configured)
   ============================================================ */

const AISENSY_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhc3Npc3RhbnRJZCI6IjY2ZTAzMWNhYzEzMTY2MGI3ODc2NWFjNSIsImNsaWVudElkIjoiNjZlMDMxY2FjMTMxNjYwYjc4NzY1YWJmIiwiaWF0IjoxNzQzMTQyOTczfQ.fimSFx_BcZSgxxMS8Lq0J2BJGElf7MvwMO2w1jdYp9s';

/* ---------- DOM refs ---------- */
const templateListEl   = document.getElementById('templateList');
const templateCountEl  = document.getElementById('templateCount');
const templateSearchInput = document.getElementById('templateSearchInput');
const refreshListBtn   = document.getElementById('refreshList');
const newTemplateBtn   = document.getElementById('newTemplateBtn');
const newTemplateBtn2  = document.getElementById('newTemplateBtn2');
const chipsEl          = document.querySelectorAll('.chip');

const editorEmptyEl    = document.getElementById('editorEmpty');
const editorShellEl    = document.getElementById('editorShell');
const editorTitleEl    = document.getElementById('editorTitle');
const editorStatusEl   = document.getElementById('editorStatus');
const cancelBtn        = document.getElementById('cancelBtn');
const submitBtn        = document.getElementById('submitBtn');

const fName            = document.getElementById('f-name');
const fCategory        = document.getElementById('f-category');
const fLanguage        = document.getElementById('f-language');
const fBody            = document.getElementById('f-body');
const fFooter          = document.getElementById('f-footer');
const fHeaderText      = document.getElementById('f-header-text');
const gHeaderText      = document.getElementById('g-header-text');
const gHeaderMedia     = document.getElementById('g-header-media');
const gVars            = document.getElementById('g-vars');
const varInputs        = document.getElementById('varInputs');

const gButtons         = document.getElementById('g-buttons');
const btnList          = document.getElementById('btnList');
const addButtonBtn     = document.getElementById('addButtonBtn');
const buttonLimitHint  = document.getElementById('buttonLimitHint');

const uploadBox        = document.getElementById('uploadBox');
const mediaFile        = document.getElementById('mediaFile');
const uploadEmpty      = document.getElementById('uploadEmpty');
const uploadPreview    = document.getElementById('uploadPreview');
const uploadThumb      = document.getElementById('uploadThumb');
const uploadName       = document.getElementById('uploadName');
const uploadSize       = document.getElementById('uploadSize');
const uploadStatus     = document.getElementById('uploadStatus');
const uploadRemove     = document.getElementById('uploadRemove');
const uploadHint       = document.getElementById('uploadHint');

const errName          = document.getElementById('err-name');
const errBody          = document.getElementById('err-body');

const bodyCount        = document.getElementById('body-count');
const footerCount      = document.getElementById('footer-count');
const headerTextCount  = document.getElementById('header-text-count');

const prevHeader       = document.getElementById('prev-header');
const prevBody         = document.getElementById('prev-body');
const prevFooter       = document.getElementById('prev-footer');
const prevButtons      = document.getElementById('prev-buttons');
const prevTime         = document.getElementById('prev-time');
const toastEl          = document.getElementById('toast');

/* ---------- STATE ---------- */
let allTemplates = [];
let filterStatus = 'all';
let searchTerm = '';
let activeTemplateId = null;
let isReadOnly = false;
let buttons = []; // {type:'QUICK_REPLY'|'PHONE_NUMBER'|'URL', text, value}
let varSamples = {}; // {1: 'Pankaj', 2: 'team'}
let varCrmFields = {}; // {1: 'First_Name', 2: 'Last_Name'} — runtime mapping
let uploadedMedia = null; // {handle, name, url, mimeType, size}

/* Common Leads fields users will want to map to. Extend as needed. */
const LEAD_FIELDS = [
  { value: '', label: 'Pick CRM field…', group: '' },
  { value: 'First_Name', label: 'First Name', group: 'Identity' },
  { value: 'Last_Name', label: 'Last Name', group: 'Identity' },
  { value: 'Full_Name', label: 'Full Name', group: 'Identity' },
  { value: 'Salutation', label: 'Salutation', group: 'Identity' },
  { value: 'Email', label: 'Email', group: 'Contact' },
  { value: 'Phone', label: 'Phone', group: 'Contact' },
  { value: 'Mobile', label: 'Mobile', group: 'Contact' },
  { value: 'Company', label: 'Company', group: 'Business' },
  { value: 'Industry', label: 'Industry', group: 'Business' },
  { value: 'Designation', label: 'Designation', group: 'Business' },
  { value: 'Annual_Revenue', label: 'Annual Revenue', group: 'Business' },
  { value: 'Lead_Status', label: 'Lead Status', group: 'Lead' },
  { value: 'Lead_Source', label: 'Lead Source', group: 'Lead' },
  { value: 'Rating', label: 'Rating', group: 'Lead' },
  { value: 'Street', label: 'Street', group: 'Address' },
  { value: 'City', label: 'City', group: 'Address' },
  { value: 'State', label: 'State', group: 'Address' },
  { value: 'Zip_Code', label: 'Zip Code', group: 'Address' },
  { value: 'Country', label: 'Country', group: 'Address' },
  { value: 'Owner', label: 'Lead Owner', group: 'Ownership' },
  { value: 'Created_Time', label: 'Created Time', group: 'System' },
  { value: 'Modified_Time', label: 'Modified Time', group: 'System' },
  { value: '__custom__', label: '— Custom / API name —', group: '' }
];

/* ============================================================
   UTILITIES
   ============================================================ */
function escapeHtml(s) {
  if (s == null) return '';
  const div = document.createElement('div');
  div.textContent = String(s);
  return div.innerHTML;
}

function showToast(msg, type = '') {
  toastEl.className = 'toast';
  if (type) toastEl.classList.add('is-' + type);
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  setTimeout(() => toastEl.classList.add('hidden'), 3500);
}

function setTime() {
  const now = new Date();
  prevTime.textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}

/* ============================================================
   TEMPLATE LIST
   ============================================================ */
async function fetchTemplates() {
  try {
    const req = {
      parameters: {},
      headers: { Authorization: 'Bearer ' + AISENSY_TOKEN },
      method: 'GET',
      url: 'https://backend.aisensy.com/direct-apis/t1/get-templates'
    };
    const resp = await ZOHO.CRM.HTTP.get(req);
    const parsed = typeof resp === 'string' ? JSON.parse(resp) : resp;
    return parsed?.data || [];
  } catch (e) {
    console.error('fetchTemplates failed', e);
    return [];
  }
}

function renderTemplateList() {
  const filtered = allTemplates.filter(t => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const body = t.components?.find(c => c.type === 'BODY')?.text || '';
      if (!t.name?.toLowerCase().includes(term) && !body.toLowerCase().includes(term)) return false;
    }
    if (filterStatus !== 'all' && (t.status || '').toUpperCase() !== filterStatus) return false;
    return true;
  });

  templateCountEl.textContent = filtered.length;

  if (filtered.length === 0) {
    templateListEl.innerHTML = '<div class="list-empty"><i class="fa-regular fa-folder-open" style="font-size:24px;color:var(--text-faint)"></i><span>No templates match this filter.</span></div>';
    return;
  }

  templateListEl.innerHTML = '';
  filtered.forEach(t => {
    const row = document.createElement('div');
    row.className = 'template-row';
    if (activeTemplateId === t.id) row.classList.add('active');
    row.dataset.id = t.id;

    const status = (t.status || 'PENDING').toUpperCase();
    const body = t.components?.find(c => c.type === 'BODY')?.text || '';
    const preview = (body.length > 60 ? body.substring(0, 60) + '…' : body).replace(/\s+/g, ' ');

    row.innerHTML = `
      <div class="template-row-top">
        <span class="template-name">${escapeHtml(t.name)}</span>
        <span class="status-pill status-pill--${status}">${status}</span>
      </div>
      <div class="template-preview">${escapeHtml(preview)}</div>
      <div class="template-meta">
        <span>${escapeHtml((t.category || '').toUpperCase())}</span>
        <span>·</span>
        <span>${escapeHtml(t.language || '')}</span>
      </div>
    `;
    row.addEventListener('click', () => viewTemplate(t));
    templateListEl.appendChild(row);
  });
}

async function refreshList() {
  allTemplates = await fetchTemplates();
  renderTemplateList();
}

/* ============================================================
   VIEW EXISTING TEMPLATE (read-only)
   ============================================================ */
function viewTemplate(t) {
  activeTemplateId = t.id;
  isReadOnly = true;
  document.querySelectorAll('.template-row').forEach(r =>
    r.classList.toggle('active', r.dataset.id === t.id)
  );

  editorEmptyEl.classList.add('hidden');
  editorShellEl.classList.remove('hidden');
  editorTitleEl.textContent = t.name;

  const status = (t.status || 'PENDING').toUpperCase();
  editorStatusEl.className = 'status-pill status-pill--' + status;
  editorStatusEl.textContent = status;

  // Populate fields
  fName.value = t.name || '';
  fName.disabled = true;
  fCategory.value = (t.category || 'UTILITY').toUpperCase();
  fLanguage.value = t.language || 'en_US';

  // Header
  const header = t.components?.find(c => c.type === 'HEADER');
  const headerType = header?.format || 'NONE';
  document.querySelectorAll('input[name="headerType"]').forEach(r => r.checked = r.value === headerType);
  if (headerType === 'TEXT') fHeaderText.value = header?.text || '';
  updateHeaderVisibility(headerType);

  // Body
  const bodyComp = t.components?.find(c => c.type === 'BODY');
  fBody.value = bodyComp?.text || '';

  // Footer
  const footerComp = t.components?.find(c => c.type === 'FOOTER');
  fFooter.value = footerComp?.text || '';

  // Buttons
  const buttonsComp = t.components?.find(c => c.type === 'BUTTONS');
  buttons = [];
  let btnType = 'NONE';
  if (buttonsComp?.buttons?.length) {
    const first = buttonsComp.buttons[0];
    btnType = first.type === 'QUICK_REPLY' ? 'QUICK_REPLY' : 'CTA';
    buttons = buttonsComp.buttons.map(b => ({
      type: b.type,
      text: b.text || '',
      value: b.phone_number || b.url || ''
    }));
  }
  document.querySelectorAll('input[name="buttonType"]').forEach(r => r.checked = r.value === btnType);
  updateButtonVisibility(btnType);
  renderButtons();

  // Disable editing for existing templates
  [fName, fCategory, fLanguage, fBody, fFooter, fHeaderText].forEach(el => el.disabled = true);
  document.querySelectorAll('input[name="headerType"], input[name="buttonType"]').forEach(r => r.disabled = true);
  addButtonBtn.disabled = true;
  submitBtn.classList.add('hidden');
  cancelBtn.textContent = 'Close';

  refreshVarInputs();
  updateAllCounts();
  updatePreview();
  // Expand all sections so the full template is visible
  document.querySelectorAll('.accordion').forEach(card => card.classList.add('is-open'));
  updateAccordionStatuses();
}

/* ============================================================
   NEW TEMPLATE
   ============================================================ */
function newTemplate() {
  activeTemplateId = null;
  isReadOnly = false;
  document.querySelectorAll('.template-row').forEach(r => r.classList.remove('active'));

  editorEmptyEl.classList.add('hidden');
  editorShellEl.classList.remove('hidden');
  editorTitleEl.textContent = 'New template';
  editorStatusEl.className = 'status-pill status-pill--draft';
  editorStatusEl.textContent = 'Draft';

  // Reset form
  fName.value = '';
  fName.disabled = false;
  fCategory.value = 'UTILITY';
  fLanguage.value = 'en_US';
  fBody.value = '';
  fFooter.value = '';
  fHeaderText.value = '';
  document.querySelector('input[name="headerType"][value="NONE"]').checked = true;
  document.querySelector('input[name="buttonType"][value="NONE"]').checked = true;
  buttons = [];
  varSamples = {};
  varCrmFields = {};
  clearUpload();

  // Enable
  [fName, fCategory, fLanguage, fBody, fFooter, fHeaderText].forEach(el => el.disabled = false);
  document.querySelectorAll('input[name="headerType"], input[name="buttonType"]').forEach(r => r.disabled = false);
  addButtonBtn.disabled = false;
  submitBtn.classList.remove('hidden');
  cancelBtn.textContent = 'Cancel';

  updateHeaderVisibility('NONE');
  updateButtonVisibility('NONE');
  renderButtons();
  refreshVarInputs();
  updateAllCounts();
  clearErrors();
  updatePreview();
  resetAccordion();
  updateAccordionStatuses();
}

function closeEditor() {
  editorEmptyEl.classList.remove('hidden');
  editorShellEl.classList.add('hidden');
  activeTemplateId = null;
  document.querySelectorAll('.template-row').forEach(r => r.classList.remove('active'));
}

/* ============================================================
   HEADER / BUTTON VISIBILITY
   ============================================================ */
function updateHeaderVisibility(type) {
  gHeaderText.classList.toggle('hidden', type !== 'TEXT');
  gHeaderMedia.classList.toggle('hidden', !['IMAGE', 'VIDEO', 'DOCUMENT'].includes(type));

  // Configure file accept + size hint based on type
  if (type === 'IMAGE') {
    mediaFile.accept = 'image/jpeg,image/png';
    uploadHint.textContent = 'JPG or PNG · max 5 MB';
  } else if (type === 'VIDEO') {
    mediaFile.accept = 'video/mp4,video/3gpp';
    uploadHint.textContent = 'MP4 or 3GP · max 16 MB';
  } else if (type === 'DOCUMENT') {
    mediaFile.accept = 'application/pdf';
    uploadHint.textContent = 'PDF · max 100 MB';
  }
  // Reset upload when switching header type
  if (!['IMAGE', 'VIDEO', 'DOCUMENT'].includes(type)) {
    clearUpload();
  }
}

/* ============================================================
   MEDIA UPLOAD
   ============================================================ */
function clearUpload() {
  uploadedMedia = null;
  mediaFile.value = '';
  uploadEmpty.classList.remove('hidden');
  uploadPreview.classList.add('hidden');
  uploadThumb.innerHTML = '';
  uploadStatus.textContent = '';
  uploadStatus.className = 'upload-status';
  updatePreview();
}

uploadBox?.addEventListener('click', (e) => {
  if (e.target.closest('#uploadRemove')) return;
  if (isReadOnly) return;
  mediaFile.click();
});

uploadBox?.addEventListener('dragover', (e) => {
  e.preventDefault();
  if (isReadOnly) return;
  uploadBox.classList.add('dragover');
});

uploadBox?.addEventListener('dragleave', () => uploadBox.classList.remove('dragover'));

uploadBox?.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadBox.classList.remove('dragover');
  if (isReadOnly) return;
  const file = e.dataTransfer?.files?.[0];
  if (file) handleMediaFile(file);
});

mediaFile?.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (file) handleMediaFile(file);
});

uploadRemove?.addEventListener('click', (e) => {
  e.stopPropagation();
  clearUpload();
});

function fmtSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

async function handleMediaFile(file) {
  // Validate
  const headerType = document.querySelector('input[name="headerType"]:checked')?.value;
  const limits = { IMAGE: 5, VIDEO: 16, DOCUMENT: 100 };
  const limit = limits[headerType] || 5;
  if (file.size > limit * 1024 * 1024) {
    showToast(`File exceeds ${limit} MB limit for ${headerType}`, 'error');
    return;
  }

  uploadedMedia = { name: file.name, size: file.size, mimeType: file.type, file };

  // Show preview
  uploadEmpty.classList.add('hidden');
  uploadPreview.classList.remove('hidden');
  uploadName.textContent = file.name;
  uploadSize.textContent = fmtSize(file.size);

  uploadThumb.className = 'upload-thumb';
  uploadThumb.innerHTML = '';
  if (headerType === 'IMAGE') {
    const reader = new FileReader();
    reader.onload = e => {
      uploadThumb.innerHTML = `<img src="${e.target.result}" alt="">`;
      uploadedMedia.dataUrl = e.target.result;
      updatePreview();
    };
    reader.readAsDataURL(file);
  } else if (headerType === 'VIDEO') {
    uploadThumb.classList.add('is-video');
    uploadThumb.innerHTML = '<i class="fa-solid fa-video"></i>';
  } else if (headerType === 'DOCUMENT') {
    uploadThumb.classList.add('is-pdf');
    uploadThumb.innerHTML = '<i class="fa-solid fa-file-pdf"></i>';
  }

  updatePreview();

  // Upload to AiSensy
  uploadStatus.className = 'upload-status uploading';
  uploadStatus.innerHTML = '<span class="mini-spin"></span> Uploading to AiSensy…';

  try {
    const result = await uploadMediaToAisensy(file);
    if (result?.id || result?.handle) {
      uploadedMedia.handle = result.id || result.handle;
      uploadStatus.className = 'upload-status success';
      uploadStatus.innerHTML = '<i class="fa-solid fa-circle-check"></i> Uploaded · ready for submission';
      updateAccordionStatuses();
    } else {
      throw new Error('No media handle returned');
    }
  } catch (err) {
    console.error('Upload failed', err);
    uploadStatus.className = 'upload-status error';
    uploadStatus.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Upload failed — ' + (err.message || 'see console');
    uploadedMedia.handle = null;
  }
}

async function uploadMediaToAisensy(file) {
  // Convert to base64 because ZOHO.CRM.HTTP doesn't support FormData easily
  // Instead, use direct fetch (requires CORS to be open on AiSensy side)
  const fd = new FormData();
  fd.append('file', file);

  const resp = await fetch('https://backend.aisensy.com/direct-apis/t1/media', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + AISENSY_TOKEN },
    body: fd
  });
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  return resp.json();
}

function updateButtonVisibility(type) {
  gButtons.classList.toggle('hidden', type === 'NONE');
  if (type === 'NONE') {
    buttons = [];
    renderButtons();
    return;
  }
  // Initialize at least one button
  if (buttons.length === 0) {
    if (type === 'QUICK_REPLY') {
      buttons.push({ type: 'QUICK_REPLY', text: '', value: '' });
    } else {
      buttons.push({ type: 'URL', text: '', value: '' });
    }
  } else {
    // Reset to first matching type
    if (type === 'QUICK_REPLY') {
      buttons = buttons.filter(b => b.type === 'QUICK_REPLY');
      if (buttons.length === 0) buttons.push({ type: 'QUICK_REPLY', text: '', value: '' });
    } else {
      buttons = buttons.filter(b => b.type !== 'QUICK_REPLY');
      if (buttons.length === 0) buttons.push({ type: 'URL', text: '', value: '' });
    }
  }
  renderButtons();
}

/* ============================================================
   BUTTON BUILDER
   ============================================================ */
function renderButtons() {
  btnList.innerHTML = '';
  const btnType = document.querySelector('input[name="buttonType"]:checked')?.value;

  buttons.forEach((btn, idx) => {
    const row = document.createElement('div');
    row.className = 'btn-row' + (btn.type === 'QUICK_REPLY' ? ' is-quickreply' : '');

    if (btn.type === 'QUICK_REPLY') {
      row.innerHTML = `
        <input type="text" data-field="text" data-idx="${idx}" placeholder="Button text (max 25 chars)" maxlength="25" value="${escapeHtml(btn.text)}">
        <button class="btn-remove" data-idx="${idx}" title="Remove" type="button"><i class="fa-solid fa-trash-can"></i></button>
      `;
    } else {
      row.innerHTML = `
        <select data-field="type" data-idx="${idx}">
          <option value="URL" ${btn.type === 'URL' ? 'selected' : ''}>URL</option>
          <option value="PHONE_NUMBER" ${btn.type === 'PHONE_NUMBER' ? 'selected' : ''}>Phone</option>
        </select>
        <input type="text" data-field="text" data-idx="${idx}" placeholder="Button text" maxlength="25" value="${escapeHtml(btn.text)}">
        <input type="text" data-field="value" data-idx="${idx}" placeholder="${btn.type === 'URL' ? 'https://…' : '+91…'}" value="${escapeHtml(btn.value)}">
        <button class="btn-remove" data-idx="${idx}" title="Remove" type="button"><i class="fa-solid fa-trash-can"></i></button>
      `;
    }
    btnList.appendChild(row);
  });

  // Hint about limits
  const max = btnType === 'QUICK_REPLY' ? 3 : 2;
  buttonLimitHint.textContent = `${buttons.length}/${max} buttons. ${btnType === 'QUICK_REPLY' ? 'Up to 3 quick reply buttons.' : 'Up to 2 CTA buttons (max 1 phone + 1 URL).'}`;
  addButtonBtn.disabled = buttons.length >= max || isReadOnly;

  // Wire up inputs
  btnList.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('input', e => {
      const idx = +e.target.dataset.idx;
      const field = e.target.dataset.field;
      buttons[idx][field] = e.target.value;
      // For CTA, when phone is selected, also flip the value placeholder
      if (field === 'type') {
        renderButtons();
      }
      updatePreview();
    });
  });

  btnList.querySelectorAll('.btn-remove').forEach(el => {
    el.addEventListener('click', e => {
      const idx = +e.currentTarget.dataset.idx;
      buttons.splice(idx, 1);
      renderButtons();
      updatePreview();
      updateAccordionStatuses();
    });
  });

  updatePreview();
  updateAccordionStatuses();
}

addButtonBtn?.addEventListener('click', () => {
  const btnType = document.querySelector('input[name="buttonType"]:checked')?.value;
  if (btnType === 'QUICK_REPLY' && buttons.length < 3) {
    buttons.push({ type: 'QUICK_REPLY', text: '', value: '' });
  } else if (btnType === 'CTA' && buttons.length < 2) {
    // Default new CTA button: URL unless one URL already exists
    const hasUrl = buttons.some(b => b.type === 'URL');
    buttons.push({ type: hasUrl ? 'PHONE_NUMBER' : 'URL', text: '', value: '' });
  }
  renderButtons();
});

/* ============================================================
   VARIABLE DETECTION & SAMPLES
   ============================================================ */
function extractVars(text) {
  const vars = new Set();
  const re = /\{\{(\d+)\}\}/g;
  let m;
  while ((m = re.exec(text || '')) !== null) vars.add(m[1]);
  return Array.from(vars).sort((a, b) => +a - +b);
}

function refreshVarInputs() {
  const vars = extractVars(fBody.value + ' ' + fHeaderText.value);
  if (vars.length === 0) {
    gVars.classList.add('hidden');
    varInputs.innerHTML = '';
    return;
  }
  gVars.classList.remove('hidden');
  varInputs.innerHTML = '';

  // Build grouped select HTML once
  const optgroups = {};
  LEAD_FIELDS.forEach(f => {
    if (!f.value || f.value === '__custom__') {
      (optgroups[''] = optgroups[''] || []).push(f);
    } else {
      (optgroups[f.group] = optgroups[f.group] || []).push(f);
    }
  });
  let selectHtml = '';
  // Empty option first
  selectHtml += `<option value="">Pick CRM field…</option>`;
  Object.entries(optgroups).forEach(([g, fields]) => {
    if (!g) return; // skip the placeholder bucket
    selectHtml += `<optgroup label="${escapeHtml(g)}">`;
    fields.forEach(f => {
      selectHtml += `<option value="${escapeHtml(f.value)}">${escapeHtml(f.label)}</option>`;
    });
    selectHtml += `</optgroup>`;
  });
  selectHtml += `<option value="__custom__">— Custom / Other API name —</option>`;

  vars.forEach(v => {
    const row = document.createElement('div');
    row.className = 'var-input-row';
    const mapped = varCrmFields[v] || '';
    const isCustom = mapped && !LEAD_FIELDS.some(f => f.value === mapped);
    const selectValue = isCustom ? '__custom__' : mapped;

    row.innerHTML = `
      <span class="var-label">{{${v}}}</span>
      <select data-var="${v}" data-role="crmfield">
        ${selectHtml}
      </select>
      <input type="text" data-var="${v}" data-role="sample" placeholder="Sample value for preview" value="${escapeHtml(varSamples[v] || '')}">
    `;
    varInputs.appendChild(row);

    // Set the selected option after the row is in the DOM
    const sel = row.querySelector('select');
    sel.value = selectValue;

    // If custom, show a second row with text input for API name
    if (isCustom) {
      const customRow = document.createElement('div');
      customRow.className = 'var-input-row';
      customRow.innerHTML = `
        <span></span>
        <input type="text" data-var="${v}" data-role="customfield" placeholder="Custom field API name e.g. Lead_Source" value="${escapeHtml(mapped)}">
        <span></span>
      `;
      varInputs.appendChild(customRow);
    }
  });

  varInputs.querySelectorAll('select[data-role="crmfield"]').forEach(el => {
    el.addEventListener('change', e => {
      const v = e.target.dataset.var;
      const val = e.target.value;
      if (val === '__custom__') {
        varCrmFields[v] = ''; // wait for custom input
      } else {
        varCrmFields[v] = val;
      }
      refreshVarInputs(); // re-render to show/hide custom input
    });
  });

  varInputs.querySelectorAll('input[data-role="sample"]').forEach(el => {
    el.addEventListener('input', e => {
      varSamples[e.target.dataset.var] = e.target.value;
      updatePreview();
    });
  });

  varInputs.querySelectorAll('input[data-role="customfield"]').forEach(el => {
    el.addEventListener('input', e => {
      varCrmFields[e.target.dataset.var] = e.target.value.trim();
    });
  });
}

/* ============================================================
   COUNTS
   ============================================================ */
function updateAllCounts() {
  bodyCount.textContent = (fBody.value || '').length;
  footerCount.textContent = (fFooter.value || '').length;
  headerTextCount.textContent = (fHeaderText.value || '').length;
}

/* ============================================================
   WHATSAPP MARKDOWN
   ============================================================ */
function renderWhatsAppMarkdown(text) {
  if (!text) return '';
  let html = escapeHtml(text);
  // *bold*
  html = html.replace(/\*([^\*\n]+)\*/g, '<b>$1</b>');
  // _italic_
  html = html.replace(/_([^_\n]+)_/g, '<i>$1</i>');
  // ~strike~
  html = html.replace(/~([^~\n]+)~/g, '<s>$1</s>');
  // ```mono```
  html = html.replace(/```([^`]+)```/g, '<code>$1</code>');
  // {{1}} variables → use sample or stay as placeholder
  html = html.replace(/\{\{(\d+)\}\}/g, (_, n) => {
    const v = varSamples[n];
    return v ? `<span class="preview-var">${escapeHtml(v)}</span>` : `<span class="preview-var">{{${n}}}</span>`;
  });
  // Newlines → <br>
  html = html.replace(/\n/g, '<br>');
  return html;
}

/* ============================================================
   PREVIEW
   ============================================================ */
function updatePreview() {
  const headerType = document.querySelector('input[name="headerType"]:checked')?.value || 'NONE';
  const btnType = document.querySelector('input[name="buttonType"]:checked')?.value || 'NONE';

  // Header
  if (headerType === 'NONE') {
    prevHeader.classList.add('hidden');
  } else if (headerType === 'TEXT') {
    prevHeader.classList.remove('hidden');
    prevHeader.classList.remove('is-media');
    prevHeader.innerHTML = renderWhatsAppMarkdown(fHeaderText.value || 'Header text');
  } else {
    prevHeader.classList.remove('hidden');

    // If we have an actual uploaded image, show it
    if (headerType === 'IMAGE' && uploadedMedia?.dataUrl) {
      prevHeader.classList.remove('is-media');
      prevHeader.innerHTML = `<img src="${uploadedMedia.dataUrl}" alt="">`;
    } else {
      prevHeader.classList.add('is-media');
      const map = {
        IMAGE: { icon: 'fa-image', label: uploadedMedia?.name || 'Image' },
        VIDEO: { icon: 'fa-video', label: uploadedMedia?.name || 'Video' },
        DOCUMENT: { icon: 'fa-file-lines', label: uploadedMedia?.name || 'Document' }
      };
      const m = map[headerType];
      prevHeader.innerHTML = `<i class="fa-regular ${m.icon}"></i><span>${escapeHtml(m.label)}</span>`;
    }
  }

  // Body
  prevBody.innerHTML = renderWhatsAppMarkdown(fBody.value || 'Your message will appear here as you type.');

  // Footer
  if (fFooter.value) {
    prevFooter.classList.remove('hidden');
    prevFooter.textContent = fFooter.value;
  } else {
    prevFooter.classList.add('hidden');
  }

  // Buttons
  if (btnType === 'NONE' || buttons.length === 0) {
    prevButtons.classList.add('hidden');
    prevButtons.innerHTML = '';
  } else {
    prevButtons.classList.remove('hidden');
    prevButtons.innerHTML = '';
    buttons.forEach(btn => {
      const el = document.createElement('div');
      el.className = 'phone-button';
      let icon = '';
      if (btn.type === 'URL') icon = '<i class="fa-solid fa-arrow-up-right-from-square"></i>';
      else if (btn.type === 'PHONE_NUMBER') icon = '<i class="fa-solid fa-phone"></i>';
      else icon = '<i class="fa-regular fa-comment-dots"></i>';
      el.innerHTML = icon + '<span>' + escapeHtml(btn.text || 'Button') + '</span>';
      prevButtons.appendChild(el);
    });
  }
}

/* ============================================================
   FORM WIRING
   ============================================================ */
fName?.addEventListener('input', () => { clearError('name'); updateAccordionStatuses(); });
fCategory?.addEventListener('change', updateAccordionStatuses);
fLanguage?.addEventListener('change', updateAccordionStatuses);
fBody?.addEventListener('input', () => {
  updateAllCounts();
  refreshVarInputs();
  updatePreview();
  clearError('body');
  updateAccordionStatuses();
});
fFooter?.addEventListener('input', () => { updateAllCounts(); updatePreview(); updateAccordionStatuses(); });
fHeaderText?.addEventListener('input', () => { updateAllCounts(); refreshVarInputs(); updatePreview(); updateAccordionStatuses(); });

document.querySelectorAll('input[name="headerType"]').forEach(r => {
  r.addEventListener('change', e => {
    updateHeaderVisibility(e.target.value);
    refreshVarInputs();
    updatePreview();
    updateAccordionStatuses();
  });
});

document.querySelectorAll('input[name="buttonType"]').forEach(r => {
  r.addEventListener('change', e => {
    updateButtonVisibility(e.target.value);
    updatePreview();
    updateAccordionStatuses();
  });
});

/* ============================================================
   SEARCH / FILTERS
   ============================================================ */
templateSearchInput?.addEventListener('input', e => {
  searchTerm = e.target.value.trim();
  renderTemplateList();
});

chipsEl.forEach(chip => {
  chip.addEventListener('click', () => {
    chipsEl.forEach(c => c.classList.remove('chip-active'));
    chip.classList.add('chip-active');
    filterStatus = chip.dataset.filter;
    renderTemplateList();
  });
});

refreshListBtn?.addEventListener('click', refreshList);
newTemplateBtn?.addEventListener('click', newTemplate);
newTemplateBtn2?.addEventListener('click', newTemplate);
cancelBtn?.addEventListener('click', closeEditor);

/* ============================================================
   VALIDATION + SUBMIT
   ============================================================ */
function showError(field, msg) {
  const errEl = document.getElementById('err-' + field);
  const grpEl = document.getElementById('f-' + field)?.closest('.field-group');
  if (errEl) {
    errEl.textContent = msg;
    errEl.classList.add('show');
  }
  if (grpEl) grpEl.classList.add('has-error');
}

function clearError(field) {
  const errEl = document.getElementById('err-' + field);
  const grpEl = document.getElementById('f-' + field)?.closest('.field-group');
  if (errEl) errEl.classList.remove('show');
  if (grpEl) grpEl.classList.remove('has-error');
}

function clearErrors() {
  ['name', 'body'].forEach(clearError);
}

function validate() {
  clearErrors();
  let ok = true;

  const name = fName.value.trim();
  if (!name) {
    showError('name', 'Template name is required');
    ok = false;
  } else if (!/^[a-z0-9_]+$/.test(name)) {
    showError('name', 'Use lowercase letters, numbers and underscores only (no spaces or dashes)');
    ok = false;
  }

  const body = fBody.value.trim();
  if (!body) {
    showError('body', 'Body is required');
    ok = false;
  }

  // Media header requires upload
  const headerType = document.querySelector('input[name="headerType"]:checked')?.value;
  if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType)) {
    if (!uploadedMedia?.handle) {
      showToast(`Upload a sample ${headerType.toLowerCase()} for the header — Meta requires it for approval`, 'error');
      ok = false;
    }
  }

  // CTA buttons need values
  const btnType = document.querySelector('input[name="buttonType"]:checked')?.value;
  if (btnType === 'CTA') {
    for (const b of buttons) {
      if (!b.text || !b.value) {
        showToast('Each CTA button needs text and a value (URL or phone)', 'error');
        ok = false;
        break;
      }
      // URL validation
      if (b.type === 'URL' && !/^https?:\/\//i.test(b.value)) {
        showToast(`URL button "${b.text}" must start with https://`, 'error');
        ok = false;
        break;
      }
    }
  }
  if (btnType === 'QUICK_REPLY') {
    for (const b of buttons) {
      if (!b.text) {
        showToast('Each quick-reply button needs text', 'error');
        ok = false;
        break;
      }
    }
  }

  return ok;
}

function buildPayload() {
  const headerType = document.querySelector('input[name="headerType"]:checked')?.value || 'NONE';
  const btnType = document.querySelector('input[name="buttonType"]:checked')?.value || 'NONE';
  const components = [];

  // Header
  if (headerType === 'TEXT' && fHeaderText.value.trim()) {
    const headerVars = extractVars(fHeaderText.value);
    const comp = { type: 'HEADER', format: 'TEXT', text: fHeaderText.value };
    if (headerVars.length) {
      comp.example = { header_text: headerVars.map(v => varSamples[v] || `sample_${v}`) };
    }
    components.push(comp);
  } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType)) {
    if (!uploadedMedia?.handle) {
      // Will be caught by validate(), but build anyway
      components.push({
        type: 'HEADER',
        format: headerType,
        example: { header_handle: ['PLACEHOLDER_NO_UPLOAD'] }
      });
    } else {
      components.push({
        type: 'HEADER',
        format: headerType,
        example: { header_handle: [uploadedMedia.handle] }
      });
    }
  }

  // Body
  const bodyVars = extractVars(fBody.value);
  const bodyComp = { type: 'BODY', text: fBody.value };
  if (bodyVars.length) {
    bodyComp.example = { body_text: [bodyVars.map(v => varSamples[v] || `sample_${v}`)] };
  }
  components.push(bodyComp);

  // Footer
  if (fFooter.value.trim()) {
    components.push({ type: 'FOOTER', text: fFooter.value });
  }

  // Buttons
  if (btnType !== 'NONE' && buttons.length) {
    const cleanedButtons = buttons.map(b => {
      if (b.type === 'QUICK_REPLY') return { type: 'QUICK_REPLY', text: b.text };
      if (b.type === 'URL') return { type: 'URL', text: b.text, url: b.value };
      if (b.type === 'PHONE_NUMBER') return { type: 'PHONE_NUMBER', text: b.text, phone_number: b.value };
      return null;
    }).filter(Boolean);
    components.push({ type: 'BUTTONS', buttons: cleanedButtons });
  }

  const payload = {
    name: fName.value.trim(),
    category: fCategory.value,
    language: fLanguage.value,
    components
  };

  // Include CRM field mapping as metadata (AiSensy may ignore it,
  // but we'll mirror to the CRM custom module so send-time can use it)
  if (Object.keys(varCrmFields).length) {
    payload.crm_field_map = varCrmFields;
  }

  return payload;
}

async function submitTemplate() {
  if (!validate()) return;

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting…';

  try {
    const payload = buildPayload();
    const req = {
      url: 'https://backend.aisensy.com/direct-apis/t1/wa_template',
      headers: {
        Authorization: 'Bearer ' + AISENSY_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      parameters: {}
    };
    const resp = await ZOHO.CRM.HTTP.post(req);
    const parsed = typeof resp === 'string' ? JSON.parse(resp) : resp;

    if (parsed?.error || parsed?.errors) {
      const errMsg = parsed?.error?.message || parsed?.errors?.[0]?.message || 'Submission failed';
      showToast('Failed: ' + errMsg, 'error');
      console.error('Template submission error', parsed);
    } else {
      showToast('Template submitted for approval', 'success');
      setTimeout(() => {
        closeEditor();
        refreshList();
      }, 1200);
    }
  } catch (e) {
    console.error('submitTemplate failed', e);
    showToast('Submission failed. See console for details.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit for approval';
  }
}

submitBtn?.addEventListener('click', submitTemplate);

/* ============================================================
   INIT
   ============================================================ */
ZOHO.embeddedApp.on('PageLoad', async () => {
  setTime();
  setInterval(setTime, 30000);
  await refreshList();
  updatePreview();
  updateAllCounts();
  updateAccordionStatuses();
  wireAccordion();
});

ZOHO.embeddedApp.init();

/* ============================================================
   ACCORDION
   ============================================================ */
function wireAccordion() {
  document.querySelectorAll('.accordion-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const card = btn.closest('.accordion');
      card.classList.toggle('is-open');
    });
  });
}

function openAccordion(step) {
  const card = document.querySelector(`.accordion[data-step="${step}"]`);
  if (card) card.classList.add('is-open');
}

function resetAccordion() {
  document.querySelectorAll('.accordion').forEach((card, idx) => {
    card.classList.toggle('is-open', idx === 0);
  });
}

function updateAccordionStatuses() {
  // 1. Basics: name + category + language
  const name = fName.value.trim();
  setStatus(1, name ? `${name} · ${fCategory.value} · ${fLanguage.value}` : '');

  // 2. Header
  const headerType = document.querySelector('input[name="headerType"]:checked')?.value;
  let headerSummary = '';
  if (headerType === 'TEXT' && fHeaderText.value) headerSummary = 'Text';
  else if (headerType === 'IMAGE') headerSummary = uploadedMedia?.handle ? '✓ Image' : 'Image';
  else if (headerType === 'VIDEO') headerSummary = uploadedMedia?.handle ? '✓ Video' : 'Video';
  else if (headerType === 'DOCUMENT') headerSummary = uploadedMedia?.handle ? '✓ Document' : 'Document';
  setStatus(2, headerSummary);

  // 3. Body
  const body = fBody.value.trim();
  if (body) {
    const vars = extractVars(body);
    setStatus(3, vars.length ? `${body.length} chars · ${vars.length} var${vars.length > 1 ? 's' : ''}` : `${body.length} chars`);
  } else {
    setStatus(3, '');
  }

  // 4. Footer
  setStatus(4, fFooter.value.trim() ? `${fFooter.value.length} chars` : '');

  // 5. Buttons
  const btnType = document.querySelector('input[name="buttonType"]:checked')?.value;
  if (btnType === 'QUICK_REPLY') setStatus(5, `${buttons.length} quick reply`);
  else if (btnType === 'CTA') setStatus(5, `${buttons.length} CTA`);
  else setStatus(5, '');
}

function setStatus(step, text) {
  const el = document.getElementById('status-' + step);
  if (!el) return;
  el.textContent = text || '';
  el.classList.toggle('has-value', !!text);
}
