// MLM Forge — Flow Visualization Panel
// Generates a Refined Architectural Flow Map in Dark Mode with Click-to-Inspect logic.

window.FlowPanel = {
  containerId: 'ctxContent',
  symbols: null,
  
  transform: { x: 0, y: 0, scale: 1 },
  isDragging: false,
  lastMouse: { x: 0, y: 0 },
  nodeData: {}, // Map of S0 -> full code

  init() {
    if (window.mermaid) {
      window.mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          primaryColor: '#1c2d3f', primaryTextColor: '#e6edf3', primaryBorderColor: '#30363d',
          lineColor: '#8b949e', secondaryColor: '#21262d', tertiaryColor: '#0d1117', mainBkg: '#0d1117'
        },
        securityLevel: 'loose',
        maxNodes: 50000, maxEdges: 50000,
        flowchart: { useMaxWidth: false, htmlLabels: true, curve: 'basis' }
      });
    }
    // Global click listener for tooltip dismissal
    document.addEventListener('click', (e) => {
      const tooltip = document.getElementById('flowTooltip');
      if (tooltip && !e.target.closest('.node') && !e.target.closest('#flowTooltip')) {
        tooltip.style.display = 'none';
      }
    });
  },

  update(symbols) {
    this.symbols = symbols;
    if (window.ContextPanel && window.ContextPanel.currentTab === 'flow') {
      this.render();
    }
  },

  async render() {
    const el = document.getElementById(this.containerId);
    if (!el || !this.symbols) return;
    const diagramText = this._generateMermaid(this.symbols, true);
    el.innerHTML = `
      <div class="flow-container">
        <div class="mermaid" id="mermaid-graph">${diagramText}</div>
        <div class="flow-actions">
          <button class="btn-fullscreen primary" onclick="FlowPanel.openModal()">⛶ View Full Architectural Map</button>
        </div>
      </div>
    `;
    if (window.mermaid) {
      try {
        const { svg } = await window.mermaid.render('mermaid-svg-preview', diagramText);
        const graphEl = document.getElementById('mermaid-graph');
        if (graphEl) graphEl.innerHTML = svg;
      } catch (e) {
        document.getElementById('mermaid-graph').innerHTML = '<div class="flow-preview-error">Generating Architectural Map…</div>';
      }
    }
  },

  async openModal() {
    const modal = document.getElementById('flowModal');
    const container = document.getElementById('modalFlowContainer');
    if (!modal || !container || !this.symbols) return;
    modal.classList.add('show');
    
    // Ensure tooltip exists
    if (!document.getElementById('flowTooltip')) {
      const tt = document.createElement('div');
      tt.id = 'flowTooltip';
      tt.className = 'flow-tooltip';
      document.body.appendChild(tt);
    }

    const diagramText = this._generateMermaid(this.symbols, false);
    container.innerHTML = '<div class="flow-loading">Loading Full Architectural Map…</div>';
    try {
      const { svg } = await window.mermaid.render('mermaid-svg-full', diagramText);
      container.innerHTML = svg;
      const svgEl = container.querySelector('svg');
      if (svgEl) {
        svgEl.style.width = 'auto'; svgEl.style.height = 'auto';
        this._initZoomPan(container, svgEl);
        this._attachNodeListeners(svgEl);
      }
    } catch (e) {
      console.error('[FlowPanel] Render Error:', e);
      container.innerHTML = `
        <div class="flow-error" style="text-align:left; padding:20px; background:transparent">
          <h3 style="color:#f85149">Architectural Map Failed</h3>
          <pre style="white-space:pre-wrap; font-size:11px; margin-top:10px; color:#f85149; background:#0d1117; padding:10px; border-radius:4px">${e.message}</pre>
        </div>
      `;
    }
  },

  _attachNodeListeners(svg) {
    const nodes = svg.querySelectorAll('.node');
    nodes.forEach(node => {
      node.style.cursor = 'help';
      node.onclick = (e) => {
        e.stopPropagation();
        const id = node.id.split('-')[1]; // Mermaid IDs are often 'flow-S0-...'
        const content = this.nodeData[id];
        if (content) this.showTooltip(e.clientX, e.clientY, content);
      };
    });
  },

  showTooltip(x, y, content) {
    const tt = document.getElementById('flowTooltip');
    if (!tt) return;
    tt.innerHTML = `<div class="tt-header">Logic Inspector</div><pre class="tt-code">${this._escapeHTML(content)}</pre>`;
    tt.style.display = 'block';
    // Position check (keep on screen)
    const w = 400; const h = tt.offsetHeight;
    let finalX = x + 15; let finalY = y + 15;
    if (finalX + w > window.innerWidth) finalX = x - w - 15;
    if (finalY + h > window.innerHeight) finalY = y - h - 15;
    tt.style.left = `${finalX}px`; tt.style.top = `${finalY}px`;
  },

  _escapeHTML(str) {
    return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  },

  closeModal() {
    const modal = document.getElementById('flowModal');
    if (modal) modal.classList.remove('show');
    const tt = document.getElementById('flowTooltip');
    if (tt) tt.style.display = 'none';
  },

  zoomIn() { this.transform.scale *= 1.2; this._updateTransform(); },
  zoomOut() { this.transform.scale *= 0.8; this._updateTransform(); },

  _updateTransform() {
    const container = document.getElementById('modalFlowContainer');
    const svg = container?.querySelector('svg');
    const zoomText = document.getElementById('zoomLevel');
    if (svg) svg.style.transform = `translate(${this.transform.x}px, ${this.transform.y}px) scale(${this.transform.scale})`;
    if (zoomText) zoomText.textContent = `${Math.round(this.transform.scale * 100)}%`;
  },

  _initZoomPan(container, svg) {
    this.transform = { x: 50, y: 50, scale: 0.8 };
    this._updateTransform();
    container.onwheel = (e) => { e.preventDefault(); this.transform.scale *= (e.deltaY > 0 ? 0.9 : 1.1); this._updateTransform(); };
    container.onmousedown = (e) => { this.isDragging = true; this.lastMouse = { x: e.clientX, y: e.clientY }; };
    window.onmousemove = (e) => {
      if (!this.isDragging) return;
      this.transform.x += (e.clientX - this.lastMouse.x); this.transform.y += (e.clientY - this.lastMouse.y);
      this.lastMouse = { x: e.clientX, y: e.clientY }; this._updateTransform();
    };
    window.onmouseup = () => { this.isDragging = false; };
  },

  _generateMermaid(symbols, isSidebar) {
    let lines = ['graph TD'];
    const allSteps = [...(symbols.flow.data || []), ...(symbols.flow.logic || [])];
    this.nodeData = {}; // Clear previous data
    
    let groupedSteps = [];
    let currentGroup = null;
    allSteps.forEach(step => {
      if (['if', 'elseif', 'else', 'endif', 'conclude', 'try', 'catch', 'endtry'].includes(step.type)) {
        if (currentGroup) { groupedSteps.push(currentGroup); currentGroup = null; }
        groupedSteps.push(step);
      } else {
        if (!currentGroup) {
          currentGroup = { type: 'group', kind: step.type, steps: [step] };
        } else if (currentGroup.kind === step.type || (currentGroup.kind === 'assign' && step.type === 'stmt')) {
          currentGroup.steps.push(step);
        } else {
          groupedSteps.push(currentGroup);
          currentGroup = { type: 'group', kind: step.type, steps: [step] };
        }
      }
    });
    if (currentGroup) groupedSteps.push(currentGroup);

    const cleanLabel = (txt) => {
      if (!txt) return '';
      return txt.replace(/[\[\]"(){}]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\\/g, ' ').replace(/\s+/g, ' ').trim();
    };

    lines.push('  Start(["⚡ Trigger"])');
    let lastId = 'Start';
    const stack = [];

    groupedSteps.forEach((step, i) => {
      const id = `S${i}`;
      let label = step.label || step.code || '';
      let fullCode = step.code || '';
      let shapeChars = ['[', ']'];
      let cssClass = 'step';

      if (step.type === 'group') {
        let base = (step.kind === 'read') ? `Retrieve data (${step.steps.length} items)` : 
                   (step.kind === 'call') ? `Call sub-modules (${step.steps.length} calls)` :
                   (step.kind === 'assign') ? `State initialization` : `Logic block`;
        const snippet = step.steps[0] ? cleanLabel(step.steps[0].label.substring(0, 45)) : '';
        label = `${base}<br/><small style="opacity:0.6">e.g. ${snippet}...</small>`;
        fullCode = step.steps.map(s => s.code).join('\n');
        if (step.kind === 'call') cssClass = 'm-call';
      } else if (step.type === 'if' || step.type === 'elseif') {
        shapeChars = ['{', '}']; cssClass = 'logic';
        label = cleanLabel(label.replace(/^IF\s+/i, '').replace(/\s+THEN$/i, ''));
      } else if (step.type === 'conclude') {
        shapeChars = ['((', '))']; cssClass = 'action';
      } else if (step.type === 'try' || step.type === 'catch') {
        shapeChars = ['([', '])']; cssClass = 'step';
      }

      this.nodeData[id] = fullCode; // Store actual code
      lines.push(`  ${id}${shapeChars[0]}"${label}"${shapeChars[1]}`);
      
      if (step.type === 'if') {
        lines.push(`  ${lastId} --> ${id}`);
        stack.push({ id, endNodes: [] }); lastId = id; 
      } else if (step.type === 'elseif' || step.type === 'else') {
        if (stack.length > 0) {
          stack[stack.length - 1].endNodes.push(lastId);
          lines.push(`  ${stack[stack.length - 1].id} -- "No" --> ${id}`);
          lastId = id;
        }
      } else if (step.type === 'endif') {
        if (stack.length > 0) {
          const p = stack.pop(); p.endNodes.push(lastId);
          lines.push(`  ${id}([End of branch])`);
          p.endNodes.forEach(n => lines.push(`  ${n} --> ${id}`));
          lastId = id;
        }
      } else {
        if (stack.length > 0 && lastId === stack[stack.length - 1].id) lines.push(`  ${lastId} -- "Yes" --> ${id}`);
        else lines.push(`  ${lastId} --> ${id}`);
        lastId = id;
      }
      lines.push(`  class ${id} ${cssClass}`);
    });

    lines.push(`  ${lastId} --> End(["End of MLM"])`);
    lines.push('  classDef trigger fill:#1c2d3f,stroke:#58a6ff,color:#58a6ff');
    lines.push('  classDef step    fill:#161b22,stroke:#30363d,color:#8b949e');
    lines.push('  classDef logic   fill:#21262d,stroke:#58a6ff,color:#e6edf3');
    lines.push('  classDef m-call  fill:#0d1117,stroke:#bc8cff,color:#bc8cff');
    lines.push('  classDef action  fill:#1b4332,stroke:#3fb950,color:#3fb950');
    return lines.join('\n');
  }
};
