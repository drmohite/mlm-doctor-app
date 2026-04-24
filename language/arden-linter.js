// MLM Forge -- Real-Time Linter / Diagnostics Engine
// Registers a Monaco diagnostic provider that marks errors/warnings inline

window.registerArdenLinter = function(monaco, editor) {

  function lint(model) {
    const text  = model.getValue();
    const lines = text.split(/\r?\n/);
    const markers = [];

    function addError(lineNum, col, endCol, msg, severity) {
      markers.push({
        severity: severity || monaco.MarkerSeverity.Error,
        message: msg,
        startLineNumber: lineNum,
        startColumn: col || 1,
        endLineNumber: lineNum,
        endColumn: endCol || 100,
        source: 'MLM Forge Linter',
      });
    }

    // -------------------------------------------------------------------------
    // State variables -- all mutated as we scan line by line
    // -------------------------------------------------------------------------

    // Section / slot tracker
    // maintenance: and library: are free-form prose; rules only fire in knowledge:
    let currentSection = 'root';
    let inFreeText     = true;   // safe default until knowledge: is reached

    // Block comment tracker  /* ... */
    // Needed so that commented-out code (EndIf; */, etc.) is never counted
    let inBlockComment = false;

    // Block balance counters (only meaningful inside knowledge:)
    const ifStack   = [];
    const forStack  = [];
    const tryStack  = [];

    // Section presence flags (for post-scan checks)
    let hasMaintenance = false, hasLibrary = false, hasKnowledge = false;
    let hasData = false, hasLogic = false, hasAction = false;

    // -------------------------------------------------------------------------
    // Single-value metadata fields that MUST have ;; on the same line.
    // Multi-line fields (purpose, explanation, keywords, citations, priority,
    // urgency) are intentionally excluded -- their ;; can be on the next line.
    // -------------------------------------------------------------------------
    const INLINE_TERMINATOR_FIELDS = new Set([
      'title', 'mlmname', 'version', 'institution', 'author',
      'specialist', 'date', 'validation', 'arden'
    ]);

    lines.forEach((line, i) => {
      const lineNum = i + 1;

      // -----------------------------------------------------------------
      // Step 1: Block comment tracking  /* ... */
      // Must be done BEFORE stripping line comments so that
      // lines like "/*If ...*/", "EndIf; */" are handled correctly.
      // -----------------------------------------------------------------
      let workLine = line;

      // Check if a block comment opens on this line
      if (!inBlockComment) {
        if (workLine.includes('/*')) {
          // Check if it also closes on this line
          const openIdx  = workLine.indexOf('/*');
          const closeIdx = workLine.indexOf('*/', openIdx + 2);
          if (closeIdx !== -1) {
            // Inline block comment -- strip the /* ... */ and continue
            workLine = workLine.substring(0, openIdx) + workLine.substring(closeIdx + 2);
          } else {
            // Block comment opens but doesn't close -- mark state and skip rest
            inBlockComment = true;
            workLine = workLine.substring(0, openIdx);
          }
        }
      } else {
        // We're inside a block comment -- look for closing */
        const closeIdx = workLine.indexOf('*/');
        if (closeIdx !== -1) {
          inBlockComment = false;
          workLine = workLine.substring(closeIdx + 2); // keep content after */
        } else {
          return; // Entire line is inside a block comment -- skip completely
        }
      }

      // -----------------------------------------------------------------
      // Step 2: Strip line comments (//) and trim
      // -----------------------------------------------------------------
      const stripped = workLine.replace(/\/\/.*$/, '').trim();

      // Skip blank lines and block-comment fence lines
      if (!stripped) return;

      // -----------------------------------------------------------------
      // Step 3: Strip string literal content so keywords INSIDE strings
      // (button names, URLs, purpose text) never trigger false positives
      // -----------------------------------------------------------------
      const noStrings = stripped.replace(/"[^"]*"/g, '""');

      // -----------------------------------------------------------------
      // Step 4: Update section/slot tracker
      // -----------------------------------------------------------------
      if (/^maintenance\s*:/i.test(stripped)) {
        hasMaintenance = true;
        currentSection = 'maintenance';
        inFreeText     = true;
      }
      if (/^library\s*:/i.test(stripped)) {
        hasLibrary     = true;
        currentSection = 'library';
        inFreeText     = true;
      }
      if (/^knowledge\s*:/i.test(stripped)) {
        hasKnowledge   = true;
        currentSection = 'knowledge';
        inFreeText     = false;
      }
      if (/^end\s*:/i.test(stripped)) {
        currentSection = 'end';
        inFreeText     = false;
      }

      if (currentSection === 'knowledge') {
        if (/^\s*data\s*:/i.test(stripped))   hasData   = true;
        if (/^\s*logic\s*:/i.test(stripped))  hasLogic  = true;
        if (/^\s*action\s*:/i.test(stripped)) hasAction = true;
      }

      // Are we in executable code right now?
      const inCode = (currentSection === 'knowledge') && !inFreeText;

      // -----------------------------------------------------------------
      // Rule 1: Missing ;; on SINGLE-VALUE metadata fields only.
      // Multi-line fields (purpose, explanation, etc.) are excluded
      // because their ;; legitimately appears on the next line.
      // -----------------------------------------------------------------
      const metaFieldMatch = stripped.match(
        /^\s*(title|mlmname|version|institution|author|specialist|date|validation|arden)\s*:/i
      );
      if (metaFieldMatch) {
        const field = metaFieldMatch[1].toLowerCase();
        const valueAfterColon = stripped.substring(stripped.indexOf(':') + 1).trim();
        if (valueAfterColon.length > 0 && !stripped.endsWith(';;') && !stripped.endsWith(';')) {
          addError(lineNum, 1, line.length + 1,
            `Metadata field '${field}' should end with ';;' on the same line`,
            monaco.MarkerSeverity.Warning);
        }
      }

      // =================================================================
      // ALL RULES BELOW only run inside knowledge: (executable code).
      // library: and maintenance: are free-form prose -- skip entirely.
      // =================================================================
      if (!inCode) return;

      // -----------------------------------------------------------------
      // Rule 2: IF/ENDIF balance tracking
      // NOTE: We do NOT flag "IF without THEN" separately because
      // multi-line IF conditions (THEN on the next line) are very common
      // in Arden Syntax and would cause massive false positives.
      // The balance check below catches real unclosed IFs.
      // -----------------------------------------------------------------
      const ifCount     = (noStrings.match(/\bIF\b/gi) || []).length;
      const elseifCount = (noStrings.match(/\bELSEIF\b/gi) || []).length;
      const endifCount  = (noStrings.match(/\bENDIF\b/gi) || []).length;

      for (let k = 0; k < (ifCount - elseifCount); k++) ifStack.push(lineNum);
      for (let k = 0; k < endifCount; k++) {
        if (ifStack.length > 0) ifStack.pop();
        else addError(lineNum, 1, line.length + 1, `ENDIF without matching IF`, monaco.MarkerSeverity.Error);
      }

      // -----------------------------------------------------------------
      // Rule 3: FOR/ENDDO balance tracking
      // -----------------------------------------------------------------
      const forCount   = (noStrings.match(/\bFOR\b/gi) || []).length;
      const enddoCount = (noStrings.match(/\bENDDO\b/gi) || []).length;
      for (let k = 0; k < forCount; k++) forStack.push(lineNum);
      for (let k = 0; k < enddoCount; k++) {
        if (forStack.length > 0) forStack.pop();
        else addError(lineNum, 1, line.length + 1, `ENDDO without matching FOR`, monaco.MarkerSeverity.Error);
      }

      // -----------------------------------------------------------------
      // Rule 4: TRY/ENDTRY balance tracking
      // -----------------------------------------------------------------
      const tryCount    = (noStrings.match(/\bTRY\b/gi) || []).length;
      const endtryCount = (noStrings.match(/\bENDTRY\b/gi) || []).length;
      for (let k = 0; k < tryCount; k++) tryStack.push(lineNum);
      for (let k = 0; k < endtryCount; k++) {
        if (tryStack.length > 0) tryStack.pop();
        else addError(lineNum, 1, line.length + 1, `ENDTRY without matching TRY`, monaco.MarkerSeverity.Error);
      }

      // -----------------------------------------------------------------
      // Rule 5: Debug display message left active
      // -----------------------------------------------------------------
      if (
        /DisplayMessage\s*:=\s*TRUE/i.test(noStrings) &&
        !/\/\//.test(line.substring(0, Math.max(0, line.indexOf('DisplayMessage'))))
      ) {
        addError(lineNum, 1, line.length + 1,
          `Debug display message is active. Remove before deploying to PROD.`,
          monaco.MarkerSeverity.Warning);
      }

      // -----------------------------------------------------------------
      // Rule 6: Deprecated ObservationEnter Name= pattern
      // -----------------------------------------------------------------
      if (/ObservationEnter\s+Any\s+Observation\s*:\s*Where\s+Name\s*=/i.test(noStrings)) {
        addError(lineNum, 1, line.length + 1,
          `Deprecated: use 'ItemName' instead of 'Name' in ObservationEnter filter`,
          monaco.MarkerSeverity.Warning);
      }

      // -----------------------------------------------------------------
      // Rule 7: SQL concatenation without SQL() sanitisation
      // Only checked on SINGLE-LINE read { ... } blocks.
      // Multi-line SQL blocks (where { and } are on different lines) are
      // skipped because we can't reliably scan them line-by-line.
      // -----------------------------------------------------------------
      const sqlLineMatch = /read\s+(?:last\s+)?\{([^}]+)\}/i.exec(stripped);
      if (sqlLineMatch) {
        const curlyContent = sqlLineMatch[1];
        if (curlyContent.includes('||') && !/SQL\s*\(/i.test(curlyContent)) {
          addError(lineNum, 1, line.length + 1,
            `SQL concatenation without SQL() sanitisation. Use SQL(variable) to prevent injection.`,
            monaco.MarkerSeverity.Warning);
        }
      }

      // -----------------------------------------------------------------
      // Rule 8: Editor test flag not guarded
      // -----------------------------------------------------------------
      if (/enable_editor_testing\s*:=\s*true/i.test(noStrings)) {
        addError(lineNum, 1, line.length + 1,
          `Editor testing flag is enabled. Wrap in IF Called_By_Editor THEN ... ENDIF.`,
          monaco.MarkerSeverity.Warning);
      }
    });

    // ---------------------------------------------------------------------
    // Post-scan: report unmatched blocks
    // ---------------------------------------------------------------------
    ifStack.forEach(startLine =>
      addError(startLine, 1, 100, `IF on line ${startLine} has no matching ENDIF`, monaco.MarkerSeverity.Error)
    );
    forStack.forEach(startLine =>
      addError(startLine, 1, 100, `FOR on line ${startLine} has no matching ENDDO`, monaco.MarkerSeverity.Error)
    );
    tryStack.forEach(startLine =>
      addError(startLine, 1, 100, `TRY on line ${startLine} has no matching ENDTRY`, monaco.MarkerSeverity.Error)
    );

    // Missing required sections (only when file has substantial content)
    if (text.length > 50) {
      if (!hasMaintenance) addError(1, 1, 20, `Missing 'maintenance:' section`, monaco.MarkerSeverity.Error);
      if (!hasKnowledge)   addError(1, 1, 20, `Missing 'knowledge:' section`, monaco.MarkerSeverity.Error);
      if (hasKnowledge && !hasLogic)  addError(1, 1, 20, `Missing 'logic:' slot`, monaco.MarkerSeverity.Error);
      if (hasKnowledge && !hasAction) addError(1, 1, 20, `Missing 'action:' slot`, monaco.MarkerSeverity.Warning);
    }

    monaco.editor.setModelMarkers(model, 'mlmforge-linter', markers);
    return markers;
  }

  // Run on every content change (debounced 400ms)
  let debounceTimer = null;
  const model = editor.getModel();

  const runLint = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const markers = lint(model);
      if (window.ProblemsPanel) window.ProblemsPanel.update(markers);
    }, 400);
  };

  editor.onDidChangeModelContent(runLint);
  runLint();

  return { lint, runLint };
};
