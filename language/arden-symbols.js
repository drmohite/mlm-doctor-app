// MLM Forge — Symbol Extraction Engine
// Parses an MLM file's text and extracts a structured symbol table:
// variables, MLM references, events, SQL queries, observations

window.ArdenSymbols = {
  /**
   * Main entry point: parse full MLM text into a symbol table
   * @param {string} text - raw MLM source text
   * @returns {Object} symbol table
   */
  extract(text) {
    return {
      metadata:     this.extractMetadata(text),
      variables:    this.extractVariables(text),
      mlmRefs:      this.extractMLMRefs(text),
      events:       this.extractEvents(text),
      sqlQueries:   this.extractSQL(text),
      observations: this.extractObservations(text),
      buttons:      this.extractButtons(text),
      sections:     this.extractSections(text),
      flow:         this.extractFlow(text),
      structuredFlow: this.extractStructuredFlow(text),
    };
  },

  // ── Logic Flow Extraction ──────────────────────────────────────────────────
  /**
   * Scans knowledge slots for control flow and operations in sequence
   */
  extractFlow(text) {
    const dataSlot = this._getSlotContent(text, 'data');
    const logicSlot = this._getSlotContent(text, 'logic');

    return {
      data:  this._parseSlotFlow(dataSlot.content, dataSlot.startLine),
      logic: this._parseSlotFlow(logicSlot.content, logicSlot.startLine)
    };
  },

  /**
   * Build semantic flow graph for visualisation.
   * Graph focuses on control + data influence and supports dispatcher-style IF fan-out.
   * @param {string} text
   * @returns {{nodes: object[], edges: object[], meta: object}}
   */
  extractStructuredFlow(text) {
    const slots = ['data', 'logic', 'action'];
    const slotLines = [];
    slots.forEach((slot) => {
      const slotInfo = this._getSlotContent(text, slot);
      if (!slotInfo.content) return;
      const lines = slotInfo.content.split(/\r?\n/);
      lines.forEach((line, idx) => {
        slotLines.push({
          slot,
          line: slotInfo.startLine + idx,
          text: line
        });
      });
    });

    const nodes = [];
    const edges = [];
    let nodeCounter = 0;
    const addNode = (kind, label, fullText, line) => {
      const id = `sf_${++nodeCounter}`;
      nodes.push({ id, kind, label, fullText, line });
      return id;
    };
    const addEdge = (from, to, kind = 'flow', label = '') => {
      if (!from || !to || from === to) return;
      edges.push({ from, to, kind, label });
    };

    const isExecutable = (txt) => {
      const t = (txt || '').trim();
      if (!t) return false;
      if (/^\/\//.test(t)) return false;
      if (/^\/\*/.test(t) || /^\*/.test(t) || /\*\/$/.test(t)) return false;
      return /:=|\bIF\b|\bELSEIF\b|\bELSE\b|\bENDIF\b|\bCALL\b|\bREAD\b|\bWRITE\b|\bCONCLUDE\b|\bRETURN\b/i.test(t);
    };

    const steps = slotLines.filter((item) => isExecutable(item.text)).map((item) => ({
      slot: item.slot,
      line: item.line,
      text: item.text.trim()
    }));

    const startId = addNode('start', 'Invocation', 'Invocation', 0);
    const endId = addNode('end', 'End', 'End', 0);
    const setupId = addNode('setup', 'Setup / Declarations', 'Setup / Declarations', 0);
    addEdge(startId, setupId, 'flow');
    let previousId = setupId;

    const defMap = new Map();
    const controlStack = [];
    const dispatcherRootId = addNode('dispatcher', 'ButtonName Dispatcher', 'ButtonName Dispatcher', 0);
    let dispatcherUsed = false;
    let dispatcherLastBranchId = null;
    const topLevelBranchExits = [];

    for (let i = 0; i < steps.length; i += 1) {
      const step = steps[i];
      const textLine = step.text;
      const lower = textLine.toLowerCase();

      if (/^\s*if\b/i.test(textLine)) {
        const conditionId = addNode('condition', this._shortLabel(textLine, 96), textLine, step.line);
        const isDispatcher = this._isButtonDispatcherCondition(textLine);

        if (isDispatcher) {
          if (!dispatcherUsed) {
            addEdge(previousId, dispatcherRootId, 'flow');
            dispatcherUsed = true;
          }
          addEdge(dispatcherRootId, conditionId, 'branch', 'button');
          if (dispatcherLastBranchId) {
            addEdge(dispatcherLastBranchId, conditionId, 'scope', 'independent');
          }
          dispatcherLastBranchId = conditionId;
        } else if (controlStack.length === 0) {
          addEdge(previousId, conditionId, 'flow');
        } else {
          addEdge(controlStack[controlStack.length - 1].activeId, conditionId, 'branch', 'nested');
        }
        controlStack.push({ ifId: conditionId, activeId: conditionId, topLevel: controlStack.length === 0 });
        previousId = conditionId;
        continue;
      }

      if (/^\s*elseif\b/i.test(textLine)) {
        const top = controlStack[controlStack.length - 1];
        const conditionId = addNode('condition', this._shortLabel(textLine, 96), textLine, step.line);
        if (top) {
          addEdge(top.ifId, conditionId, 'branch', 'elseif');
          top.activeId = conditionId;
        } else {
          addEdge(previousId, conditionId, 'flow');
        }
        previousId = conditionId;
        continue;
      }

      if (/^\s*else\b/i.test(textLine)) {
        const top = controlStack[controlStack.length - 1];
        const elseId = addNode('condition', 'ELSE', textLine, step.line);
        if (top) {
          addEdge(top.ifId, elseId, 'branch', 'else');
          top.activeId = elseId;
        } else {
          addEdge(previousId, elseId, 'flow');
        }
        previousId = elseId;
        continue;
      }

      if (/\bendif\b/i.test(lower)) {
        const closing = controlStack.pop();
        const mergeId = addNode('merge', 'Branches Complete', 'Branches Complete', step.line);
        addEdge(previousId, mergeId, 'flow');
        if (closing && closing.topLevel) {
          topLevelBranchExits.push(mergeId);
        }
        previousId = mergeId;
        continue;
      }

      const kind = this._mapStepKind(textLine);
      const nodeId = addNode(kind, this._shortLabel(textLine, 96), textLine, step.line);

      const defs = this._extractDefs(textLine).map((s) => s.toLowerCase());
      const uses = this._extractUses(textLine).map((s) => s.toLowerCase());
      let linked = false;
      uses.forEach((sym) => {
        const source = defMap.get(sym);
        if (source && source !== nodeId) {
          addEdge(source, nodeId, 'depends_on');
          linked = true;
        }
      });
      if (!linked) addEdge(previousId, nodeId, 'flow');

      if (controlStack.length) {
        addEdge(controlStack[controlStack.length - 1].activeId, nodeId, 'guarded_by');
      }
      defs.forEach((sym) => defMap.set(sym, nodeId));
      previousId = nodeId;
    }

    const concludeNode = nodes.find((n) => n.kind === 'gate' && /\bconclude\b/i.test(n.fullText || ''));
    const returnNode = nodes.find((n) => n.kind === 'return' && /\breturn\b/i.test(n.fullText || ''));
    if (topLevelBranchExits.length > 0) {
      const sink = returnNode ? returnNode.id : (concludeNode ? concludeNode.id : previousId);
      topLevelBranchExits.forEach((id) => addEdge(id, sink, 'flow'));
    }
    addEdge(previousId, endId, 'flow');
    if (returnNode) addEdge(returnNode.id, endId, 'flow');

    return {
      nodes,
      edges,
      meta: {
        dispatcherDetected: dispatcherUsed,
        topLevelBranchCount: topLevelBranchExits.length
      }
    };
  },

  _isButtonDispatcherCondition(line) {
    const text = String(line || '');
    return /\bEventType\b/i.test(text) && /\bButtonName\b/i.test(text) && /\bMLMButtonClick\b/i.test(text);
  },

  _mapStepKind(line) {
    const text = String(line || '');
    if (/\bREAD\b/i.test(text)) return 'read';
    if (/\bCALL\b/i.test(text) || /\bMLM\s+'/i.test(text)) return 'call';
    if (/\bCONCLUDE\b/i.test(text)) return 'gate';
    if (/\bRETURN\b/i.test(text)) return 'return';
    if (/^\s*[a-zA-Z_]\w*\s*:=/.test(text)) return 'assign';
    return 'stmt';
  },

  _shortLabel(line, maxLen) {
    const clean = String(line || '').replace(/\s+/g, ' ').trim();
    if (clean.length <= maxLen) return clean;
    return `${clean.slice(0, maxLen - 3)}...`;
  },

  _extractDefs(line) {
    const txt = String(line || '');
    const tuple = txt.match(/^\s*\(([^)]+)\)\s*:=/);
    if (tuple) {
      return tuple[1].split(',').map((s) => s.trim()).filter(Boolean);
    }
    const m = txt.match(/^\s*([a-zA-Z_]\w*)\s*:=/);
    return m ? [m[1]] : [];
  },

  _extractUses(line) {
    const keywords = new Set([
      'if', 'then', 'elseif', 'else', 'endif', 'and', 'or', 'not', 'true', 'false', 'null',
      'read', 'last', 'first', 'of', 'where', 'call', 'with', 'return', 'conclude', 'event',
      'destination', 'sql', 'mlm', 'argument'
    ]);
    const txt = String(line || '')
      .replace(/"[^"]*"/g, ' ')
      .replace(/'[^']*'/g, ' ');
    const tokens = txt.match(/\b[a-zA-Z_]\w*\b/g) || [];
    return tokens.filter((t) => !keywords.has(t.toLowerCase()));
  },

  _getSlotContent(text, slotName) {
    const lines = text.split(/\r?\n/);
    let startLine = -1;
    let contentLines = [];
    let inSlot = false;

    const slotRe = new RegExp(`^\\s*${slotName}\\s*:`, 'i');
    const reservedSlots = /^\s*(data|logic|action|evoke|priority|urgency|mlmname|title|version|institution|author|specialist|date|validation|keywords|explanation|links|citations|type|arden|purpose)\s*:/i;
    
    for (let i = 0; i < lines.length; i++) {
      if (slotRe.test(lines[i])) {
        inSlot = true;
        startLine = i + 1;
        continue;
      }
      if (inSlot) {
        // Only break on actual reserved slot headers or section terminators
        if (reservedSlots.test(lines[i]) || /^\s*;;/.test(lines[i]) || /^\s*end\s*:/i.test(lines[i])) {
          break; // Next slot or end of section
        }
        contentLines.push(lines[i]);
      }
    }
    return { content: contentLines.join('\n'), startLine };
  },

  _parseSlotFlow(text, offset) {
    if (!text) return [];
    const steps = [];
    const lines = text.split(/\r?\n/);
    
    let currentIf = null;

    lines.forEach((line, idx) => {
      const lineNum = idx + offset;
      const stripped = line.trim();
      const noComments = stripped.replace(/\/\/.*$/, '').trim();
      if (!noComments) return;

      const noStrings = noComments.replace(/"[^"]*"/g, '""');
      
      // Extract variables used (simple regex for now)
      const varsUsed = (noComments.match(/\b[a-zA-Z_]\w*\b/g) || [])
        .filter(v => !/^(IF|THEN|ELSE|ELSEIF|ENDIF|TRY|CATCH|ENDTRY|READ|LAST|CALL|WITH|CONCLUDE|TRUE|FALSE|NULL|AND|OR|NOT|OBJECT|EVENT)$/i.test(v));

      // 1. Control Flow (Multi-line aware)
      if (/\bIF\b/i.test(noStrings)) {
        currentIf = { type: 'if', label: noComments, code: noComments, line: lineNum, vars: varsUsed };
        if (/\bTHEN\b/i.test(noStrings)) {
          steps.push(currentIf);
          currentIf = null;
        }
        return;
      }
      
      if (currentIf && !/\bTHEN\b/i.test(noStrings)) {
        currentIf.label += ' ' + noComments;
        currentIf.code += '\n' + noComments;
        currentIf.vars = [...new Set([...currentIf.vars, ...varsUsed])];
        return;
      }
      
      if (currentIf && /\bTHEN\b/i.test(noStrings)) {
        currentIf.label += ' ' + noComments;
        currentIf.code += '\n' + noComments;
        currentIf.vars = [...new Set([...currentIf.vars, ...varsUsed])];
        steps.push(currentIf);
        currentIf = null;
        return;
      }

      if (/\bELSEIF\b/i.test(noStrings)) {
        steps.push({ type: 'elseif', label: noComments, code: noComments, line: lineNum, vars: varsUsed });
      } else if (/\bELSE\b/i.test(noStrings)) {
        steps.push({ type: 'else', code: noComments, line: lineNum });
      } else if (/\bENDIF\b/i.test(noStrings)) {
        steps.push({ type: 'endif', code: noComments, line: lineNum });
      } else if (/\bTRY\b/i.test(noStrings)) {
        steps.push({ type: 'try', code: noComments, line: lineNum });
      } else if (/\bCATCH\b/i.test(noStrings)) {
        steps.push({ type: 'catch', code: noComments, line: lineNum });
      } else if (/\bENDTRY\b/i.test(noStrings)) {
        steps.push({ type: 'endtry', code: noComments, line: lineNum });
      }

      // 2. Operations & Assignments
      else if (/:=/.test(noComments)) {
        const parts = noComments.split(':=');
        const lhs = (parts[0].match(/\b[a-zA-Z_]\w*\b/g) || []);
        
        let type = 'assign';
        if (/\bREAD\b/i.test(noComments)) type = 'read';
        if (/\bMLM\s+'/i.test(noComments)) type = 'call';
        if (/\bEVENT\b/i.test(noComments)) type = 'event';
        
        steps.push({ type, label: noComments, code: noComments, line: lineNum, writes: lhs, reads: varsUsed.filter(v => !lhs.includes(v)) });
      }
      else if (/\bCALL\b/i.test(noStrings)) {
        steps.push({ type: 'call', label: noComments, code: noComments, line: lineNum, vars: varsUsed });
      } else if (/\bWRITE\b/i.test(noStrings)) {
        steps.push({ type: 'write', label: noComments, code: noComments, line: lineNum, vars: varsUsed });
      } else if (/\bCONCLUDE\b/i.test(noStrings)) {
        steps.push({ type: 'conclude', label: noComments, code: noComments, line: lineNum, vars: varsUsed });
      }
      else if (noComments.length > 3) {
        steps.push({ type: 'stmt', label: noComments, code: noComments, line: lineNum, vars: varsUsed });
      }
    });

    return steps;
  },

  // ── Metadata ──────────────────────────────────────────────────────────────
  extractMetadata(text) {
    const get = (field) => {
      const m = text.match(new RegExp(`^\\s*${field}\\s*:\\s*([^;\\n\\r]+)`, 'im'));
      return m ? m[1].trim().replace(/;;$/, '').trim() : null;
    };
    return {
      title:       get('title'),
      mlmname:     get('mlmname'),
      version:     get('version'),
      author:      get('author'),
      specialist:  get('specialist'),
      institution: get('institution'),
      date:        get('date'),
      validation:  get('validation'),
      purpose:     this._extractMultiline(text, 'purpose'),
      explanation: this._extractMultiline(text, 'explanation'),
      keywords:    get('keywords'),
      ardenVersion:get('arden'),
    };
  },

  _extractMultiline(text, field) {
    const m = text.match(new RegExp(`\\b${field}\\s*:\\s*([\\s\\S]*?)(?=;;)`, 'i'));
    return m ? m[1].trim() : null;
  },

  // ── Variables ─────────────────────────────────────────────────────────────
  extractVariables(text) {
    const vars = new Map();
    const lines = text.split(/\r?\n/);

    lines.forEach((line, idx) => {
      // Skip comments
      const stripped = line.replace(/\/\/.*$/, '').trim();

      // Assignment patterns: var := value  OR  (a, b, c) := ...
      const tupleMatch = stripped.match(/^\s*\(([^)]+)\)\s*:=/);
      if (tupleMatch) {
        tupleMatch[1].split(',').forEach(v => {
          const name = v.trim();
          if (name && !vars.has(name)) {
            vars.set(name, { name, line: idx + 1, type: this._inferType(stripped), declaredAs: 'tuple' });
          }
        });
        return;
      }

      const simpleMatch = stripped.match(/^([a-zA-Z_]\w*)\s*:=\s*(.+)/);
      if (simpleMatch) {
        const name = simpleMatch[1];
        const rhs  = simpleMatch[2].trim();
        if (!vars.has(name)) {
          vars.set(name, { name, line: idx + 1, type: this._inferVarType(rhs), rhs: rhs.substring(0, 80) });
        }
      }
    });

    return Array.from(vars.values());
  },

  _inferVarType(rhs) {
    if (/^MLM\s*'/i.test(rhs))         return 'mlm-reference';
    if (/^EVENT\s*\{/i.test(rhs))      return 'event';
    if (/^destination\s*\{/i.test(rhs))return 'alert-destination';
    if (/^OBJECT\s*\[/i.test(rhs))     return 'object-type';
    if (/^INTERFACE\s*\{/i.test(rhs))  return 'interface';
    if (/^"/.test(rhs))                return 'string';
    if (/^-?\d/.test(rhs))             return 'number';
    if (/^(true|false)$/i.test(rhs))   return 'boolean';
    if (/^(null)$/i.test(rhs))         return 'null';
    if (/^ARGUMENT/i.test(rhs))        return 'argument';
    if (/^READ/i.test(rhs))            return 'read-result';
    if (/^CALL\s/i.test(rhs))          return 'call-result';
    if (/^NEW\s/i.test(rhs))           return 'object-instance';
    return 'variable';
  },

  _inferType(line) {
    if (/ARGUMENT/i.test(line))  return 'argument';
    if (/CALL\s/i.test(line))    return 'call-result';
    if (/read\s/i.test(line))    return 'read-result';
    return 'variable';
  },

  // ── MLM References ────────────────────────────────────────────────────────
  extractMLMRefs(text) {
    const refs = [];
    const lines = text.split(/\r?\n/);
    const seen = new Set();
    lines.forEach((line, idx) => {
      const m = line.match(/MLM\s*'([^']+)'/gi);
      if (m) {
        m.forEach(match => {
          const nameMatch = match.match(/MLM\s*'([^']+)'/i);
          if (nameMatch) {
            const name = nameMatch[1].trim();
            const key = `${name}:${idx}`;
            if (!seen.has(key)) {
              seen.add(key);
              // find which var this was assigned to
              const varMatch = line.match(/([a-zA-Z_]\w*)\s*:=\s*MLM/i);
              refs.push({ mlmName: name, line: idx + 1, varName: varMatch ? varMatch[1] : null });
            }
          }
        });
      }
    });
    return refs;
  },

  // ── Events ────────────────────────────────────────────────────────────────
  extractEvents(text) {
    const events = [];
    const lines = text.split(/\r?\n/);
    lines.forEach((line, idx) => {
      const m = line.match(/([a-zA-Z_]\w*)\s*:=\s*EVENT\s*\{([^}]+)\}/i);
      if (m) {
        events.push({ varName: m[1], definition: m[2].trim(), line: idx + 1 });
      }
      // Also detect evoke slot references
      const evokeM = line.match(/^\s*evoke\s*:/i);
      if (evokeM) {
        events.push({ varName: '_evoke_', definition: 'evoke slot', line: idx + 1, isEvoke: true });
      }
    });
    return events;
  },

  // ── SQL Queries ───────────────────────────────────────────────────────────
  extractSQL(text) {
    const queries = [];
    // Match read { ... } blocks (multi-line aware)
    const regex = /READ\s+(?:LAST\s*)?\{([^}]+)\}/gi;
    let m;
    while ((m = regex.exec(text)) !== null) {
      const startLine = text.substring(0, m.index).split('\n').length;
      const rawSQL = m[1].trim();
      // Check if it's an SQL string (starts with quote)
      const isSQL = /^\s*"/.test(rawSQL) || rawSQL.includes('SELECT');
      // Clean up the SQL for display
      const cleanSQL = rawSQL
        .replace(/"([^"]*)"/g, '$1')  // strip quotes from SQL strings
        .replace(/\|\|\s*SQL\s*\(([^)]+)\)/gi, '[$1]') // mark SQL params
        .replace(/\s+/g, ' ')
        .trim();
      queries.push({
        raw: rawSQL.substring(0, 200),
        clean: cleanSQL.substring(0, 300),
        line: startLine,
        isSQL,
        hasSQLInjectionProtection: /SQL\s*\(/i.test(rawSQL)
      });
    }
    return queries;
  },

  // ── Observations ──────────────────────────────────────────────────────────
  extractObservations(text) {
    const obs = new Set();
    const lines = text.split(/\r?\n/);
    lines.forEach((line) => {
      // Match strings that look like observation names (typically title-case with spaces)
      const matches = line.match(/"([A-Z][A-Za-z0-9 _\-]+[A-Z0-9])"/g);
      if (matches) {
        matches.forEach(m => {
          const name = m.replace(/"/g, '');
          // Filter to likely observation names (more than 3 chars, not pure keywords)
          if (name.length > 4 && !/^(DocumentName|ButtonName|EventType|DocumentOpening|MLMButtonClick|Replace|Append|REPLACE|Testing|testing|Error|Warning|Low|High|Medium)$/.test(name)) {
            obs.add(name);
          }
        });
      }
    });
    return Array.from(obs).sort();
  },

  // ── Buttons ───────────────────────────────────────────────────────────────
  extractButtons(text) {
    const buttons = [];
    const regex = /ButtonName\s*=\s*"([^"]+)"/gi;
    let m;
    while ((m = regex.exec(text)) !== null) {
      const line = text.substring(0, m.index).split('\n').length;
      buttons.push({ name: m[1], line });
    }
    return buttons;
  },

  // ── Sections ──────────────────────────────────────────────────────────────
  extractSections(text) {
    const sections = [];
    const lines = text.split(/\r?\n/);
    const sectionRe = /^(maintenance|library|knowledge|end)\s*:/i;
    const slotRe    = /^\s*(data|logic|action|evoke|priority|urgency)\s*:/i;

    lines.forEach((line, idx) => {
      if (sectionRe.test(line)) {
        const m = line.match(sectionRe);
        sections.push({ name: m[1].toLowerCase(), line: idx + 1, kind: 'section' });
      } else if (slotRe.test(line)) {
        const m = line.match(slotRe);
        sections.push({ name: m[1].toLowerCase(), line: idx + 1, kind: 'slot' });
      }
    });
    return sections;
  },

  /**
   * Find all line numbers where a variable name appears (for Find All References)
   */
  findReferences(text, varName) {
    const refs = [];
    const lines = text.split(/\r?\n/);
    const re = new RegExp(`\\b${varName}\\b`, 'g');
    lines.forEach((line, idx) => {
      if (re.test(line)) refs.push({ line: idx + 1, text: line.trim() });
      re.lastIndex = 0;
    });
    return refs;
  },

  /**
   * Rename all occurrences of a symbol in text
   */
  renameSymbol(text, oldName, newName) {
    const re = new RegExp(`\\b${oldName}\\b`, 'g');
    return text.replace(re, newName);
  }
};
