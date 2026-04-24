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
    };
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
