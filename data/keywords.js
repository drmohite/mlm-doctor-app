// MLM Forge — Arden Syntax Keyword Documentation
// Used by hover provider and completion provider

window.ARDEN_KEYWORDS = {
  // ── Sections ─────────────────────────────────────────────────────────────
  maintenance: {
    label: 'maintenance:',
    kind: 'section',
    doc: 'The **maintenance** section contains administrative metadata about the MLM: title, mlmname, version, author, date, institution, and validation status.\n\nAll fields must be terminated with `;;`.',
    example: `maintenance:\n  title: MY_MLM;;\n  mlmname: MY_MLM;;\n  arden: version 2.5;;\n  version: 1.00;;\n  institution: DrMohite.com;;\n  author: Your Name;;\n  date: 2024-01-01;;\n  validation: testing;;`
  },
  library: {
    label: 'library:',
    kind: 'section',
    doc: 'The **library** section describes the MLM in human-readable terms.\n\nContains: `purpose`, `explanation`, `keywords`, `citations`.',
    example: `library:\n  purpose: What this MLM does;;\n  explanation: Detailed explanation;;\n  keywords: keyword1, keyword2;;`
  },
  knowledge: {
    label: 'knowledge:',
    kind: 'section',
    doc: 'The **knowledge** section contains the executable logic of the MLM.\n\nMust include slots: `type`, `data`, `priority`, `evoke`, `logic`, `action`, `urgency`.',
    example: `knowledge:\n  type: data-driven;;\n  data:\n    // variables\n  ;;\n  priority: 50;;\n  evoke: ;;\n  logic:\n    conclude true;\n  ;;\n  action:\n    // actions\n  ;;\nUrgency: 50;;\nend:`
  },
  data: { label: 'data:', kind: 'section', doc: 'The **data** slot within `knowledge:` is where variables are declared, events are defined, and external MLMs are referenced.\n\nAll data declarations must be terminated with `;;`.', example: `data:\n  (this_documentCommunication) := ARGUMENT;\n  my_mlm := MLM 'CALLED_MLM_NAME';\n  event_name := EVENT {ClientDocumentEnter User ClientDocument: WHERE DocumentName = \"My Doc\"};\n;;` },
  logic: { label: 'logic:', kind: 'section', doc: 'The **logic** slot contains the conditional logic that determines whether the `action:` slot executes.\n\nMust end with `CONCLUDE TRUE;` or `CONCLUDE FALSE;`.', example: `logic:\n  conclude true;\n;;` },
  action: { label: 'action:', kind: 'section', doc: 'The **action** slot executes only if `logic:` concludes TRUE.\n\nTypically contains: WRITE statements, CALL statements, RETURN statements.', example: `action:\n  return this_documentCommunication;\n;;` },
  evoke: { label: 'evoke:', kind: 'section', doc: 'The **evoke** slot specifies what triggers the MLM to execute.\n\nLeave empty for document-driven MLMs. Use event variables for trigger-based MLMs.', example: `evoke:\n  1 seconds after time of event_name;\n;;` },

  // ── Control Flow ─────────────────────────────────────────────────────────
  IF: { label: 'IF', kind: 'keyword', doc: 'Conditional statement. Must be paired with `THEN` and terminated with `ENDIF;`.\n\nNested IF blocks are supported.', example: `IF condition THEN\n  // do something\nENDIF;` },
  THEN: { label: 'THEN', kind: 'keyword', doc: 'Follows the condition in an `IF` statement.' },
  ELSE: { label: 'ELSE', kind: 'keyword', doc: 'The alternative branch in an `IF` statement.' },
  ELSEIF: { label: 'ELSEIF', kind: 'keyword', doc: 'Chains an additional condition in an `IF` block.', example: `IF condition1 THEN\n  // ...\nELSEIF condition2 THEN\n  // ...\nENDIF;` },
  ENDIF: { label: 'ENDIF', kind: 'keyword', doc: 'Closes an `IF` block. Must be followed by `;`.' },
  FOR: { label: 'FOR', kind: 'keyword', doc: 'Loop statement. Iterates over a list or a numeric range.\n\nTerminated with `ENDDO;`.', example: `FOR item IN my_list DO\n  // process item\nENDDO;` },
  DO: { label: 'DO', kind: 'keyword', doc: 'Opens the body of a `FOR` loop.' },
  ENDDO: { label: 'ENDDO', kind: 'keyword', doc: 'Closes a `FOR` loop. Must be followed by `;`.' },
  SEQTO: { label: 'SEQTO', kind: 'keyword', doc: 'Used in `FOR` loops to iterate over a numeric range.', example: `FOR i IN 1 SEQTO 10 DO\n  // i goes from 1 to 10\nENDDO;` },
  WHERE: { label: 'WHERE', kind: 'keyword', doc: 'Filters a collection or adds conditions to a READ query.' },
  TRY: { label: 'TRY', kind: 'keyword', doc: 'Begins an error-handling block. Must be paired with `CATCH` and `ENDTRY`.', example: `TRY\n  // risky code\nCATCH Exception ex\n  // handle error\nENDCATCH;\nENDTRY;` },
  CATCH: { label: 'CATCH', kind: 'keyword', doc: 'Catches an exception in a `TRY` block.' },
  ENDTRY: { label: 'ENDTRY', kind: 'keyword', doc: 'Closes a `TRY/CATCH` block.' },
  ENDCATCH: { label: 'ENDCATCH', kind: 'keyword', doc: 'Closes a `CATCH` block.' },

  // ── Data Operations ───────────────────────────────────────────────────────
  CONCLUDE: { label: 'CONCLUDE', kind: 'keyword', doc: 'Sets the result of the `logic:` slot.\n\n- `CONCLUDE TRUE;` → the `action:` slot executes\n- `CONCLUDE FALSE;` → the `action:` slot is skipped', example: `logic:\n  conclude true;\n;;` },
  RETURN: { label: 'RETURN', kind: 'keyword', doc: 'Returns a value from a CALLED MLM. Used in `action:` or `logic:` slots.', example: `RETURN this_documentCommunication;` },
  ARGUMENT: { label: 'ARGUMENT', kind: 'keyword', doc: 'Receives parameters passed to this MLM when it is CALLed by another MLM.', example: `(this_documentCommunication) := ARGUMENT;` },
  CALL: { label: 'CALL', kind: 'keyword', doc: 'Executes another MLM and optionally captures its return value.\n\nSyntax: `result := CALL mlm_var WITH param1, param2;`', example: `result := CALL my_mlm WITH this_documentCommunication, param1;` },
  READ: { label: 'READ', kind: 'keyword', doc: 'Retrieves data from the clinical database.\n\nCan use SQL strings or Arden object queries inside `{ }`.', example: `my_value := READ LAST {"SELECT col FROM table WHERE guid = " || SQL(guid)};` },
  WRITE: { label: 'WRITE', kind: 'keyword', doc: 'Sends output to a destination (typically an alert).', example: `WRITE message AT alert_destination;` },
  EVENT: { label: 'EVENT', kind: 'keyword', doc: 'Declares an event trigger. Used in the `data:` slot.', example: `my_event := EVENT {ClientDocumentEnter User ClientDocument: WHERE DocumentName = "My Document"};` },
  MLM: { label: 'MLM', kind: 'keyword', doc: 'References another MLM for use with `CALL`. The MLM name must be in single quotes.', example: `my_mlm := MLM 'CALLED_RPM_DOM_MLM';` },
  NEW: { label: 'NEW', kind: 'keyword', doc: 'Creates a new instance of an object type.', example: `ParmObj := NEW Parm WITH obs_name, "value", "url";` },
  OBJECT: { label: 'OBJECT', kind: 'keyword', doc: 'Defines a new object type with named properties.', example: `Parm := OBJECT [p_ObsName, p_ListValue, p_URL];` },

  // ── Operators ─────────────────────────────────────────────────────────────
  EXISTS: { label: 'EXISTS', kind: 'operator', doc: 'Returns TRUE if a variable has a non-null value.', example: `IF EXISTS my_variable THEN ...` },
  NOT: { label: 'NOT', kind: 'operator', doc: 'Logical negation.' },
  AND: { label: 'AND', kind: 'operator', doc: 'Logical AND operator.' },
  OR: { label: 'OR', kind: 'operator', doc: 'Logical OR operator.' },
  IN: { label: 'IN', kind: 'operator', doc: 'Tests membership in a list, or iterates in a `FOR` loop.', example: `IF DocumentName IN ("Doc1", "Doc2") THEN ...` },
  NULL: { label: 'NULL', kind: 'constant', doc: 'Represents the absence of a value. Variables are NULL if not yet assigned.' },
  TRUE: { label: 'TRUE', kind: 'constant', doc: 'Boolean true constant.' },
  FALSE: { label: 'FALSE', kind: 'constant', doc: 'Boolean false constant.' },
  NOW: { label: 'NOW', kind: 'function', doc: 'Returns the current date and time.' },
  FIRST: { label: 'FIRST OF', kind: 'function', doc: 'Returns the first element of a list.', example: `first_item := FIRST OF (my_list);` },
  LAST: { label: 'LAST OF', kind: 'function', doc: 'Returns the last element of a list.', example: `last_item := LAST OF (my_list);` },
  COUNT: { label: 'COUNT', kind: 'function', doc: 'Returns the number of elements in a list.', example: `n := COUNT my_list;` },
  SUBSTRING: { label: 'SUBSTRING', kind: 'function', doc: 'Extracts characters from a string.', example: `letter := SUBSTRING 1 characters starting at 1 from my_string;` },
  LENGTH: { label: 'LENGTH', kind: 'function', doc: 'Returns the length of a string or list.', example: `n := LENGTH OF (my_string);` },
  SQL: { label: 'SQL()', kind: 'function', doc: 'Safely embeds a variable value into an inline SQL string. Handles quoting automatically.', example: `"WHERE guid = " || SQL(client_guid)` },
  MATCHES: { label: 'MATCHES PATTERN', kind: 'operator', doc: 'Tests a string against a regex-like pattern.', example: `IF my_var MATCHES PATTERN ".*click.*" THEN ...` },
  CONTAINS: { label: 'CONTAINS', kind: 'operator', doc: 'Tests if a string contains a substring.', example: `IF error_msg CONTAINS "timeout" THEN ...` },

  // ── Common Variables ──────────────────────────────────────────────────────
  this_documentCommunication: { label: 'this_documentCommunication', kind: 'variable', doc: 'The primary document communication object passed to document-triggered MLMs.\n\n**Key properties:**\n- `.DocumentName` — name of the open document\n- `.ButtonName` — name of the clicked button\n- `.EventType` — event type (e.g. "DocumentOpening", "MLMButtonClick")\n- `.DisplayMessage` — set to TRUE to show a popup\n- `.Message` — the popup message text', example: `(this_documentCommunication) := ARGUMENT;\ndocument_name := this_documentCommunication.DocumentName;` },
  Called_By_Editor: { label: 'Called_By_Editor', kind: 'variable', doc: 'Boolean flag that is TRUE when the MLM is being executed from the MLM Editor (not from SCM).\n\nUse this to set up test data in the editor without affecting production behaviour.', example: `IF Called_By_Editor THEN\n  // Simulate test context\n  this_documentCommunication.DocumentName := "My Document";\nENDIF;` },

  // ── Event Types ───────────────────────────────────────────────────────────
  DocumentOpening: { label: 'DocumentOpening', kind: 'eventtype', doc: 'Event type fired when a document is opened by a user.' },
  MLMButtonClick: { label: 'MLMButtonClick', kind: 'eventtype', doc: 'Event type fired when a user clicks an MLM button configured in a document.' },
  DocumentClosing: { label: 'DocumentClosing', kind: 'eventtype', doc: 'Event type fired when a document is closed.' },
  ClientDocumentEnter: { label: 'ClientDocumentEnter', kind: 'eventtype', doc: 'Event declaration type for document entry events.' },
  ClientDocumentModify: { label: 'ClientDocumentModify', kind: 'eventtype', doc: 'Event declaration type for document modification events.' },
  ObservationEnter: { label: 'ObservationEnter', kind: 'eventtype', doc: 'Event declaration type for observation entry events.' },
  OrderEnter: { label: 'OrderEnter', kind: 'eventtype', doc: 'Event declaration type for order entry events.' },
  ClientVisitEnter: { label: 'ClientVisitEnter', kind: 'eventtype', doc: 'Event declaration type for visit entry events.' },
  ClientVisitModify: { label: 'ClientVisitModify', kind: 'eventtype', doc: 'Event declaration type for visit modification events.' },
};
