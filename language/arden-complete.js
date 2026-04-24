// MLM Forge — IntelliSense Completion Provider
// Context-aware autocomplete for Arden Syntax

window.registerArdenCompletion = function(monaco, workspaceMLMs) {
  // workspaceMLMs: array of MLM filenames loaded from workspace folder

  monaco.languages.registerCompletionItemProvider('arden', {
    triggerCharacters: [' ', '\t', '.', "'", '"', '('],

    provideCompletionItems(model, position) {
      const textUntilPosition = model.getValueInRange({
        startLineNumber: 1, startColumn: 1,
        endLineNumber: position.lineNumber, endColumn: position.column
      });
      const lineText = model.getLineContent(position.lineNumber);
      const word     = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber:   position.lineNumber,
        startColumn:     word.startColumn,
        endColumn:       word.endColumn
      };

      const suggestions = [];
      const KW = monaco.languages.CompletionItemKind;

      // ── Detect current section ─────────────────────────────────────────────
      const currentSection = detectSection(textUntilPosition);

      // ── Snippets from data/snippets.js ────────────────────────────────────
      if (window.ARDEN_SNIPPETS) {
        window.ARDEN_SNIPPETS.forEach(s => {
          suggestions.push({
            label: s.label,
            kind: KW.Snippet,
            detail: s.detail,
            documentation: { value: s.docs },
            insertText: s.insertText,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            sortText: '9' + s.label // lower priority than context suggestions
          });
        });
      }

      // ── Keyword completions from keywords.js ──────────────────────────────
      if (window.ARDEN_KEYWORDS) {
        Object.values(window.ARDEN_KEYWORDS).forEach(kw => {
          const kindMap = {
            'keyword': KW.Keyword, 'section': KW.Module, 'slot': KW.Field,
            'operator': KW.Operator, 'constant': KW.Constant, 'function': KW.Function,
            'variable': KW.Variable, 'eventtype': KW.Event
          };
          suggestions.push({
            label: kw.label,
            kind: kindMap[kw.kind] || KW.Keyword,
            documentation: { value: kw.doc + (kw.example ? `\n\n**Example:**\n\`\`\`\n${kw.example}\n\`\`\`` : '') },
            insertText: kw.label,
            range,
            sortText: '5' + kw.label
          });
        });
      }

      // ── Context: MLM 'NAME' — suggest workspace MLM names ─────────────────
      if (/MLM\s*'[^']*$/i.test(textUntilPosition)) {
        const mlmRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: findMLMNameStart(lineText, position.column),
          endColumn: position.column
        };
        // Workspace MLMs
        (workspaceMLMs || []).forEach(name => {
          suggestions.push({
            label: name.replace(/\.mlm$/i, ''),
            kind: KW.Module,
            detail: 'MLM in workspace',
            insertText: name.replace(/\.mlm$/i, ''),
            range: mlmRange,
            sortText: '0' + name
          });
        });
        // Common MLMs from the codebase
        [
          'CALLED_RPM_DOM_MLM', 'Called_RPM_DOM_Get_Definition_MLM',
          'CALLED_RETURN_OBJECT', 'CALLED_RETURN_OBJECT_CCC',
          'UTIL_UPDATEENTERPRISEDEFINEDCOLUMN', 'CALLED_DOM_CCC',
          'CALLED_DOM_V61_CCC', 'CALLED_AUTOCHART_CCC',
        ].forEach(name => {
          suggestions.push({
            label: name,
            kind: KW.Module,
            detail: 'Common GHFT MLM',
            insertText: name,
            range: mlmRange,
            sortText: '1' + name
          });
        });
      }

      // ── Context: this_documentCommunication. — suggest properties ──────────
      if (/this_documentCommunication\s*\.\s*\w*$/i.test(textUntilPosition)) {
        const props = [
          { name: 'DocumentName', doc: 'The name of the open document (string)' },
          { name: 'ButtonName', doc: 'The name of the button that was clicked (string)' },
          { name: 'EventType', doc: 'The event type e.g. "DocumentOpening", "MLMButtonClick"' },
          { name: 'DisplayMessage', doc: 'Set to TRUE to show a popup message to the user (boolean)' },
          { name: 'Message', doc: 'The message text shown in the popup when DisplayMessage is TRUE (string)' },
          { name: 'ClientGUID', doc: 'The GUID of the client/patient (string)' },
          { name: 'ClientVisitGUID', doc: 'The GUID of the client visit (string)' },
          { name: 'ChartGUID', doc: 'The GUID of the chart (string)' },
          { name: 'UserGUID', doc: 'The GUID of the current user (string)' },
          { name: 'PerformedDtm', doc: 'The date/time the observation was performed' },
          { name: 'DocumentGUID', doc: 'The GUID of the current document' },
          { name: 'IsNewDocument', doc: 'TRUE if this is a new, unsaved document' },
        ];
        const propStart = findPropertyStart(lineText, position.column);
        const propRange = { ...range, startColumn: propStart };
        props.forEach(p => {
          suggestions.push({
            label: p.name,
            kind: KW.Property,
            detail: 'documentCommunication property',
            documentation: { value: p.doc },
            insertText: p.name,
            range: propRange,
            sortText: '0' + p.name
          });
        });
      }

      // ── Context: IF Called_By_Editor — suggest guard pattern ──────────────
      if (/^\s*(IF\s+)?Called\s*$/i.test(lineText.substring(0, position.column - 1))) {
        suggestions.unshift({
          label: 'Called_By_Editor guard',
          kind: KW.Snippet,
          detail: 'MLM Editor test guard block',
          insertText: 'IF Called_By_Editor THEN\n\t// Test context — remove before production\n\t$0\nENDIF;',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
          sortText: '00'
        });
      }

      // ── Context: Variable suggestions from current file ────────────────────
      const fullText = model.getValue();
      const declaredVars = extractDeclaredVars(fullText);
      const typedWord = word.word.toLowerCase();
      declaredVars.forEach(v => {
        if (v.toLowerCase().startsWith(typedWord) || typedWord.length === 0) {
          suggestions.push({
            label: v,
            kind: KW.Variable,
            detail: 'Declared in this file',
            insertText: v,
            range,
            sortText: '2' + v
          });
        }
      });

      // ── Section-specific: data slot suggestions ────────────────────────────
      if (currentSection === 'data') {
        ['MLM \'', 'EVENT {', 'READ LAST {', 'destination {', 'OBJECT [', 'ARGUMENT'].forEach(kw => {
          suggestions.push({
            label: kw,
            kind: KW.Keyword,
            detail: 'Common data slot construct',
            insertText: kw,
            range,
            sortText: '3' + kw
          });
        });
      }

      return { suggestions };
    }
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  function detectSection(textBefore) {
    const sections = ['data', 'logic', 'action', 'evoke', 'maintenance', 'library', 'knowledge'];
    let lastSection = 'root';
    for (const s of sections) {
      const idx = textBefore.search(new RegExp(`^\\s*${s}\\s*:`, 'im'));
      if (idx !== -1) lastSection = s;
    }
    return lastSection;
  }

  function findMLMNameStart(line, col) {
    const before = line.substring(0, col - 1);
    const match = before.match(/MLM\s*'([^']*)$/i);
    if (match) return col - match[1].length;
    return col;
  }

  function findPropertyStart(line, col) {
    const before = line.substring(0, col - 1);
    const dotIdx = before.lastIndexOf('.');
    return dotIdx !== -1 ? dotIdx + 2 : col;
  }

  function extractDeclaredVars(text) {
    const vars = new Set();
    const re = /^[^\/]*?([a-zA-Z_]\w*)\s*:=/gm;
    let m;
    while ((m = re.exec(text)) !== null) {
      // Strip tuple assignments
      const name = m[1].trim();
      if (name && !/^(IF|FOR|ENDIF|ENDDO|ELSE|ELSEIF|TRY|CATCH)$/i.test(name)) {
        vars.add(name);
      }
    }
    // Also capture tuple vars: (a, b, c) :=
    const tupleRe = /\(([^)]+)\)\s*:=/g;
    while ((m = tupleRe.exec(text)) !== null) {
      m[1].split(',').forEach(v => {
        const name = v.trim();
        if (name) vars.add(name);
      });
    }
    return Array.from(vars);
  }
};
