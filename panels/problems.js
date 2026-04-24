// MLM Forge — Problems Panel
// Bottom panel showing all linter diagnostics with severity + click-to-jump

window.ProblemsPanel = {
  el: null,
  editor: null,
  markers: [],

  init(editor) {
    this.editor = editor;
    this.el = document.getElementById('problemsList');
    this.countEl = document.getElementById('problemsCount');
  },

  update(markers) {
    this.markers = markers || [];
    if (!this.el) return;

    this.el.innerHTML = '';

    const errors   = markers.filter(m => m.severity === 8);  // Error
    const warnings = markers.filter(m => m.severity === 4);  // Warning
    const infos    = markers.filter(m => m.severity <= 2);   // Info/Hint

    // Update count badge
    if (this.countEl) {
      this.countEl.innerHTML = markers.length === 0
        ? '<span class="problems-ok">✅ No issues</span>'
        : `<span class="prob-error">🔴 ${errors.length}</span> <span class="prob-warn">🟡 ${warnings.length}</span> <span class="prob-info">🔵 ${infos.length}</span>`;
    }

    if (markers.length === 0) {
      this.el.innerHTML = '<div class="problems-empty">✅ No issues detected</div>';
      return;
    }

    // Sort: errors first, then warnings, then info
    const sorted = [...errors, ...warnings, ...infos];

    sorted.forEach(m => {
      const item = document.createElement('div');
      const sevClass = m.severity === 8 ? 'prob-error' : m.severity === 4 ? 'prob-warn' : 'prob-info';
      const sevIcon  = m.severity === 8 ? '🔴' : m.severity === 4 ? '🟡' : '🔵';
      item.className = `problem-item ${sevClass}`;

      item.innerHTML = `
        <span class="prob-icon">${sevIcon}</span>
        <span class="prob-msg">${escapeHtml(m.message)}</span>
        <span class="prob-location">Line ${m.startLineNumber}</span>
      `;

      item.addEventListener('click', () => {
        if (this.editor) {
          this.editor.revealLineInCenter(m.startLineNumber);
          this.editor.setPosition({ lineNumber: m.startLineNumber, column: m.startColumn });
          this.editor.focus();
        }
      });

      this.el.appendChild(item);
    });
  }
};

function escapeHtml(text) {
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
