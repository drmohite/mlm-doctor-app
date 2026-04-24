// MLM Forge — Outline Panel
// Left sidebar showing a structured tree of the MLM's sections, variables, events, SQL

window.OutlinePanel = {
  el: null,
  editor: null,

  init(editor) {
    this.editor = editor;
    this.el = document.getElementById('outlineTree');
    if (!this.el) return;
  },

  update(symbols) {
    if (!this.el || !symbols) return;
    this.el.innerHTML = '';

    // ── Sections ────────────────────────────────────────────────────────────
    if (symbols.sections && symbols.sections.length > 0) {
      this._addGroup('📁 Sections', symbols.sections.map(s => ({
        label: s.kind === 'section' ? `▶ ${s.name}:` : `  ⤷ ${s.name}:`,
        line: s.line,
        icon: s.kind === 'section' ? 'outline-section' : 'outline-slot'
      })));
    }

    // ── Variables ────────────────────────────────────────────────────────────
    if (symbols.variables && symbols.variables.length > 0) {
      const typeIcons = {
        'mlm-reference': '📦', 'event': '⚡', 'alert-destination': '🔔',
        'string': '📝', 'number': '🔢', 'boolean': '✅', 'argument': '📥',
        'read-result': '🗄️', 'call-result': '📤', 'object-type': '🧩',
        'object-instance': '🔷', 'null': '⭕', 'variable': '🔶'
      };
      this._addGroup('🔶 Variables', symbols.variables.map(v => ({
        label: `${typeIcons[v.type] || '🔶'} ${v.name}`,
        line: v.line,
        detail: v.type,
        icon: 'outline-var'
      })));
    }

    // ── MLM References ────────────────────────────────────────────────────────
    if (symbols.mlmRefs && symbols.mlmRefs.length > 0) {
      this._addGroup('📦 MLM References', symbols.mlmRefs.map(r => ({
        label: `📦 ${r.mlmName}`,
        line: r.line,
        detail: r.varName ? `→ ${r.varName}` : '',
        icon: 'outline-mlm'
      })));
    }

    // ── Events ────────────────────────────────────────────────────────────────
    if (symbols.events && symbols.events.length > 0) {
      this._addGroup('⚡ Events', symbols.events.filter(e => !e.isEvoke).map(e => ({
        label: `⚡ ${e.varName}`,
        line: e.line,
        detail: e.definition.substring(0, 50),
        icon: 'outline-event'
      })));
    }

    // ── SQL Queries ────────────────────────────────────────────────────────────
    if (symbols.sqlQueries && symbols.sqlQueries.length > 0) {
      this._addGroup('🗄️ SQL Queries', symbols.sqlQueries.map((q, i) => ({
        label: `🗄️ Query ${i + 1}`,
        line: q.line,
        detail: q.clean.substring(0, 60) + (q.clean.length > 60 ? '…' : ''),
        icon: 'outline-sql'
      })));
    }

    // ── Observations ──────────────────────────────────────────────────────────
    if (symbols.observations && symbols.observations.length > 0) {
      this._addGroup('📋 Observations', symbols.observations.slice(0, 20).map(o => ({
        label: `📋 "${o}"`,
        line: null,
        icon: 'outline-obs'
      })));
    }
  },

  _addGroup(title, items) {
    if (!items || items.length === 0) return;

    const group = document.createElement('div');
    group.className = 'outline-group';

    const header = document.createElement('div');
    header.className = 'outline-group-header';
    header.innerHTML = `<span class="outline-group-arrow">▾</span> ${title} <span class="outline-count">${items.length}</span>`;
    header.addEventListener('click', () => {
      list.style.display = list.style.display === 'none' ? 'block' : 'none';
      header.querySelector('.outline-group-arrow').textContent = list.style.display === 'none' ? '▸' : '▾';
    });

    const list = document.createElement('div');
    list.className = 'outline-group-items';

    items.forEach(item => {
      const el = document.createElement('div');
      el.className = `outline-item ${item.icon || ''}`;
      el.title = item.detail || item.label;

      const labelSpan = document.createElement('span');
      labelSpan.className = 'outline-item-label';
      labelSpan.textContent = item.label;
      el.appendChild(labelSpan);

      if (item.detail) {
        const detailSpan = document.createElement('span');
        detailSpan.className = 'outline-item-detail';
        detailSpan.textContent = item.detail;
        el.appendChild(detailSpan);
      }

      if (item.line && this.editor) {
        el.addEventListener('click', () => {
          this.editor.revealLineInCenter(item.line);
          this.editor.setPosition({ lineNumber: item.line, column: 1 });
          this.editor.focus();
          if (window.closeSidebarsOnMobile) window.closeSidebarsOnMobile();
        });
        el.classList.add('outline-item-clickable');
      }

      list.appendChild(el);
    });

    group.appendChild(header);
    group.appendChild(list);
    this.el.appendChild(group);
  }
};
