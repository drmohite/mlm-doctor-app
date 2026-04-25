// MLM Forge — Extreme Fidelity Arden Formatter (v4)
// Re-engineered for production-grade clinical module alignment.

window.ArdenFormatter = {
  indentSize: 4,

  format(code) {
    if (!code) return "";
    
    // 1. Surgical Tokenization
    let tokens = this._tokenize(code);
    
    let result = [];
    let currentIndent = 0;
    let inLogicSlot = false; 
    
    const sections = ['maintenance:', 'library:', 'knowledge:', 'resources:'];
    const logicSlots = ['data:', 'logic:', 'action:', 'evoke:'];
    const blockStarts = ['if ', 'elseif ', 'else', 'try', 'catch', 'for ', 'while'];
    const blockEnds = ['endif', 'endtry', 'endfor', 'endwhile'];

    tokens.forEach(token => {
      let trimmed = token.trim();
      if (!trimmed) return;

      let lower = trimmed.toLowerCase();

      // -- Section Headers (Reset to column 0) --
      if (sections.some(s => lower.startsWith(s))) {
        currentIndent = 0;
        result.push(""); // Semantic break
        result.push(trimmed.toLowerCase());
        currentIndent = 1;
        inLogicSlot = false;
        return;
      }

      // -- Metadata Slots (One line: slot: value ;;) --
      if (trimmed.includes(':') && trimmed.endsWith(';;') && !inLogicSlot) {
        let parts = trimmed.split(':');
        let slot = parts[0].trim().toLowerCase();
        let value = parts.slice(1).join(':').trim();
        result.push(" ".repeat(this.indentSize) + slot + ": " + value);
        return;
      }

      // -- Logic Slot Start --
      if (logicSlots.some(s => lower.startsWith(s))) {
        result.push(" ".repeat(this.indentSize) + trimmed.toLowerCase());
        inLogicSlot = true;
        currentIndent = 2;
        return;
      }

      // -- Structural Decrement (BEFORE printing) --
      if (blockEnds.some(e => lower.startsWith(e)) || lower.startsWith('catch') || lower.startsWith('else') || lower.startsWith('elseif')) {
        currentIndent = Math.max(2, currentIndent - 1);
      }
      if (trimmed === ';;') {
        currentIndent = 1;
        inLogicSlot = false;
      }

      // -- Print Line with Current Indent --
      let linePrefix = " ".repeat(Math.max(0, currentIndent) * this.indentSize);
      
      // Clean internal whitespace but preserve strings/SQL
      let cleaned = trimmed.replace(/\s+/g, (match, offset, string) => {
        let before = string.substring(0, offset);
        let qCount = (before.match(/"/g) || []).length;
        return (qCount % 2 === 0) ? ' ' : match;
      });

      result.push(linePrefix + cleaned);

      // -- Structural Increment (AFTER printing) --
      if (blockStarts.some(s => lower.startsWith(s)) && !trimmed.endsWith(';')) {
        currentIndent++;
      }
      // Special handle for multiline assignment [ or (
      if (trimmed.endsWith('[') || trimmed.endsWith('(')) {
        currentIndent++;
      }
      // Special handle for closing multiline ] or )
      if (trimmed.startsWith(']') || trimmed.startsWith(')')) {
        currentIndent = Math.max(2, currentIndent - 1);
      }
    });

    return result.join('\n').trim();
  },

  _tokenize(code) {
    let text = code.replace(/\t/g, ' ').replace(/\r\n/g, '\n');
    
    // 1. Isolate key boundaries
    const boundaries = [
      'maintenance:', 'library:', 'knowledge:', 'resources:',
      'title:', 'mlmname:', 'arden:', 'version:', 'institution:', 'author:', 'specialist:', 'date:', 'validation:',
      'purpose:', 'explanation:', 'keywords:', 'type:', 'data:', 'priority:', 'evoke:', 'logic:', 'action:', 'urgency:', 'end:',
      ';;', ';', 'IF ', 'THEN', 'ELSE', 'ELSEIF', 'ENDIF', 'TRY', 'CATCH', 'ENDTRY', '\\[', '\\]'
    ];

    let tokens = [];
    let current = "";
    let inString = false;
    let braceLevel = 0;

    for (let i = 0; i < text.length; i++) {
      let char = text[i];
      if (char === '"') inString = !inString;
      
      if (!inString) {
        if (char === '{') braceLevel++;
        if (char === '}') braceLevel--;

        // High-priority split at ;;
        if (char === ';' && text[i+1] === ';') {
          current += ';;';
          tokens.push(current.trim());
          current = "";
          i++;
          continue;
        }

        // Split at ; if NOT in SQL
        if (char === ';' && braceLevel === 0) {
          current += ';';
          tokens.push(current.trim());
          current = "";
          continue;
        }
        
        // Split at brackets for alignment
        if ((char === '[' || char === ']') && braceLevel === 0) {
          if (current.trim()) tokens.push(current.trim());
          tokens.push(char);
          current = "";
          continue;
        }

        // Split at newlines
        if (char === '\n') {
          if (current.trim()) tokens.push(current.trim());
          current = "";
          continue;
        }
      }
      current += char;
    }
    if (current.trim()) tokens.push(current.trim());

    // 2. Secondary split for flow keywords on same line
    let flowTokens = [];
    const keywords = ['IF ', 'THEN', 'ELSE', 'ELSEIF', 'ENDIF', 'TRY', 'CATCH', 'ENDTRY', 'CONCLUDE'];
    
    tokens.forEach(t => {
      // Don't split metadata slots
      if (t.includes(':') && t.endsWith(';;')) {
        flowTokens.push(t);
        return;
      }
      
      let s = t;
      keywords.forEach(k => {
        s = s.replace(new RegExp(`(^|\\s)(${k})`, 'gi'), '\n$2');
      });
      
      s.split('\n').forEach(line => {
        if (line.trim()) flowTokens.push(line.trim());
      });
    });

    return flowTokens;
  }
};
