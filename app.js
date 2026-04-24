// MLM Doctor -- Main Application
// Bootstraps Monaco, wires all panels, handles file open/workspace

let monacoEditor = null;
let workspaceFiles = [];   // [{name, handle, text}]
let currentFile = null;
let symbolDebounce = null;
let _storedDirHandle = null;  // cached handle from IndexedDB

// ---- IndexedDB workspace persistence ----------------------------------------
// The File System Access API handle cannot go in localStorage (not serialisable).
// We use a tiny IDB wrapper to persist the directory handle across refreshes.
// The browser still requires a user gesture to re-grant permission -- so we
// show a visible 'Restore workspace' banner rather than silently requesting.
const IDB = {
  DB_NAME: 'mlm-doctor',
  STORE: 'workspace',
  KEY: 'lastFolder',

  _open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME, 1);
      req.onupgradeneeded = e => e.target.result.createObjectStore(this.STORE);
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = e => reject(e.target.error);
    });
  },

  async save(handle) {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE, 'readwrite');
      const req = tx.objectStore(this.STORE).put(handle, this.KEY);
      req.onsuccess = () => resolve();
      req.onerror = e => reject(e.target.error);
    });
  },

  async load() {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE, 'readonly');
      const req = tx.objectStore(this.STORE).get(this.KEY);
      req.onsuccess = e => resolve(e.target.result || null);
      req.onerror = e => reject(e.target.error);
    });
  },

  async clear() {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE, 'readwrite');
      const req = tx.objectStore(this.STORE).delete(this.KEY);
      req.onsuccess = () => resolve();
      req.onerror = e => reject(e.target.error);
    });
  }
};

let mobileBackdrop = null;

function createBackdrop() {
  if (mobileBackdrop) return;
  mobileBackdrop = document.createElement('div');
  mobileBackdrop.id = 'mobileBackdrop';
  document.body.appendChild(mobileBackdrop);
  mobileBackdrop.addEventListener('click', () => {
    if (window.closeSidebarsOnMobile) window.closeSidebarsOnMobile();
  });
}

// On page load: check if a workspace folder was previously opened and show banner
window.addEventListener('DOMContentLoaded', async () => {
  createBackdrop();

  // Auto-collapse left sidebar on mobile
  if (window.innerWidth <= 768) {
    const leftSidebar = document.getElementById('leftSidebar');
    const btnToggleLeft = document.getElementById('btnToggleLeft');
    if (leftSidebar) leftSidebar.classList.add('collapsed');
    if (btnToggleLeft) btnToggleLeft.classList.remove('active');
  }
  
  // Auto-collapse right sidebar on tablet/mobile
  if (window.innerWidth <= 900) {
    const rightSidebar = document.getElementById('rightSidebar');
    const btnToggleRight = document.getElementById('btnToggleRight');
    if (rightSidebar) rightSidebar.classList.add('collapsed');
    if (btnToggleRight) btnToggleRight.classList.remove('active');
  }

  try {
    const handle = await IDB.load();
    if (handle) {
      _storedDirHandle = handle;
      showRestoreBanner(handle.name);
    }
  } catch (e) {
    console.warn('[MLM Doctor] Could not read stored workspace handle:', e);
  }
});

function showRestoreBanner(folderName) {
  // Remove any existing banner
  document.getElementById('restoreBanner')?.remove();

  const banner = document.createElement('div');
  banner.id = 'restoreBanner';
  banner.innerHTML = `
    <span class="restore-icon">🗂️</span>
    <span class="restore-text">Last workspace: <strong>${escHtml(folderName)}</strong></span>
    <button class="restore-btn" id="btnRestoreWorkspace">Restore</button>
    <button class="restore-forget" id="btnForgetWorkspace" title="Forget this workspace">✕</button>
  `;

  // Insert just below the workspace section header in the left sidebar
  const workspaceInfo = document.getElementById('workspaceInfo');
  if (workspaceInfo) workspaceInfo.after(banner);
  else document.getElementById('fileList').before(banner);

  document.getElementById('btnRestoreWorkspace').addEventListener('click', restoreWorkspace);
  document.getElementById('btnForgetWorkspace').addEventListener('click', async () => {
    await IDB.clear();
    _storedDirHandle = null;
    banner.remove();
    showToast('Workspace forgotten');
  });
}

async function restoreWorkspace() {
  if (!_storedDirHandle) return;
  try {
    // Request permission -- requires user gesture (this click IS the gesture)
    const perm = await _storedDirHandle.requestPermission({ mode: 'read' });
    if (perm !== 'granted') {
      showToast('Permission denied -- please use Open Folder', 'error');
      return;
    }
    // Re-load the file list from the stored handle
    await _loadDirectoryHandle(_storedDirHandle);
    document.getElementById('restoreBanner')?.remove();
  } catch (e) {
    showToast('Could not restore workspace: ' + e.message, 'error');
    console.error(e);
  }
}

// Shared logic: populate file list from a directory handle
async function _loadDirectoryHandle(dirHandle) {
  workspaceFiles = [];
  const fileListEl = document.getElementById('fileList');
  fileListEl.innerHTML = '<div class="file-loading">Loading MLMs…</div>';

  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === 'file' && /\.mlm$/i.test(name)) {
      workspaceFiles.push({ name, handle, text: null });
    }
  }

  workspaceFiles.sort((a, b) => a.name.localeCompare(b.name));
  renderFileList();

  document.getElementById('workspaceName').textContent = dirHandle.name;
  document.getElementById('workspaceCount').textContent = `${workspaceFiles.length} MLMs`;
}

// ── Monaco Bootstrap ────────────────────────────────────────────────────────
require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.47.0/min/vs' } });

require(['vs/editor/editor.main'], function () {
  // 1. Register Arden Syntax language
  window.registerArdenLanguage(monaco);

  // 2. Create Monaco editor
  monacoEditor = monaco.editor.create(document.getElementById('monacoContainer'), {
    language: 'arden',
    theme: 'mlm-dark',
    value: getWelcomeContent(),
    fontSize: 13,
    fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
    fontLigatures: true,
    lineNumbers: 'on',
    minimap: { enabled: true, scale: 1 },
    folding: true,
    foldingStrategy: 'auto',
    wordWrap: 'off',
    scrollBeyondLastLine: false,
    renderLineHighlight: 'all',
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    smoothScrolling: true,
    mouseWheelZoom: true,
    suggest: { showIcons: true, showSnippets: true },
    quickSuggestions: { other: true, comments: false, strings: true },
    parameterHints: { enabled: true },
    formatOnPaste: false,
    tabSize: 4,
    insertSpaces: false,
    automaticLayout: true,
    contextmenu: true,
    occurrencesHighlight: 'singleFile',
    selectionHighlight: true,
    links: false,
    scrollbar: {
      verticalScrollbarSize: 8,
      horizontalScrollbarSize: 8
    }
  });

  // 3. Define custom dark theme
  monaco.editor.defineTheme('mlm-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword.section', foreground: 'c792ea', fontStyle: 'bold' },
      { token: 'keyword.slot', foreground: '89ddff', fontStyle: 'bold' },
      { token: 'keyword.terminator', foreground: 'ff5370', fontStyle: 'bold' },
      { token: 'keyword', foreground: '82aaff' },
      { token: 'keyword.operator', foreground: '89ddff' },
      { token: 'keyword.eventtype', foreground: 'f78c6c', fontStyle: 'italic' },
      { token: 'keyword.sql', foreground: '82aaff', fontStyle: 'bold' },
      { token: 'string', foreground: 'c3e88d' },
      { token: 'string.mlmname', foreground: 'ffcb6b', fontStyle: 'bold' },
      { token: 'comment', foreground: '546e7a', fontStyle: 'italic' },
      { token: 'number', foreground: 'f78c6c' },
      { token: 'constant', foreground: 'ff5370' },
      { token: 'function', foreground: 'ffcb6b', fontStyle: 'bold' },
      { token: 'variable.special', foreground: 'f07178', fontStyle: 'italic bold' },
      { token: 'variable.this', foreground: 'ffcb6b', fontStyle: 'italic' },
      { token: 'identifier', foreground: 'eeffff' },
      { token: 'identifier.sql', foreground: 'c3e88d' },
      { token: 'delimiter.curly', foreground: '89ddff', fontStyle: 'bold' },
      { token: 'delimiter', foreground: '89ddff' },
      { token: 'text', foreground: 'eeffff' },
    ],
    colors: {
      'editor.background': '#0d1117',
      'editor.foreground': '#e6edf3',
      'editor.lineHighlightBackground': '#161b22',
      'editor.selectionBackground': '#264f78',
      'editor.inactiveSelectionBackground': '#1c2433',
      'editorLineNumber.foreground': '#484f58',
      'editorLineNumber.activeForeground': '#8b949e',
      'editorCursor.foreground': '#58a6ff',
      'editorWhitespace.foreground': '#21262d',
      'editorIndentGuide.background1': '#21262d',
      'editorIndentGuide.activeBackground1': '#30363d',
      'editor.wordHighlightBackground': '#264f7844',
      'editor.wordHighlightStrongBackground': '#264f7888',
      'editorBracketMatch.background': '#264f78',
      'editorBracketMatch.border': '#58a6ff',
      'scrollbarSlider.background': '#30363d',
      'scrollbarSlider.hoverBackground': '#484f58',
      'minimap.background': '#0d1117',
      'editorGutter.background': '#0d1117',
      'editorError.foreground': '#f85149',
      'editorWarning.foreground': '#e3b341',
      'editorInfo.foreground': '#58a6ff',
    }
  });

  monaco.editor.setTheme('mlm-dark');

  // 4. Register language intelligence providers
  window.registerArdenCompletion(monaco, workspaceFiles.map(f => f.name));
  window.registerArdenHover(monaco);

  // 5. Register linter
  window.registerArdenLinter(monaco, monacoEditor);

  // 6. Initialise panels
  window.OutlinePanel.init(monacoEditor);
  window.ProblemsPanel.init(monacoEditor);
  window.ContextPanel.init(monacoEditor);

  // 7. Re-analyse symbols on content change
  monacoEditor.onDidChangeModelContent(() => {
    clearTimeout(symbolDebounce);
    symbolDebounce = setTimeout(analyseCurrentFile, 600);
  });
  
  // Close sidebars on mobile when clicking inside editor
  monacoEditor.onMouseDown(() => {
    if (window.closeSidebarsOnMobile) window.closeSidebarsOnMobile();
  });

  // Initial analysis of welcome content
  setTimeout(analyseCurrentFile, 800);

  // 8. Add right-click context menu actions (rename, find refs)
  monacoEditor.addAction({
    id: 'mlmforge.findReferences',
    label: '🔍 Find All References',
    contextMenuGroupId: 'mlmforge',
    contextMenuOrder: 1,
    run(ed) {
      const pos = ed.getPosition();
      const word = ed.getModel().getWordAtPosition(pos);
      if (!word) return;
      findAllReferences(word.word);
    }
  });

  monacoEditor.addAction({
    id: 'mlmforge.renameSymbol',
    label: '✏️ Rename Symbol (this file)',
    contextMenuGroupId: 'mlmforge',
    contextMenuOrder: 2,
    run(ed) {
      const pos = ed.getPosition();
      const word = ed.getModel().getWordAtPosition(pos);
      if (!word) return;
      renameSymbol(word.word);
    }
  });

  monacoEditor.addAction({
    id: 'mlmforge.copyObsName',
    label: '📋 Copy Selection as Observation Name',
    contextMenuGroupId: 'mlmforge',
    contextMenuOrder: 3,
    run(ed) {
      const sel = ed.getModel().getValueInRange(ed.getSelection());
      if (sel) navigator.clipboard.writeText(sel.trim());
    }
  });

  console.log('[MLM Doctor] Ready');
});

// ── Symbol Analysis ──────────────────────────────────────────────────────────
function analyseCurrentFile() {
  if (!monacoEditor || !window.ArdenSymbols) return;
  const text = monacoEditor.getValue();
  const symbols = window.ArdenSymbols.extract(text);

  window.OutlinePanel.update(symbols);
  window.ContextPanel.update(symbols);
}

// ── File Operations ──────────────────────────────────────────────────────────
async function openFile() {
  try {
    const [handle] = await window.showOpenFilePicker({
      types: [{ description: 'MLM Files', accept: { 'text/plain': ['.mlm', '.MLM', '.txt'] } }],
      multiple: false
    });
    const file = await handle.getFile();
    const text = await file.text();
    loadContent(text, file.name, handle);
  } catch (e) {
    if (e.name !== 'AbortError') console.error('File open failed:', e);
  }
}

async function openFolder() {
  try {
    const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
    await _loadDirectoryHandle(dirHandle);

    // Persist handle in IndexedDB so we can restore it after a refresh
    _storedDirHandle = dirHandle;
    await IDB.save(dirHandle);
    document.getElementById('restoreBanner')?.remove();
  } catch (e) {
    if (e.name !== 'AbortError') console.error('Folder open failed:', e);
  }
}

function renderFileList() {
  const el = document.getElementById('fileList');
  const q = (document.getElementById('fileSearch')?.value || '').toLowerCase();
  const filtered = workspaceFiles.filter(f => f.name.toLowerCase().includes(q));

  if (filtered.length === 0) {
    el.innerHTML = '<div class="file-empty">No MLMs found</div>'; return;
  }

  el.innerHTML = '';
  filtered.forEach(f => {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.innerHTML = `<span class="file-icon">📄</span><span class="file-name">${escHtml(f.name)}</span>`;
    item.addEventListener('click', () => loadWorkspaceFile(f));
    el.appendChild(item);
  });
}

async function loadWorkspaceFile(fileEntry) {
  if (!fileEntry.text) {
    const file = await fileEntry.handle.getFile();
    fileEntry.text = await file.text();
  }
  loadContent(fileEntry.text, fileEntry.name, fileEntry.handle);

  // Highlight active in file list
  document.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));
  const items = document.querySelectorAll('.file-item .file-name');
  items.forEach(el => {
    if (el.textContent === fileEntry.name) el.closest('.file-item').classList.add('active');
  });

  if (window.closeSidebarsOnMobile) window.closeSidebarsOnMobile();
}

function loadContent(text, filename, handle) {
  if (!monacoEditor) return;
  currentFile = { text, filename, handle };
  const model = monaco.editor.createModel(text, 'arden');
  monacoEditor.setModel(model);
  document.getElementById('currentFileName').textContent = filename;
  document.title = `MLM Doctor — ${filename}`;

  // Re-register linter on new model
  window.registerArdenLinter(monaco, monacoEditor);

  // Re-wire change listener
  monacoEditor.onDidChangeModelContent(() => {
    clearTimeout(symbolDebounce);
    symbolDebounce = setTimeout(analyseCurrentFile, 600);
  });

  analyseCurrentFile();
}

async function saveFile() {
  if (!monacoEditor || !currentFile) return;
  const text = monacoEditor.getValue();
  if (currentFile.handle && currentFile.handle.kind === 'file') {
    try {
      const writable = await currentFile.handle.createWritable();
      await writable.write(text);
      await writable.close();
      showToast('✅ Saved: ' + currentFile.filename);
      currentFile.text = text;
    } catch (e) {
      showToast('❌ Save failed: ' + e.message, 'error');
    }
  } else {
    // Save As
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: currentFile.filename || 'new.MLM',
        types: [{ description: 'MLM File', accept: { 'text/plain': ['.MLM', '.mlm'] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(text);
      await writable.close();
      currentFile.handle = handle;
      currentFile.filename = handle.name;
      document.getElementById('currentFileName').textContent = handle.name;
      showToast('✅ Saved: ' + handle.name);
    } catch (e) {
      if (e.name !== 'AbortError') showToast('❌ Save failed: ' + e.message, 'error');
    }
  }
}

// ── Find All References ───────────────────────────────────────────────────────
function findAllReferences(varName) {
  if (!monacoEditor || !window.ArdenSymbols) return;
  const text = monacoEditor.getValue();
  const refs = window.ArdenSymbols.findReferences(text, varName);

  // Show results in problems panel
  const el = document.getElementById('problemsList');
  if (!el) return;

  showProblemsPanel();
  el.innerHTML = `<div class="refs-header">🔍 References to <strong>${escHtml(varName)}</strong> — ${refs.length} found</div>` +
    refs.map(r => `
      <div class="problem-item prob-info ref-item" data-line="${r.line}">
        <span class="prob-icon">🔷</span>
        <span class="prob-msg">${escHtml(r.text.substring(0, 100))}</span>
        <span class="prob-location">Line ${r.line}</span>
      </div>
    `).join('');

  el.querySelectorAll('[data-line]').forEach(item => {
    item.style.cursor = 'pointer';
    item.addEventListener('click', () => {
      monacoEditor.revealLineInCenter(parseInt(item.dataset.line));
      monacoEditor.setPosition({ lineNumber: parseInt(item.dataset.line), column: 1 });
      monacoEditor.focus();
    });
  });

  // Also highlight all occurrences in editor
  const model = monacoEditor.getModel();
  const decorations = refs.map(r => ({
    range: new monaco.Range(r.line, 1, r.line, model.getLineLength(r.line) + 1),
    options: { isWholeLine: false, className: 'ref-highlight', inlineClassName: 'ref-inline-highlight' }
  }));
  monacoEditor.createDecorationsCollection(decorations);
}

// ── Rename Symbol ─────────────────────────────────────────────────────────────
function renameSymbol(oldName) {
  const newName = prompt(`Rename '${oldName}' to:`, oldName);
  if (!newName || newName === oldName || !newName.match(/^[a-zA-Z_]\w*$/)) {
    if (newName && !newName.match(/^[a-zA-Z_]\w*$/)) alert('Invalid variable name. Use letters, numbers, and underscores only.');
    return;
  }
  const text = monacoEditor.getValue();
  const newText = window.ArdenSymbols.renameSymbol(text, oldName, newName);
  monacoEditor.setValue(newText);
  showToast(`✏️ Renamed '${oldName}' → '${newName}'`);
}

// ── Edit Actions ──────────────────────────────────────────────────────────────
function undo() {
  if (monacoEditor) {
    monacoEditor.trigger('keyboard', 'undo', null);
    monacoEditor.focus();
  }
}

function redo() {
  if (monacoEditor) {
    monacoEditor.trigger('keyboard', 'redo', null);
    monacoEditor.focus();
  }
}

// ── UI Helpers ────────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('show'), 10);
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3000);
}

function showProblemsPanel() {
  const panel = document.getElementById('problemsPanel');
  if (panel) panel.style.display = 'block';
  const btn = document.getElementById('btnToggleProblems');
  if (btn) btn.classList.add('active');
}

function toggleProblemsPanel() {
  const panel = document.getElementById('problemsPanel');
  if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function toggleSidebar(side) {
  const el = document.getElementById(side === 'left' ? 'leftSidebar' : 'rightSidebar');
  if (el) {
    // If opening on mobile, close the other sidebar first to prevent overlap
    if (window.innerWidth <= 900 && el.classList.contains('collapsed')) {
      if (window.closeSidebarsOnMobile) window.closeSidebarsOnMobile();
    }
    
    el.classList.toggle('collapsed');
    const btn = document.getElementById(side === 'left' ? 'btnToggleLeft' : 'btnToggleRight');
    if (btn) {
      if (el.classList.contains('collapsed')) {
        btn.classList.remove('active');
      } else {
        btn.classList.add('active');
      }
    }
    
    // Manage backdrop
    if (window.innerWidth <= 900) {
      const anyOpen = (!document.getElementById('leftSidebar')?.classList.contains('collapsed')) || 
                      (!document.getElementById('rightSidebar')?.classList.contains('collapsed'));
      if (mobileBackdrop) {
        if (anyOpen) mobileBackdrop.classList.add('show');
        else mobileBackdrop.classList.remove('show');
      }
    }
  }
}

window.closeSidebarsOnMobile = function() {
  if (window.innerWidth <= 900) {
    ['left', 'right'].forEach(side => {
      const el = document.getElementById(side + 'Sidebar');
      const btn = document.getElementById('btnToggle' + (side === 'left' ? 'Left' : 'Right'));
      if (el && !el.classList.contains('collapsed')) {
        el.classList.add('collapsed');
        if (btn) btn.classList.remove('active');
      }
    });
    if (mobileBackdrop) mobileBackdrop.classList.remove('show');
  }
};

window.addEventListener('resize', () => {
  if (window.innerWidth > 900 && mobileBackdrop) {
    mobileBackdrop.classList.remove('show');
  } else if (window.innerWidth <= 900 && mobileBackdrop) {
    const anyOpen = (!document.getElementById('leftSidebar')?.classList.contains('collapsed')) || 
                    (!document.getElementById('rightSidebar')?.classList.contains('collapsed'));
    if (anyOpen) mobileBackdrop.classList.add('show');
  }
});

// Close sidebars if clicking outside of them on mobile
document.addEventListener('click', (e) => {
  if (window.innerWidth <= 900) {
    const inLeft = e.target.closest('#leftSidebar') || e.target.closest('#btnToggleLeft');
    const inRight = e.target.closest('#rightSidebar') || e.target.closest('#btnToggleRight');
    if (!inLeft && !inRight) {
      if (window.closeSidebarsOnMobile) window.closeSidebarsOnMobile();
    }
  }
});

function escHtml(text) {
  if (!text) return '';
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Keyboard Shortcuts ────────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveFile();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
    e.preventDefault();
    openFile();
  }
});

// ── File search filter ────────────────────────────────────────────────────────
document.getElementById('fileSearch')?.addEventListener('input', renderFileList);

// ── Welcome content ───────────────────────────────────────────────────────────
function getWelcomeContent() {
  return `maintenance:
\ttitle: WELCOME_TO_MLM_DOCTOR;;
\tmlmname: WELCOME_TO_MLM_DOCTOR;;
\tarden: version 2.5;;
\tversion: 1.00;;
\tinstitution: DrMohite.com;;
\tauthor: Dr. Nitin Mohite;;
\tdate: 2026-04-24;;
\tvalidation: testing;;

library:
\tpurpose:
\t\tWelcome to MLM Doctor -- your smart Arden Syntax IDE created by Dr. Nitin Mohite.

\t\tGET STARTED:
\t\t  1. Click "Open Folder" to load your MLM workspace
\t\t  2. Click any .MLM file in the left panel to open it
\t\t  3. Or press Ctrl+O to open a single file

\t\tSMART FEATURES:
\t\t  * IntelliSense: type IF, FOR, MLM ', or any keyword for suggestions
\t\t  * Hover: hover any keyword or variable for documentation
\t\t  * Linter: errors appear as red squiggles instantly
\t\t  * Outline: left panel shows all variables, events, SQL blocks
\t\t  * Context: right panel shows metadata, variables, SQL, observations
\t\t  * Right-click: Find All References / Rename Symbol
\t\t  * Ctrl+S: Save file
\t;;
\texplanation: ;;
\tkeywords: arden, mlm, ghft;;
\tcitations: ;;

knowledge:
\ttype: data-driven;;
\tdata:

\t\t(this_documentCommunication) := ARGUMENT;

\t\t// Try typing: IF <space> to trigger IntelliSense
\t\t// Try typing: MLM ' to see MLM name suggestions
\t\t// Try hovering over keywords like CALL, READ, EVENT
\t\t// Right-click any variable name for Find References / Rename

\t;;
\tpriority: 50
\t;;
\tevoke:
\t;;
\tlogic:
\t\t\tconclude true;
\t;;
\taction:
\t\t\treturn this_documentCommunication;
\t;;
Urgency: 50;;
end:
`;
}
