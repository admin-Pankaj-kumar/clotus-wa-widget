/* ============================================================
   Clotus WhatsApp Templates — Web Tab styles
   ============================================================ */

:root {
  --clotus-primary: #1E2A5E;
  --clotus-primary-dark: #141C42;
  --clotus-primary-light: #2A3A7E;
  --clotus-primary-pale: #F0F2FA;
  --clotus-accent: #00B4E6;
  --clotus-accent-dark: #0099CC;
  --clotus-accent-pale: #E6F8FD;
  --clotus-highlight: #E91E63;
  --clotus-highlight-pale: #FCE4EC;

  --bg: #F4F5F8;
  --surface: #FFFFFF;
  --surface-2: #F4F5F8;
  --border: #E4E6EE;
  --border-strong: #C8CCDB;
  --text: #1A1D2E;
  --text-muted: #5A5F7A;
  --text-faint: #A0A4BA;

  --wa-bubble: #DCF8C6;
  --wa-bubble-border: #C5E6AC;
  --wa-bg: #ECE5DD;

  --success: #10B981;
  --warning: #F59E0B;
  --danger: #EF4444;

  --shadow-sm: 0 1px 2px rgba(30, 42, 94, 0.05);
  --shadow-md: 0 2px 8px rgba(30, 42, 94, 0.08);
  --shadow-lg: 0 8px 24px rgba(30, 42, 94, 0.10);

  --font-sans: 'Plus Jakarta Sans', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --r-sm: 6px;
  --r-md: 10px;
  --r-lg: 14px;

  --topbar-h: 56px;
  --footer-h: 26px;
  --col-left-w: 320px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  height: 100%;
  font-family: var(--font-sans);
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
  font-size: 14px;
  line-height: 1.5;
  overflow: hidden;
}

.hidden { display: none !important; }

.tmpl-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
}

/* ============================================================
   TOPBAR
   ============================================================ */
.global-topbar {
  height: var(--topbar-h);
  background: linear-gradient(180deg, var(--clotus-primary) 0%, var(--clotus-primary-dark) 100%);
  color: #FFFFFF;
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 16px;
  box-shadow: 0 2px 12px rgba(30, 42, 94, 0.20);
  z-index: 10;
  flex-shrink: 0;
}

.brand { display: flex; align-items: center; gap: 12px; }

.brand-mark {
  width: 36px; height: 36px;
  border-radius: 9px;
  background: linear-gradient(135deg, var(--clotus-accent) 0%, var(--clotus-highlight) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #FFFFFF;
  box-shadow: 0 4px 12px rgba(0, 180, 230, 0.3);
}

.brand-text { display: flex; flex-direction: column; }
.brand-title { font-size: 15px; font-weight: 700; line-height: 1.1; }
.brand-sub { font-size: 11px; color: rgba(255, 255, 255, 0.65); letter-spacing: 0.02em; }

.topbar-spacer { flex: 1; }
.topbar-actions { display: flex; gap: 8px; }

.topbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 14px;
  background: rgba(255, 255, 255, 0.10);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: #FFFFFF;
  font-family: var(--font-sans);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s;
}

.topbar-btn:hover {
  background: var(--clotus-accent);
  border-color: var(--clotus-accent);
}

.topbar-btn--primary {
  background: var(--clotus-accent);
  border-color: var(--clotus-accent);
}

.topbar-btn--primary:hover {
  background: var(--clotus-highlight);
  border-color: var(--clotus-highlight);
}

/* ============================================================
   BODY LAYOUT
   ============================================================ */
.tmpl-body {
  flex: 1;
  display: grid;
  grid-template-columns: var(--col-left-w) 1fr;
  min-height: 0;
}

.col {
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.col-editor { border-right: none; background: var(--bg); }

/* ============================================================
   LEFT — TEMPLATE LIST
   ============================================================ */
.list-header {
  padding: 14px 14px 10px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  flex-shrink: 0;
}

.list-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.list-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}

.conv-count {
  background: var(--clotus-primary-pale);
  color: var(--clotus-primary);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
}

.list-search {
  position: relative;
  margin-bottom: 8px;
}

.list-search i {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-faint);
  font-size: 12px;
  pointer-events: none;
}

#templateSearchInput {
  width: 100%;
  padding: 8px 10px 8px 30px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  border-radius: 8px;
  font-family: var(--font-sans);
  font-size: 12.5px;
  color: var(--text);
  transition: all 0.18s;
}

#templateSearchInput:focus {
  outline: none;
  background: var(--surface);
  border-color: var(--clotus-accent);
  box-shadow: 0 0 0 3px rgba(0, 180, 230, 0.12);
}

.list-filters {
  display: flex;
  gap: 5px;
  overflow-x: auto;
}

.list-filters::-webkit-scrollbar { display: none; }

.chip {
  flex-shrink: 0;
  padding: 4px 10px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 14px;
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.chip:hover {
  background: var(--clotus-accent-pale);
  border-color: var(--clotus-accent);
  color: var(--clotus-primary);
}

.chip.chip-active {
  background: var(--clotus-primary);
  border-color: var(--clotus-primary);
  color: #FFFFFF;
}

.lead-list {
  flex: 1;
  overflow-y: auto;
  background: var(--surface);
}

.lead-list::-webkit-scrollbar { width: 6px; }
.lead-list::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 3px; }

.template-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.12s;
  border-left: 3px solid transparent;
}

.template-row:hover { background: var(--surface-2); }

.template-row.active {
  background: var(--clotus-accent-pale);
  border-left-color: var(--clotus-accent);
}

.template-row-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.template-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.template-preview {
  font-size: 11.5px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.template-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10.5px;
  color: var(--text-faint);
  font-family: var(--font-mono);
}

.status-pill {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 9px;
  font-size: 9.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.status-pill--APPROVED { background: rgba(16, 185, 129, 0.15); color: #047857; }
.status-pill--PENDING { background: rgba(245, 158, 11, 0.15); color: #B45309; }
.status-pill--REJECTED { background: rgba(239, 68, 68, 0.15); color: #B91C1C; }
.status-pill--draft { background: rgba(160, 164, 186, 0.20); color: var(--text-muted); }

.list-loading,
.list-empty {
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--text-faint);
  font-size: 12px;
  text-align: center;
}

.spinner-lg {
  width: 28px; height: 28px;
  border: 3px solid var(--border);
  border-top-color: var(--clotus-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ============================================================
   EDITOR EMPTY STATE
   ============================================================ */
.editor-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px;
  text-align: center;
  color: var(--text-faint);
}

.editor-empty-icon {
  width: 80px; height: 80px;
  border-radius: 50%;
  background: var(--clotus-primary-pale);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: var(--clotus-primary-light);
  margin-bottom: 10px;
}

.editor-empty-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-muted);
}

.editor-empty-sub {
  font-size: 13px;
  color: var(--text-faint);
  max-width: 420px;
  line-height: 1.6;
  margin-bottom: 12px;
}

.primary-cta:hover {
  background: var(--clotus-accent);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.primary-cta:disabled {
  background: var(--text-faint);
  cursor: not-allowed;
  transform: none;
}

.ghost-btn:hover {
  background: var(--surface-2);
  color: var(--text);
}

/* ============================================================
   EDITOR SHELL
   ============================================================ */
.editor-shell {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.editor-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.editor-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.editor-header-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.primary-cta {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 14px;
  background: var(--clotus-primary);
  color: #FFFFFF;
  border: none;
  border-radius: 7px;
  font-family: var(--font-sans);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s;
  box-shadow: var(--shadow-sm);
  white-space: nowrap;
}

.ghost-btn {
  display: inline-flex;
  align-items: center;
  padding: 7px 12px;
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: 7px;
  font-family: var(--font-sans);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.editor-content {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 16px;
  padding: 16px;
  overflow: hidden;
  min-height: 0;
}

/* ============================================================
   FORM PANE
   ============================================================ */
.form-pane {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 4px;
  min-width: 0;
}

.form-pane::-webkit-scrollbar { width: 6px; }
.form-pane::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 3px; }

.form-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  transition: box-shadow 0.15s;
}

.form-card.accordion.is-open {
  box-shadow: var(--shadow-md);
}

.form-card-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--surface);
  border-bottom: 1px solid transparent;
  width: 100%;
  text-align: left;
  cursor: pointer;
  border-radius: 0;
  font-family: inherit;
}

.accordion-toggle {
  border: none;
  outline: none;
}

.accordion-toggle:hover {
  background: var(--surface-2);
}

.form-card.accordion.is-open .form-card-head {
  background: var(--clotus-primary-pale);
  border-bottom-color: var(--border);
}

.step-num {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--clotus-primary);
  color: #FFFFFF;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 11px;
  flex-shrink: 0;
}

.form-card.accordion.is-open .step-num {
  background: var(--clotus-accent);
}

.form-card-head-text {
  flex: 1;
  min-width: 0;
}

.form-card-head h3 {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 1px;
  line-height: 1.2;
}

.form-card-head p {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.form-card-head .optional {
  font-size: 9.5px;
  color: var(--text-faint);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-left: 4px;
}

.form-card-head code {
  font-family: var(--font-mono);
  font-size: 9.5px;
  background: var(--surface-2);
  padding: 1px 4px;
  border-radius: 3px;
  color: var(--clotus-primary);
}

.accordion-status {
  font-size: 10.5px;
  color: var(--text-muted);
  font-weight: 600;
  flex-shrink: 0;
  white-space: nowrap;
  max-width: 130px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.accordion-status.has-value {
  color: var(--clotus-accent-dark);
}

.accordion-chevron {
  color: var(--text-muted);
  font-size: 10px;
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.form-card.accordion.is-open .accordion-chevron {
  transform: rotate(180deg);
  color: var(--clotus-primary);
}

.accordion-body {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease, padding 0.3s ease;
  padding: 0 14px;
}

.form-card.accordion.is-open .accordion-body {
  max-height: 9999px;
  padding: 12px 14px 14px;
}

.form-card-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.field-group label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
}

.req {
  color: var(--danger);
  margin-left: 2px;
}

.field-group input[type="text"],
.field-group textarea,
.field-group select {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 7px;
  font-family: var(--font-sans);
  font-size: 12.5px;
  color: var(--text);
  background: var(--surface);
  transition: all 0.15s;
}

.field-group textarea {
  resize: vertical;
  min-height: 80px;
  font-family: var(--font-sans);
  line-height: 1.5;
}

.field-group input:focus,
.field-group textarea:focus,
.field-group select:focus {
  outline: none;
  border-color: var(--clotus-accent);
  box-shadow: 0 0 0 3px rgba(0, 180, 230, 0.12);
}

.field-help {
  font-size: 11px;
  color: var(--text-faint);
  line-height: 1.4;
}

.field-help code {
  background: var(--surface-2);
  padding: 1px 5px;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--clotus-primary);
}

.field-error {
  font-size: 11.5px;
  color: var(--danger);
  font-weight: 600;
  display: none;
}

.field-error.show { display: block; }

.field-group.has-error input,
.field-group.has-error textarea {
  border-color: var(--danger);
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.radio-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.radio-card {
  flex: 1;
  min-width: 90px;
  position: relative;
  cursor: pointer;
}

.radio-card input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.radio-card span {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 12px;
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  transition: all 0.15s;
  user-select: none;
}

.radio-card:hover span {
  background: var(--surface-2);
  border-color: var(--border-strong);
  color: var(--text);
}

.radio-card input:checked + span {
  background: var(--clotus-primary);
  border-color: var(--clotus-primary);
  color: #FFFFFF;
}

.radio-card span i { font-size: 11px; }

.formatting-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: var(--clotus-accent-pale);
  border: 1px solid #BFE9F5;
  border-radius: 6px;
  font-size: 11px;
  color: var(--clotus-primary);
}

.formatting-tip i { color: var(--clotus-accent-dark); }

.formatting-tip code {
  background: rgba(255, 255, 255, 0.7);
  padding: 1px 5px;
  border-radius: 3px;
  font-family: var(--font-mono);
  font-size: 10.5px;
}

.var-inputs {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.var-input-row {
  display: grid;
  grid-template-columns: 56px 1fr 1fr;
  gap: 8px;
  align-items: center;
}

.var-label {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--clotus-primary);
  font-weight: 700;
  background: var(--clotus-primary-pale);
  padding: 9px 8px;
  border-radius: 6px;
  text-align: center;
}

.var-input-row input,
.var-input-row select {
  padding: 8px 10px !important;
  font-size: 12px !important;
}

.var-input-row select {
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%235A5F7A'><path d='M7 10l5 5 5-5z'/></svg>");
  background-repeat: no-repeat;
  background-position: right 6px center;
  padding-right: 28px !important;
  appearance: none;
  -webkit-appearance: none;
}

.var-input-help {
  grid-column: 2 / span 2;
  font-size: 10.5px;
  color: var(--text-faint);
  padding-left: 4px;
}

/* ===== Upload box ===== */
.upload-box {
  border: 2px dashed var(--border-strong);
  border-radius: var(--r-md);
  background: var(--surface-2);
  transition: all 0.15s;
  cursor: pointer;
  position: relative;
}

.upload-box:hover,
.upload-box.dragover {
  border-color: var(--clotus-accent);
  background: var(--clotus-accent-pale);
}

.upload-empty {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
}

.upload-empty i {
  font-size: 28px;
  color: var(--clotus-accent-dark);
  flex-shrink: 0;
}

.upload-text {
  font-size: 12.5px;
  color: var(--text);
  line-height: 1.5;
}

.upload-text strong {
  color: var(--clotus-primary);
  font-weight: 700;
}

.upload-hint {
  font-size: 11px;
  color: var(--text-faint);
  margin-top: 2px;
}

.upload-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  cursor: default;
}

.upload-thumb {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.upload-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-thumb i {
  font-size: 24px;
  color: var(--text-faint);
}

.upload-thumb.is-pdf i { color: #DC2626; }
.upload-thumb.is-video i { color: #2563EB; }

.upload-meta {
  flex: 1;
  min-width: 0;
}

.upload-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.upload-size {
  font-size: 11px;
  color: var(--text-faint);
  font-family: var(--font-mono);
  margin-top: 2px;
}

.upload-status {
  font-size: 11px;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.upload-status.uploading { color: var(--clotus-accent-dark); }
.upload-status.success { color: var(--success); }
.upload-status.error { color: var(--danger); }

.upload-status .mini-spin {
  width: 11px;
  height: 11px;
  border: 1.5px solid var(--border);
  border-top-color: var(--clotus-accent);
  border-radius: 50%;
  display: inline-block;
  animation: spin 0.8s linear infinite;
}

/* ===== Buttons builder ===== */
.btn-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.btn-row {
  display: grid;
  grid-template-columns: auto 1fr 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 8px;
  background: var(--surface-2);
  border-radius: 8px;
  border: 1px solid var(--border);
}

.btn-row.is-quickreply { grid-template-columns: 1fr auto; }

.btn-row select,
.btn-row input {
  padding: 6px 8px !important;
  font-size: 12px !important;
}

.btn-remove {
  width: 26px; height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-faint);
  cursor: pointer;
  border-radius: 4px;
}

.btn-remove:hover { color: var(--danger); background: var(--clotus-highlight-pale); }

.add-btn-row {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  background: transparent;
  border: 1.5px dashed var(--border-strong);
  border-radius: 8px;
  color: var(--text-muted);
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  width: 100%;
  justify-content: center;
}

.add-btn-row:hover {
  background: var(--clotus-accent-pale);
  border-color: var(--clotus-accent);
  color: var(--clotus-primary);
}

.add-btn-row:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ============================================================
   PREVIEW PANE (sticky right column)
   ============================================================ */
.preview-pane {
  position: relative;
  display: flex;
  flex-direction: column;
}

.preview-sticky {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: sticky;
  top: 0;
}

.preview-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.phone-frame {
  background: #2A2A2A;
  border-radius: 24px;
  padding: 6px;
  box-shadow: 0 20px 50px rgba(30, 42, 94, 0.25), 0 8px 16px rgba(0, 0, 0, 0.15);
  position: relative;
  overflow: hidden;
  max-width: 280px;
  margin: 0 auto;
  width: 100%;
}

.phone-notch {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 14px;
  background: #2A2A2A;
  border-bottom-left-radius: 10px;
  border-bottom-right-radius: 10px;
  z-index: 2;
}

.phone-screen {
  background: var(--wa-bg);
  border-radius: 18px;
  overflow: hidden;
  min-height: 460px;
  display: flex;
  flex-direction: column;
}

.phone-statusbar {
  background: #075E54;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 16px 4px;
  font-size: 10.5px;
  font-weight: 600;
}

.phone-icons { display: flex; gap: 6px; font-size: 9.5px; }

.phone-chat-header {
  background: #075E54;
  color: white;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px 10px;
  font-size: 12px;
}

.phone-avatar {
  width: 30px; height: 30px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--clotus-accent) 0%, var(--clotus-highlight) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
  color: white;
}

.phone-name {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.phone-name-1 { font-weight: 600; font-size: 12.5px; }
.phone-name-2 { font-size: 10px; opacity: 0.85; }

.phone-call-icon { font-size: 12px; opacity: 0.9; }

.phone-chat-body {
  flex: 1;
  padding: 14px 10px;
  background-image:
    radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.4) 0%, transparent 30%),
    radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.3) 0%, transparent 30%),
    var(--wa-bg);
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
}

.phone-bubble {
  align-self: flex-start;
  max-width: 88%;
  background: #FFFFFF;
  border-radius: 8px;
  padding: 6px 8px 4px;
  box-shadow: 0 1px 0.5px rgba(0, 0, 0, 0.13);
  position: relative;
  border-top-left-radius: 0;
}

.phone-bubble::before {
  content: '';
  position: absolute;
  top: 0;
  left: -8px;
  width: 8px;
  height: 13px;
  background: white;
  clip-path: polygon(100% 0, 0 0, 100% 100%);
}

.phone-header {
  font-weight: 700;
  font-size: 12.5px;
  color: #303030;
  margin-bottom: 4px;
  line-height: 1.3;
}

.phone-header img,
.phone-header video {
  display: block;
  width: 100%;
  border-radius: 4px;
  margin-bottom: 4px;
  background: #f0f0f0;
}

.phone-header.is-media {
  background: #DDDDDD;
  border-radius: 4px;
  height: 130px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 6px;
  color: #888;
  font-size: 11px;
}

.phone-header.is-media i { font-size: 28px; }

.phone-body {
  font-size: 12.5px;
  line-height: 1.45;
  color: #303030;
  white-space: pre-wrap;
  word-wrap: break-word;
  min-height: 18px;
}

.phone-body b { font-weight: 700; }
.phone-body i { font-style: italic; }
.phone-body s { text-decoration: line-through; }
.phone-body code {
  font-family: var(--font-mono);
  font-size: 11px;
  background: #F0F0F0;
  padding: 1px 4px;
  border-radius: 3px;
}

.phone-body .preview-var {
  background: rgba(0, 180, 230, 0.15);
  border-radius: 3px;
  padding: 0 3px;
  color: var(--clotus-primary);
  font-weight: 500;
}

.phone-footer {
  font-size: 10.5px;
  color: #888;
  margin-top: 4px;
}

.phone-time-row {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 3px;
  font-size: 9.5px;
  color: #999;
  margin-top: 2px;
}

.phone-buttons {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-top: 4px;
}

.phone-button {
  background: #FFFFFF;
  color: #00A5F4;
  text-align: center;
  padding: 8px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  box-shadow: 0 1px 0.5px rgba(0, 0, 0, 0.13);
}

.phone-button i { font-size: 11px; }

.preview-hint {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 8px 10px;
  background: var(--surface-2);
  border-radius: 6px;
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.4;
}

.preview-hint i { color: var(--clotus-accent-dark); margin-top: 1px; flex-shrink: 0; }

/* ============================================================
   TOAST
   ============================================================ */
.toast {
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--clotus-primary);
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  box-shadow: var(--shadow-lg);
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 10px;
  animation: slideUp 0.3s ease;
}

.toast.is-success { background: var(--success); }
.toast.is-error { background: var(--danger); }

@keyframes slideUp {
  from { opacity: 0; transform: translate(-50%, 20px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}

/* ============================================================
   FOOTER
   ============================================================ */
.appfooter {
  height: var(--footer-h);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 10.5px;
  color: var(--text-faint);
  background: var(--surface);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.powered-link {
  color: var(--clotus-primary);
  text-decoration: none;
  font-weight: 600;
}

.powered-link:hover {
  color: var(--clotus-accent-dark);
  text-decoration: underline;
}

/* ============================================================
   RESPONSIVE
   ============================================================ */
@media (max-width: 1400px) {
  .editor-content {
    grid-template-columns: minmax(0, 1fr) 290px;
    gap: 14px;
    padding: 14px;
  }
  .phone-frame { max-width: 260px; }
}

@media (max-width: 1200px) {
  :root { --col-left-w: 280px; }
  .editor-content {
    grid-template-columns: minmax(0, 1fr) 260px;
    gap: 12px;
  }
  .phone-frame { max-width: 240px; }
  .phone-screen { min-height: 420px; }
}

@media (max-width: 1024px) {
  .editor-content {
    grid-template-columns: minmax(0, 1fr);
    overflow-y: auto;
  }
  .preview-pane {
    order: -1; /* show preview above form on narrow screens */
  }
  .preview-sticky { position: relative; }
  .phone-frame { max-width: 260px; }
}

@media (max-width: 900px) {
  :root { --col-left-w: 240px; }
}

@media (max-width: 768px) {
  .tmpl-body {
    grid-template-columns: 1fr;
  }
  .col-left {
    display: none; /* hidden on narrow; could become a drawer */
  }
}
