// MLM Forge — Hover Documentation Provider
// Shows rich tooltips when hovering over keywords, variables, SQL blocks, CALL statements

window.registerArdenHover = function(monaco) {
  monaco.languages.registerHoverProvider('arden', {
    provideHover(model, position) {
      const word    = model.getWordAtPosition(position);
      const lineText = model.getLineContent(position.lineNumber);
      const col     = position.column;

      if (!word) return null;
      const token = word.word;

      // ── 1. Keyword documentation ───────────────────────────────────────────
      if (window.ARDEN_KEYWORDS) {
        const kwUpper = token.toUpperCase();
        // Try exact match first, then case-insensitive
        const kw = window.ARDEN_KEYWORDS[token] ||
                   window.ARDEN_KEYWORDS[kwUpper] ||
                   Object.values(window.ARDEN_KEYWORDS).find(k => k.label.toUpperCase() === kwUpper);

        if (kw) {
          const kindBadge = {
            'keyword': '🔵 Keyword', 'section': '🟣 Section', 'slot': '🟤 Slot',
            'operator': '⚡ Operator', 'constant': '🟡 Constant', 'function': '🟢 Function',
            'variable': '🔷 Variable', 'eventtype': '🔶 Event Type'
          }[kw.kind] || '📝';

          const contents = [
            { value: `**${kw.label}** — ${kindBadge}` },
            { value: kw.doc }
          ];
          if (kw.example) {
            contents.push({ value: `**Example:**\n\`\`\`\n${kw.example}\n\`\`\`` });
          }
          return {
            range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
            contents
          };
        }
      }

      // ── 2. MLM reference hover — MLM 'NAME' ────────────────────────────────
      const mlmMatch = lineText.match(/MLM\s*'([^']+)'/i);
      if (mlmMatch && col >= lineText.indexOf(mlmMatch[0]) && col <= lineText.indexOf(mlmMatch[0]) + mlmMatch[0].length) {
        return {
          range: new monaco.Range(position.lineNumber, lineText.indexOf(mlmMatch[0]) + 1, position.lineNumber, lineText.indexOf(mlmMatch[0]) + mlmMatch[0].length + 1),
          contents: [
            { value: `**External MLM Reference**` },
            { value: `📦 \`${mlmMatch[1]}\`\n\nThis MLM will be executed when called with \`CALL\`. The referenced MLM must exist in the same environment.\n\n*Tip: Use the Context Sidebar → MLM Calls tab to see all references.*` }
          ]
        };
      }

      // ── 3. CALL statement hover ────────────────────────────────────────────
      if (token.toUpperCase() === 'CALL') {
        return {
          range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
          contents: [
            { value: `**CALL** — Execute another MLM` },
            { value: `Syntax:\n\`\`\`\nresult := CALL mlm_var WITH param1, param2;\n\`\`\`\n\nThe called MLM must be declared in the \`data:\` slot:\n\`\`\`\nmlm_var := MLM 'TARGET_MLM_NAME';\n\`\`\`` }
          ]
        };
      }

      // ── 4. SQL block hover — hover inside { } ─────────────────────────────
      if (isInsideSQLBlock(model, position)) {
        // Extract the SQL block
        const fullText = model.getValue();
        const offset   = getOffset(fullText, position.lineNumber, col);
        const sqlBlock = extractSQLAt(fullText, offset);
        if (sqlBlock) {
          const prettified = prettifySQL(sqlBlock);
          return {
            contents: [
              { value: `**SQL Query Block** 🗄️` },
              { value: `\`\`\`sql\n${prettified}\n\`\`\`` },
              { value: `*Variables embedded with \`SQL(var)\` are safely quoted to prevent injection.*` }
            ]
          };
        }
      }

      // ── 5. this_documentCommunication property hover ───────────────────────
      const docCommProps = {
        DocumentName:     'The name of the currently open document (string)',
        ButtonName:       'The name of the button that was clicked. Only populated when EventType = "MLMButtonClick" (string)',
        EventType:        'The type of event that triggered this MLM.\n\nCommon values:\n- `"DocumentOpening"` — document is opening\n- `"MLMButtonClick"` — a button was clicked\n- `"DocumentClosing"` — document is closing',
        DisplayMessage:   'Set to `TRUE` to show a popup message to the user.\n\n⚠️ Remove before production deployment.',
        Message:          'The text content shown in the popup when `DisplayMessage := TRUE`.\n\n⚠️ Remove before production deployment.',
        ClientGUID:       'Unique identifier for the patient (client) — use with `SQL()` in READ statements',
        ClientVisitGUID:  'Unique identifier for the patient visit — use with `SQL()` in READ statements',
        ChartGUID:        'Unique identifier for the patient chart — use with `SQL()` in READ statements',
        UserGUID:         'Unique identifier for the logged-in user — use with `SQL()` in READ statements',
        PerformedDtm:     'The date/time the observation was performed or the event occurred',
        IsNewDocument:    'TRUE if this is a newly created document that has not been saved yet',
      };

      // Check if the line has this_documentCommunication.TOKEN
      const propMatch = lineText.match(/this_documentCommunication\s*\.\s*(\w+)/i);
      if (propMatch && propMatch[1].toUpperCase() === token.toUpperCase()) {
        const propName = propMatch[1];
        const doc = docCommProps[propName];
        if (doc) {
          return {
            contents: [
              { value: `**this_documentCommunication.${propName}**` },
              { value: doc }
            ]
          };
        }
      }

      // ── 6. Called_By_Editor hover ──────────────────────────────────────────
      if (/Called_By_Editor/i.test(token)) {
        return {
          contents: [
            { value: `**Called_By_Editor** 🧪` },
            { value: `A special boolean flag that is \`TRUE\` when the MLM is executed from the **MLM Editor** (not from SCM).\n\nUse this to simulate document context during editor testing:\n\`\`\`\nIF Called_By_Editor THEN\n  this_documentCommunication.DocumentName := "My Document";\nENDIF;\n\`\`\`\n\n*Always gate test code with this flag so it never runs in production.*` }
          ]
        };
      }

      // ── 7. Observation name hover (string patterns like "GHFT ... FT") ─────
      // Check if cursor is inside a string that looks like an observation name
      const obsMatch = lineText.match(/"([A-Z][A-Za-z0-9 _\-]+[A-Z0-9])"/);
      if (obsMatch) {
        const name = obsMatch[1];
        const startCol = lineText.indexOf(`"${name}"`) + 1;
        const endCol   = startCol + name.length + 2;
        if (col >= startCol && col <= endCol && name.length > 4) {
          return {
            contents: [
              { value: `**Observation Name** 📋` },
              { value: `\`"${name}"\`\n\nThis appears to be a clinical observation field name. Observation names are case-sensitive and must match the configured name in SCM exactly (including spacing).\n\n*Tip: Use the Context Sidebar → Observations tab to see all observations in this file.*` }
            ]
          };
        }
      }

      return null;
    }
  });

  // ── SQL block detection helpers ─────────────────────────────────────────────
  function isInsideSQLBlock(model, position) {
    const linesBefore = model.getValueInRange({
      startLineNumber: Math.max(1, position.lineNumber - 10),
      startColumn: 1,
      endLineNumber: position.lineNumber,
      endColumn: position.column
    });
    const linesAfter = model.getValueInRange({
      startLineNumber: position.lineNumber,
      startColumn: position.column,
      endLineNumber: Math.min(model.getLineCount(), position.lineNumber + 10),
      endColumn: 1000
    });
    const openCount  = (linesBefore.match(/\{/g) || []).length;
    const closeCount = (linesBefore.match(/\}/g) || []).length;
    return openCount > closeCount && /\}/.test(linesAfter);
  }

  function getOffset(text, lineNum, col) {
    const lines = text.split('\n');
    let offset = 0;
    for (let i = 0; i < lineNum - 1; i++) offset += lines[i].length + 1;
    return offset + col - 1;
  }

  function extractSQLAt(text, offset) {
    let openIdx = text.lastIndexOf('{', offset);
    if (openIdx === -1) return null;
    let closeIdx = text.indexOf('}', openIdx);
    if (closeIdx === -1) return null;
    return text.substring(openIdx + 1, closeIdx).trim();
  }

  function prettifySQL(raw) {
    return raw
      .replace(/"([^"]*)"/g, '$1')
      .replace(/\|\|\s*SQL\s*\(([^)]+)\)/gi, '[$1]')
      .replace(/\s+/g, ' ')
      .replace(/\b(SELECT|FROM|WHERE|JOIN|LEFT|INNER|OUTER|AND|OR|ON|GROUP BY|ORDER BY|HAVING|AS)\b/gi, '\n$1')
      .trim()
      .substring(0, 500);
  }
};
