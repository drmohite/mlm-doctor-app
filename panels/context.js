// MLM Forge — Context Sidebar Panel
// Right panel: metadata card + tabbed views for variables, MLM calls, SQL, events, observations

window.ContextPanel = {
  editor: null,
  currentTab: 'vars',
  symbols: null,

  init(editor) {
    this.editor = editor;
    this._initTabs();
    this._initSearch();
  },

  update(symbols) {
    this.symbols = symbols;
    this._renderMetadata(symbols.metadata);
    this._renderCurrentTab();
  },

  _initTabs() {
    document.querySelectorAll('.ctx-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.ctx-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentTab = tab.dataset.tab;
        this._renderCurrentTab();
      });
    });
  },

  _initSearch() {
    const searchEl = document.getElementById('ctxSearch');
    if (searchEl) {
      searchEl.addEventListener('input', () => this._renderCurrentTab());
    }
  },

  _getSearchTerm() {
    const el = document.getElementById('ctxSearch');
    return el ? el.value.toLowerCase().trim() : '';
  },

  _renderCurrentTab() {
    if (!this.symbols) return;
    const q = this._getSearchTerm();
    switch (this.currentTab) {
      case 'vars':  return this._renderVars(q);
      case 'mlms':  return this._renderMLMs(q);
      case 'sql':   return this._renderSQL(q);
      case 'events':return this._renderEvents(q);
      case 'obs':   return this._renderObs(q);
      case 'flow':  return window.FlowPanel ? window.FlowPanel.render() : null;
    }
  },

  _renderMetadata(meta) {
    if (!meta) return;
    const el = document.getElementById('ctxMetadata');
    if (!el) return;

    const validColor = (meta.validation || '').toLowerCase().includes('prod') ? '#3fb950' :
                       (meta.validation || '').toLowerCase().includes('test') ? '#e3b341' : '#58a6ff';

    el.innerHTML = `
      <div class="meta-card">
        <div class="meta-title">${escHtml(meta.title || meta.mlmname || 'Untitled MLM')}</div>
        <div class="meta-row"><span class="meta-label">Version</span><span class="meta-val">${escHtml(meta.version || '—')}</span></div>
        <div class="meta-row"><span class="meta-label">Author</span><span class="meta-val">${escHtml(meta.author || '—')}</span></div>
        <div class="meta-row"><span class="meta-label">Date</span><span class="meta-val">${escHtml(meta.date || '—')}</span></div>
        <div class="meta-row"><span class="meta-label">Arden</span><span class="meta-val">${escHtml(meta.ardenVersion || '—')}</span></div>
        <div class="meta-row">
          <span class="meta-label">Validation</span>
          <span class="meta-val" style="color:${validColor};font-weight:600">${escHtml(meta.validation || '—')}</span>
        </div>
        ${meta.purpose ? `<div class="meta-purpose">${escHtml(meta.purpose.substring(0, 200))}${meta.purpose.length > 200 ? '…' : ''}</div>` : ''}
      </div>
    `;
  },

  _renderVars(q) {
    const el = document.getElementById('ctxContent');
    if (!el || !this.symbols) return;
    const vars = (this.symbols.variables || []).filter(v => !q || v.name.toLowerCase().includes(q));

    if (vars.length === 0) {
      el.innerHTML = '<div class="ctx-empty">No variables declared</div>'; return;
    }

    const typeColors = {
      'mlm-reference': '#818cf8', 'event': '#f59e0b', 'alert-destination': '#f87171',
      'string': '#34d399', 'number': '#60a5fa', 'boolean': '#a78bfa',
      'argument': '#f472b6', 'read-result': '#38bdf8', 'call-result': '#fb923c',
      'variable': '#94a3b8'
    };

    el.innerHTML = vars.map(v => `
      <div class="ctx-item var-item" data-line="${v.line}" title="Line ${v.line}: ${escHtml(v.rhs || '')}">
        <span class="ctx-item-name">${escHtml(v.name)}</span>
        <span class="ctx-item-tag" style="background:${typeColors[v.type] || '#475569'}20;color:${typeColors[v.type] || '#94a3b8'}">${v.type}</span>
        <span class="ctx-item-line">L${v.line}</span>
      </div>
    `).join('');

    this._attachJumpHandlers(el);
  },

  _renderMLMs(q) {
    const el = document.getElementById('ctxContent');
    if (!el || !this.symbols) return;
    const refs = (this.symbols.mlmRefs || []).filter(r => !q || r.mlmName.toLowerCase().includes(q) || (r.varName||'').toLowerCase().includes(q));

    if (refs.length === 0) {
      el.innerHTML = '<div class="ctx-empty">No external MLM references</div>'; return;
    }

    el.innerHTML = refs.map(r => `
      <div class="ctx-item mlm-item" data-line="${r.line}" title="Jump to line ${r.line}">
        <div class="ctx-item-main">
          <span class="ctx-mlm-icon">📦</span>
          <span class="ctx-item-name">${escHtml(r.mlmName)}</span>
        </div>
        <div class="ctx-item-sub">
          ${r.varName ? `<span class="ctx-var-ref">→ ${escHtml(r.varName)}</span>` : ''}
          <span class="ctx-item-line">L${r.line}</span>
        </div>
      </div>
    `).join('');

    this._attachJumpHandlers(el);
  },

  _renderSQL(q) {
    const el = document.getElementById('ctxContent');
    if (!el || !this.symbols) return;
    const queries = (this.symbols.sqlQueries || []).filter(s => !q || s.clean.toLowerCase().includes(q));

    if (queries.length === 0) {
      el.innerHTML = '<div class="ctx-empty">No SQL queries found</div>'; return;
    }

    el.innerHTML = queries.map((q2, i) => `
      <div class="ctx-item sql-item" data-line="${q2.line}" title="Jump to line ${q2.line}">
        <div class="ctx-item-main">
          <span class="ctx-sql-icon">🗄️</span>
          <span class="ctx-sql-num">Query ${i + 1}</span>
          <span class="ctx-item-line">L${q2.line}</span>
          ${!q2.hasSQLInjectionProtection ? '<span class="ctx-warn-badge">⚠️ No SQL()</span>' : ''}
        </div>
        <div class="ctx-sql-preview">${escHtml(q2.clean.substring(0, 120))}${q2.clean.length > 120 ? '…' : ''}</div>
      </div>
    `).join('');

    this._attachJumpHandlers(el);
  },

  _renderEvents(q) {
    const el = document.getElementById('ctxContent');
    if (!el || !this.symbols) return;
    const events = (this.symbols.events || []).filter(e => !q || e.varName.toLowerCase().includes(q) || e.definition.toLowerCase().includes(q));
    const buttons = (this.symbols.buttons || []).filter(b => !q || b.name.toLowerCase().includes(q));

    if (events.length === 0 && buttons.length === 0) {
      el.innerHTML = '<div class="ctx-empty">No events or button handlers detected</div>'; return;
    }

    let html = '';
    events.forEach(e => {
      html += `
        <div class="ctx-item event-item" data-line="${e.line}">
          <span class="ctx-event-icon">⚡</span>
          <span class="ctx-item-name">${escHtml(e.varName)}</span>
          <div class="ctx-event-def">${escHtml(e.definition.substring(0, 100))}</div>
          <span class="ctx-item-line">L${e.line}</span>
        </div>
      `;
    });
    if (buttons.length > 0) {
      html += `<div class="ctx-section-label">🖱️ Button Handlers</div>`;
      buttons.forEach(b => {
        html += `
          <div class="ctx-item button-item" data-line="${b.line}">
            <span class="ctx-btn-icon">🖱️</span>
            <span class="ctx-item-name">"${escHtml(b.name)}"</span>
            <span class="ctx-item-line">L${b.line}</span>
          </div>
        `;
      });
    }

    el.innerHTML = html;
    this._attachJumpHandlers(el);
  },

  _renderObs(q) {
    const el = document.getElementById('ctxContent');
    if (!el || !this.symbols) return;
    const obs = (this.symbols.observations || []).filter(o => !q || o.toLowerCase().includes(q));

    if (obs.length === 0) {
      el.innerHTML = '<div class="ctx-empty">No observation names detected</div>'; return;
    }

    el.innerHTML = obs.map(o => `
      <div class="ctx-item obs-item" title="${escHtml(o)}">
        <span class="ctx-obs-icon">📋</span>
        <span class="ctx-item-name">"${escHtml(o)}"</span>
        <button class="ctx-copy-btn" data-copy="${escHtml(o)}" title="Copy observation name">⎘</button>
      </div>
    `).join('');

    // Copy buttons
    el.querySelectorAll('.ctx-copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(btn.dataset.copy).then(() => {
          btn.textContent = '✓';
          setTimeout(() => btn.textContent = '⎘', 1500);
        });
      });
    });
  },

  _attachJumpHandlers(el) {
    el.querySelectorAll('[data-line]').forEach(item => {
      const line = parseInt(item.dataset.line);
      if (line && this.editor) {
        item.style.cursor = 'pointer';
        item.addEventListener('click', () => {
          this.editor.revealLineInCenter(line);
          this.editor.setPosition({ lineNumber: line, column: 1 });
          this.editor.focus();
          if (window.closeSidebarsOnMobile) window.closeSidebarsOnMobile();
        });
      }
    });
  }
};

function escHtml(text) {
  if (!text) return '';
  return String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
