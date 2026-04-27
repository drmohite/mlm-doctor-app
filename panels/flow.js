// MLM Forge — Flow Visualization Panel
// Generates a Refined Architectural Flow Map in Dark Mode with Click-to-Inspect logic.

window.FlowPanel = {
  containerId: 'ctxContent',
  symbols: null,
  
  transform: { x: 0, y: 0, scale: 1 },
  isDragging: false,
  lastMouse: { x: 0, y: 0 },
  nodeData: {}, // Map of S0 -> full code
  nodeMeta: {}, // Map of nodeId -> semantic node metadata
  lastRenderGraph: null,
  selectedNodeId: null,

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
        maxTextSize: 1000000,
        maxNodes: 50000, maxEdges: 50000,
        flowchart: { useMaxWidth: false, htmlLabels: true, curve: 'basis' }
      });
    }
    // Global click listener for tooltip dismissal
    document.addEventListener('click', (e) => {
      const tooltip = document.getElementById('flowTooltip');
      if (tooltip && !e.target.closest('.node') && !e.target.closest('#flowTooltip')) {
        tooltip.style.display = 'none';
        const svg = document.querySelector('#modalFlowContainer svg');
        if (svg) this._clearRouteHighlight(svg);
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
        const { svg } = await this._renderWithFallback(diagramText, this.symbols, true, 'mermaid-svg-preview', {
          allowCompactFallback: true
        });
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
      const { svg, isCompact } = await this._renderWithFallback(diagramText, this.symbols, false, 'mermaid-svg-full', {
        allowCompactFallback: false
      });
      container.innerHTML = svg;
      const svgEl = container.querySelector('svg');
      if (svgEl) {
        svgEl.style.width = 'auto'; svgEl.style.height = 'auto';
        this._initZoomPan(container, svgEl);
        this._attachNodeListeners(svgEl);
      }
      if (isCompact) {
        const note = document.createElement('div');
        note.className = 'flow-loading';
        note.style.position = 'absolute';
        note.style.bottom = '12px';
        note.style.right = '12px';
        note.style.padding = '6px 10px';
        note.style.borderRadius = '8px';
        note.style.background = '#161b22';
        note.style.border = '1px solid #30363d';
        note.textContent = 'Large MLM rendered in compact flow mode.';
        container.appendChild(note);
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
    this._clearRouteHighlight(svg);
    const nodes = svg.querySelectorAll('.node');
    nodes.forEach(node => {
      node.style.cursor = 'help';
      node.onclick = (e) => {
        e.stopPropagation();
        const id = this._extractNodeKeyFromGroupId(node.id || '');
        this.selectedNodeId = id;
        this._highlightRouteForNode(svg, id);
        this._showNodeInspector(svg, id, e.clientX, e.clientY);
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

  _showNodeInspector(svg, nodeId, x, y) {
    const tt = document.getElementById('flowTooltip');
    if (!tt) return;
    const content = this.nodeData[nodeId] || 'Node details unavailable';
    const outgoing = this._getOutgoingNodeIds(nodeId);
    const hasMultipleNext = outgoing.length > 1;

    tt.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
        <div class="tt-header" style="margin:0">Logic Inspector</div>
        <div style="display:flex;align-items:center;gap:6px">
          <button id="ttPrevBtn" style="background:#111827;border:1px solid #374151;color:#e5e7eb;border-radius:6px;padding:3px 8px;cursor:pointer">Previous</button>
          <button id="ttNextBtn" style="background:#111827;border:1px solid #374151;color:#e5e7eb;border-radius:6px;padding:3px 8px;cursor:pointer">Next</button>
          <select id="ttNextSelect" style="display:${hasMultipleNext ? 'inline-block' : 'none'};background:#0f172a;border:1px solid #334155;color:#e2e8f0;border-radius:6px;padding:3px 6px;max-width:220px">
            <option value="">Select branch...</option>
            ${outgoing.map((id) => `<option value="${this._escapeHTML(id)}">${this._escapeHTML(this._nodeLabel(id))}</option>`).join('')}
          </select>
        </div>
      </div>
      <pre class="tt-code">${this._escapeHTML(content)}</pre>
    `;
    tt.style.display = 'block';
    this._positionTooltip(tt, x, y);

    const prevBtn = document.getElementById('ttPrevBtn');
    const nextBtn = document.getElementById('ttNextBtn');
    const nextSelect = document.getElementById('ttNextSelect');

    const prevId = this._getPreviousNodeId(nodeId);
    if (!prevId && prevBtn) {
      prevBtn.disabled = true;
      prevBtn.style.opacity = '0.5';
      prevBtn.style.cursor = 'not-allowed';
    }

    if (prevBtn) {
      prevBtn.onclick = (evt) => {
        evt.stopPropagation();
        if (!prevId) return;
        this._navigateToNode(svg, prevId);
      };
    }

    if (nextBtn) {
      nextBtn.onclick = (evt) => {
        evt.stopPropagation();
        const options = this._getOutgoingNodeIds(nodeId);
        if (options.length === 0) return;
        if (options.length === 1) {
          this._navigateToNode(svg, options[0]);
          return;
        }
        if (nextSelect) {
          nextSelect.style.display = 'inline-block';
          nextSelect.focus();
        }
      };
    }

    if (nextSelect) {
      nextSelect.onchange = (evt) => {
        evt.stopPropagation();
        const to = nextSelect.value;
        if (!to) return;
        this._navigateToNode(svg, to);
      };
    }
  },

  _positionTooltip(tt, x, y) {
    const w = 440;
    const h = tt.offsetHeight;
    let finalX = x + 15;
    let finalY = y + 15;
    if (finalX + w > window.innerWidth) finalX = x - w - 15;
    if (finalY + h > window.innerHeight) finalY = y - h - 15;
    tt.style.left = `${finalX}px`;
    tt.style.top = `${finalY}px`;
  },

  _navigateToNode(svg, nodeId) {
    this.selectedNodeId = nodeId;
    this._highlightRouteForNode(svg, nodeId);
    const group = [...svg.querySelectorAll('g.node')].find((g) =>
      this._extractNodeKeyFromGroupId(g.id || '') === nodeId
    );
    if (!group) return;
    const rect = group.getBoundingClientRect();
    const anchorX = rect.right + 10;
    const anchorY = rect.top + 8;
    this._showNodeInspector(svg, nodeId, anchorX, anchorY);
  },

  _getOutgoingNodeIds(nodeId) {
    if (!this.lastRenderGraph || !nodeId) return [];
    const ids = this.lastRenderGraph.edges
      .filter((e) => e.from === nodeId)
      .map((e) => e.to);
    return [...new Set(ids)];
  },

  _getPreviousNodeId(nodeId) {
    if (!this.lastRenderGraph || !nodeId) return null;
    const startId = this.lastRenderGraph.startIds?.[0];
    if (!startId || startId === nodeId) return null;
    const path = this._bfsPath(startId, nodeId, this.lastRenderGraph.edges);
    if (!path || path.length < 2) return null;
    return path[path.length - 2];
  },

  _nodeLabel(nodeId) {
    const meta = this.nodeMeta[nodeId];
    if (!meta) return nodeId;
    return this._sanitizeMermaidLabel(meta.label || meta.fullText || nodeId, 72);
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

  /**
   * Render Mermaid text with overflow fallback.
   * Mermaid sometimes returns an error SVG instead of throwing.
   * @param {string} diagramText
   * @param {any} symbols
   * @param {boolean} isSidebar
   * @param {string} renderId
   * @param {{allowCompactFallback?: boolean}} options
   * @returns {Promise<{svg: string, isCompact: boolean}>}
   */
  async _renderWithFallback(diagramText, symbols, isSidebar, renderId, options = {}) {
    const allowCompactFallback = options.allowCompactFallback !== false;
    const renderOnce = async (id, text) => {
      await window.mermaid.parse(text);
      return window.mermaid.render(id, text);
    };
    const isOverflow = (svgText, errText = '') =>
      /maximum text size in diagram exceeded|maxtextsize/i.test(String(svgText || '') + String(errText || ''));

    try {
      const first = await renderOnce(renderId, diagramText);
      if (!isOverflow(first?.svg)) return { svg: first.svg, isCompact: false };
      if (!allowCompactFallback) {
        throw new Error('Full graph exceeded Mermaid text limits in fullscreen mode.');
      }
      const compact = this._generateCompactMermaid(symbols, isSidebar);
      const second = await renderOnce(`${renderId}-compact`, compact);
      return { svg: second.svg, isCompact: true };
    } catch (err) {
      if (!allowCompactFallback) throw err;
      const compact = this._generateCompactMermaid(symbols, isSidebar);
      try {
        const second = await renderOnce(`${renderId}-compact`, compact);
        return { svg: second.svg, isCompact: true };
      } catch (retryErr) {
        if (isOverflow('', retryErr?.message)) {
          throw new Error('Maximum text size in diagram exceeded even in compact mode.');
        }
        throw retryErr;
      }
    }
  },

  /**
   * Build a stricter Mermaid graph for very large MLMs.
   * @param {any} symbols
   * @param {boolean} isSidebar
   * @returns {string}
   */
  _generateCompactMermaid(symbols, isSidebar) {
    const maxBlocks = isSidebar ? 55 : 120;
    const maxLabelLen = isSidebar ? 36 : 56;
    const maxCodeChars = isSidebar ? 20000 : 38000;
    const allSteps = [...(symbols.flow?.data || []), ...(symbols.flow?.logic || [])];
    const steps = allSteps.slice(0, maxBlocks);
    const lines = ['graph TD'];
    const compactClean = (txt) => {
      const cleaned = String(txt || '')
        .replace(/[\[\]"(){}]/g, '')
        .replace(/[<>]/g, ' ')
        .replace(/&/g, 'and')
        .replace(/\s+/g, ' ')
        .trim();
      return cleaned.length > maxLabelLen ? `${cleaned.slice(0, maxLabelLen - 3)}...` : cleaned;
    };

    this.nodeData = {};
    lines.push('  Start(["Trigger"])');
    lines.push('  class Start trigger');
    let lastId = 'Start';
    let budget = 0;

    for (let i = 0; i < steps.length; i += 1) {
      const step = steps[i];
      const id = `C${i}`;
      const kind = step.type || 'stmt';
      const raw = step.label || step.code || kind;
      const label = compactClean(raw);
      let shapeOpen = '[';
      let shapeClose = ']';
      let cssClass = 'step';
      if (kind === 'if' || kind === 'elseif' || kind === 'else') {
        shapeOpen = '{';
        shapeClose = '}';
        cssClass = 'logic';
      } else if (kind === 'call') {
        cssClass = 'm-call';
      } else if (kind === 'conclude' || kind === 'return') {
        shapeOpen = '((';
        shapeClose = '))';
        cssClass = 'action';
      }
      const nodeLine = `  ${id}${shapeOpen}"${label}"${shapeClose}`;
      const edgeLine = `  ${lastId} --> ${id}`;
      const classLine = `  class ${id} ${cssClass}`;
      const nextCost = nodeLine.length + edgeLine.length + classLine.length;
      if (budget + nextCost > maxCodeChars) break;
      lines.push(nodeLine);
      lines.push(edgeLine);
      lines.push(classLine);
      this.nodeData[id] = String(step.code || '').slice(0, 3000);
      budget += nextCost;
      lastId = id;
    }

    if (steps.length < allSteps.length) {
      lines.push('  Overflow["Additional blocks hidden in compact mode"]');
      lines.push(`  ${lastId} --> Overflow`);
      lines.push('  class Overflow step');
      lastId = 'Overflow';
    }

    lines.push(`  ${lastId} --> End(["End"])`);
    lines.push('  classDef trigger fill:#1c2d3f,stroke:#58a6ff,color:#58a6ff');
    lines.push('  classDef step    fill:#161b22,stroke:#30363d,color:#8b949e');
    lines.push('  classDef logic   fill:#21262d,stroke:#58a6ff,color:#e6edf3');
    lines.push('  classDef m-call  fill:#0d1117,stroke:#bc8cff,color:#bc8cff');
    lines.push('  classDef action  fill:#1b4332,stroke:#3fb950,color:#3fb950');
    return lines.join('\n');
  },

  _generateMermaid(symbols, isSidebar) {
    if (symbols.structuredFlow && symbols.structuredFlow.nodes && symbols.structuredFlow.nodes.length > 0) {
      return this._generateSemanticMermaid(symbols.structuredFlow, isSidebar);
    }
    this.lastRenderGraph = null;
    this.nodeMeta = {};
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
        label = `${base} - e.g. ${snippet}...`;
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
  },

  _generateSemanticMermaid(graph, isSidebar) {
    const maxNodes = isSidebar ? 220 : 1400;
    const maxEdges = isSidebar ? 360 : 3200;
    const nodes = (graph.nodes || []).slice(0, maxNodes);
    const allowed = new Set(nodes.map((n) => n.id));
    const edges = (graph.edges || [])
      .filter((e) => allowed.has(e.from) && allowed.has(e.to))
      .slice(0, maxEdges);
    this.lastRenderGraph = {
      nodes,
      edges,
      startIds: nodes.filter((n) => n.kind === 'start').map((n) => n.id),
      terminalIds: nodes.filter((n) => ['gate', 'return', 'end'].includes(n.kind)).map((n) => n.id)
    };
    const lines = ['graph TD'];
    this.nodeData = {};
    this.nodeMeta = {};

    nodes.forEach((node) => {
      const label = this._sanitizeMermaidLabel(node.label || node.fullText || node.id, isSidebar ? 64 : 110);
      const shape = this._shapeForKind(node.kind);
      lines.push(`  ${node.id}${shape.open}"${label}"${shape.close}`);
      lines.push(`  class ${node.id} ${this._classForKind(node.kind)}`);
      this.nodeData[node.id] = `${node.fullText || node.label || ''}\n(Line ${node.line || '?'})`;
      this.nodeMeta[node.id] = node;
    });

    edges.forEach((edge) => {
      const arrow = this._arrowForEdge(edge.kind);
      const edgeLabel = this._sanitizeMermaidLabel(edge.label || '', 26);
      if (edgeLabel) lines.push(`  ${edge.from} ${arrow}|"${edgeLabel}"| ${edge.to}`);
      else lines.push(`  ${edge.from} ${arrow} ${edge.to}`);
    });

    lines.push('  classDef trigger fill:#1c2d3f,stroke:#58a6ff,color:#58a6ff');
    lines.push('  classDef step fill:#161b22,stroke:#30363d,color:#8b949e');
    lines.push('  classDef logic fill:#21262d,stroke:#58a6ff,color:#e6edf3');
    lines.push('  classDef m-call fill:#0d1117,stroke:#bc8cff,color:#bc8cff');
    lines.push('  classDef action fill:#1b4332,stroke:#3fb950,color:#3fb950');
    lines.push('  classDef data fill:#0f2027,stroke:#4db6ac,color:#c9f7f2');
    lines.push('  classDef merge fill:#26222e,stroke:#a78bfa,color:#efe9ff');
    lines.push('  classDef dispatcher fill:#302303,stroke:#f59e0b,color:#fde68a');
    return lines.join('\n');
  },

  _shapeForKind(kind) {
    if (kind === 'condition') return { open: '{', close: '}' };
    if (kind === 'read') return { open: '[(', close: ')]' };
    if (kind === 'return' || kind === 'gate' || kind === 'end') return { open: '((', close: '))' };
    return { open: '[', close: ']' };
  },

  _classForKind(kind) {
    if (kind === 'start') return 'trigger';
    if (kind === 'condition') return 'logic';
    if (kind === 'call') return 'm-call';
    if (kind === 'return' || kind === 'gate') return 'action';
    if (kind === 'read' || kind === 'assign' || kind === 'setup') return 'data';
    if (kind === 'merge') return 'merge';
    if (kind === 'dispatcher') return 'dispatcher';
    return 'step';
  },

  _arrowForEdge(kind) {
    if (kind === 'depends_on') return '-.->';
    if (kind === 'guarded_by') return '-->';
    return '-->';
  },

  _sanitizeMermaidLabel(text, maxLen = 90) {
    const cleaned = String(text || '')
      .replace(/"/g, "'")
      .replace(/\|/g, '/')
      .replace(/[<>]/g, ' ')
      .replace(/[\r\n]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned.length <= maxLen) return cleaned;
    return `${cleaned.slice(0, maxLen - 3)}...`;
  },

  _extractNodeKeyFromGroupId(rawId) {
    const id = String(rawId || '');
    const matches = id.match(/(sf_\d+|S\d+|C\d+|Start|End|Overflow)/g);
    if (matches && matches.length) return matches[matches.length - 1];
    return id;
  },

  _highlightRouteForNode(svg, selectedNodeId) {
    if (!this.lastRenderGraph || !selectedNodeId) return;
    const graph = this.lastRenderGraph;
    const startId = graph.startIds?.[0];
    if (!startId) return;

    const pathToSelected = this._bfsPath(startId, selectedNodeId, graph.edges);
    const pathToTerminal = this._bfsPathToAny(
      selectedNodeId,
      new Set(graph.terminalIds || []),
      graph.edges
    );

    const nodePath = new Set();
    const edgePath = new Set();
    const absorbPath = (arr) => {
      for (let i = 0; i < arr.length; i += 1) nodePath.add(arr[i]);
      for (let i = 1; i < arr.length; i += 1) edgePath.add(`${arr[i - 1]}->${arr[i]}`);
    };
    absorbPath(pathToSelected);
    absorbPath(pathToTerminal);
    if (nodePath.size === 0) nodePath.add(selectedNodeId);

    this._clearRouteHighlight(svg);

    svg.querySelectorAll('g.node').forEach((group) => {
      const key = this._extractNodeKeyFromGroupId(group.id || '');
      if (nodePath.has(key)) {
        group.style.filter = 'drop-shadow(0 0 8px rgba(88,166,255,0.85))';
        const shape = group.querySelector('rect,polygon,path,ellipse,circle');
        if (shape) {
          shape.style.stroke = '#58a6ff';
          shape.style.strokeWidth = '3px';
        }
      }
    });

    svg.querySelectorAll('g.edgePath').forEach((group) => {
      const edgeId = String(group.id || '');
      const ids = edgeId.match(/(sf_\d+|S\d+|C\d+|Start|End|Overflow)/g) || [];
      if (ids.length >= 2) {
        const key = `${ids[0]}->${ids[1]}`;
        if (edgePath.has(key)) {
          const path = group.querySelector('path');
          if (path) {
            path.style.stroke = '#58a6ff';
            path.style.strokeWidth = '3px';
            path.style.opacity = '1';
          }
        }
      }
    });
  },

  _clearRouteHighlight(svg) {
    if (!svg) return;
    svg.querySelectorAll('g.node').forEach((group) => {
      group.style.filter = '';
      const shape = group.querySelector('rect,polygon,path,ellipse,circle');
      if (shape) {
        shape.style.stroke = '';
        shape.style.strokeWidth = '';
      }
    });
    svg.querySelectorAll('g.edgePath path').forEach((path) => {
      path.style.stroke = '';
      path.style.strokeWidth = '';
      path.style.opacity = '';
    });
  },

  _bfsPath(fromId, toId, edges) {
    if (fromId === toId) return [fromId];
    const next = new Map();
    edges.forEach((e) => {
      if (!next.has(e.from)) next.set(e.from, []);
      next.get(e.from).push(e.to);
    });
    const queue = [fromId];
    const parent = new Map([[fromId, null]]);
    while (queue.length) {
      const cur = queue.shift();
      const arr = next.get(cur) || [];
      for (let i = 0; i < arr.length; i += 1) {
        const n = arr[i];
        if (parent.has(n)) continue;
        parent.set(n, cur);
        if (n === toId) {
          const path = [n];
          let p = cur;
          while (p !== null) {
            path.push(p);
            p = parent.get(p);
          }
          return path.reverse();
        }
        queue.push(n);
      }
    }
    return [fromId, toId].filter(Boolean);
  },

  _bfsPathToAny(fromId, terminalSet, edges) {
    if (terminalSet.has(fromId)) return [fromId];
    const next = new Map();
    edges.forEach((e) => {
      if (!next.has(e.from)) next.set(e.from, []);
      next.get(e.from).push(e.to);
    });
    const queue = [fromId];
    const parent = new Map([[fromId, null]]);
    while (queue.length) {
      const cur = queue.shift();
      const arr = next.get(cur) || [];
      for (let i = 0; i < arr.length; i += 1) {
        const n = arr[i];
        if (parent.has(n)) continue;
        parent.set(n, cur);
        if (terminalSet.has(n)) {
          const path = [n];
          let p = cur;
          while (p !== null) {
            path.push(p);
            p = parent.get(p);
          }
          return path.reverse();
        }
        queue.push(n);
      }
    }
    return [fromId];
  }
};
