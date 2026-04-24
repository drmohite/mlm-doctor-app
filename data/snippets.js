// MLM Forge — Smart Snippet Templates
// Inserted via IntelliSense completion

window.ARDEN_SNIPPETS = [
  // ── Document Trigger ──────────────────────────────────────────────────────
  {
    label: 'doc-trigger',
    detail: 'Document trigger event declaration',
    category: 'Events',
    insertText: '${1:event_name} := EVENT {ClientDocumentEnter User ClientDocument: WHERE DocumentName = "${2:My Document}"};',
    docs: 'Declares a document entry event trigger.'
  },
  {
    label: 'button-trigger',
    detail: 'Button click event declaration',
    category: 'Events',
    insertText: '${1:button_event} := EVENT {ClientDocumentEnter User ClientDocument: WHERE EventType = "MLMButtonClick" AND ButtonName = "${2:My Button}"};',
    docs: 'Declares a button click event trigger.'
  },
  {
    label: 'obs-trigger',
    detail: 'Observation entry event declaration',
    category: 'Events',
    insertText: '${1:obs_event} := EVENT {ObservationEnter Any Observation: Where ItemName = "${2:Observation Name}"};',
    docs: 'Declares an observation entry event trigger.'
  },
  {
    label: 'order-trigger',
    detail: 'Order entry event declaration',
    category: 'Events',
    insertText: '${1:order_event} := EVENT {OrderEnter Any Order};',
    docs: 'Declares an order entry event trigger.'
  },
  {
    label: 'visit-trigger',
    detail: 'Visit modify event declaration',
    category: 'Events',
    insertText: '${1:visit_event} := EVENT {ClientVisitModify ClientVisit};',
    docs: 'Declares a client visit modify event trigger.'
  },

  // ── MLM References ────────────────────────────────────────────────────────
  {
    label: 'mlm-ref',
    detail: 'Reference an external MLM',
    category: 'MLM Calls',
    insertText: '${1:mlm_var} := MLM \'${2:CALLED_MLM_NAME}\';',
    docs: 'Declares a reference to another MLM for use with CALL.'
  },
  {
    label: 'mlm-call',
    detail: 'Call an external MLM with parameters',
    category: 'MLM Calls',
    insertText: '${1:result} := CALL ${2:mlm_var} WITH ${3:this_documentCommunication};',
    docs: 'Calls a referenced MLM and captures its return value.'
  },
  {
    label: 'mlm-call-void',
    detail: 'Call an external MLM (no return)',
    category: 'MLM Calls',
    insertText: 'void := CALL ${1:mlm_var} WITH ${2:param1}, ${3:param2};',
    docs: 'Calls a referenced MLM without capturing a return value.'
  },

  // ── SQL / READ Patterns ───────────────────────────────────────────────────
  {
    label: 'read-sql-last',
    detail: 'READ LAST with inline SQL',
    category: 'SQL Reads',
    insertText: '${1:result} := READ LAST {"SELECT ${2:col} FROM ${3:table} (nolock) WHERE GUID = " || SQL(${4:guid})};',
    docs: 'Reads a single value from the database using inline SQL.'
  },
  {
    label: 'read-sql-multi',
    detail: 'READ LAST with multiple columns',
    category: 'SQL Reads',
    insertText: '${1:col1}, ${2:col2} := READ LAST {"SELECT ${1:col1}, ${2:col2} FROM ${3:table} (nolock) WHERE ClientGUID = " || SQL(${4:client_guid})};',
    docs: 'Reads multiple columns in a single READ LAST statement.'
  },
  {
    label: 'read-obj',
    detail: 'READ LAST from object query',
    category: 'SQL Reads',
    insertText: '${1:result} := READ LAST {${2:ClientVisit}: ${3:GUID, ClientGUID}};',
    docs: 'Reads the last record using an Arden object query.'
  },

  // ── Control Flow ──────────────────────────────────────────────────────────
  {
    label: 'if',
    detail: 'IF ... THEN ... ENDIF block',
    category: 'Control Flow',
    insertText: 'IF ${1:condition} THEN\n\t${2:// action}\nENDIF;',
    docs: 'Basic conditional block.'
  },
  {
    label: 'ifelse',
    detail: 'IF ... THEN ... ELSE ... ENDIF block',
    category: 'Control Flow',
    insertText: 'IF ${1:condition} THEN\n\t${2:// true branch}\nELSE\n\t${3:// false branch}\nENDIF;',
    docs: 'Conditional block with else branch.'
  },
  {
    label: 'ifelseif',
    detail: 'IF ... ELSEIF ... ENDIF block',
    category: 'Control Flow',
    insertText: 'IF ${1:condition1} THEN\n\t${2:// branch 1}\nELSEIF ${3:condition2} THEN\n\t${4:// branch 2}\nELSE\n\t${5:// default branch}\nENDIF;',
    docs: 'Multi-branch conditional.'
  },
  {
    label: 'for',
    detail: 'FOR ... IN ... DO ... ENDDO loop',
    category: 'Control Flow',
    insertText: 'FOR ${1:item} IN ${2:my_list} DO\n\t${3:// process item}\nENDDO;',
    docs: 'Iterates over each element in a list.'
  },
  {
    label: 'forseq',
    detail: 'FOR ... SEQTO numeric range loop',
    category: 'Control Flow',
    insertText: 'FOR ${1:i} IN ${2:1} SEQTO ${3:10} DO\n\t${4:// i = 1..10}\nENDDO;',
    docs: 'Numeric range loop.'
  },
  {
    label: 'forwhere',
    detail: 'FOR ... IN ... WHERE ... DO loop',
    category: 'Control Flow',
    insertText: 'FOR ${1:item} IN ${2:my_list} WHERE ${3:item.Name = "value"} DO\n\t${4:// filtered loop}\nENDDO;',
    docs: 'Filtered loop — only processes items matching the WHERE condition.'
  },
  {
    label: 'try',
    detail: 'TRY ... CATCH error handler',
    category: 'Control Flow',
    insertText: 'TRY\n\t${1:// risky code}\nCATCH Exception ${2:ex}\n\t${3:// handle error}\nENDCATCH;\nENDTRY;',
    docs: 'Error handling block.'
  },

  // ── Button Handler Pattern ────────────────────────────────────────────────
  {
    label: 'button-handler',
    detail: 'MLM Button click handler block',
    category: 'Button Handlers',
    insertText: 'IF this_documentCommunication.EventType = "MLMButtonClick" AND\n   this_documentCommunication.ButtonName = "${1:My Button Name}" THEN\n\t${2:// button logic here}\nENDIF;',
    docs: 'Handles a specific button click event in a document MLM.'
  },

  // ── Alert Destination ─────────────────────────────────────────────────────
  {
    label: 'alert-dest',
    detail: 'Alert destination declaration',
    category: 'Alerts',
    insertText: '${1:alert_dest} := destination {Alert: Warning, "${2:Alert Title}", Low, chart, "${3:Alert Category}", 1001, "", "Must Acknowledge"};',
    docs: 'Declares an alert destination for use with WRITE.'
  },
  {
    label: 'alert-write',
    detail: 'Write message to alert destination',
    category: 'Alerts',
    insertText: 'WRITE ${1:message} AT ${2:alert_dest};',
    docs: 'Sends a message to an alert destination.'
  },

  // ── Debug Patterns ────────────────────────────────────────────────────────
  {
    label: 'debug-popup',
    detail: 'Debug display message popup',
    category: 'Debug',
    insertText: '// DEBUG — remove before production\nthis_documentCommunication.DisplayMessage := TRUE;\nthis_documentCommunication.Message := "${1:DEBUG: }" || ${2:variable};',
    docs: 'Shows a debug popup message. REMOVE BEFORE PRODUCTION.'
  },
  {
    label: 'called-by-editor',
    detail: 'Called_By_Editor test block',
    category: 'Debug',
    insertText: 'IF Called_By_Editor THEN\n\t// Simulate context for MLM Editor testing\n\tthis_documentCommunication.DocumentName := "${1:My Document}";\n\tthis_documentCommunication.EventType := "${2:DocumentOpening}";\nENDIF;',
    docs: 'Simulates document context when running in MLM Editor. Remove or gate with a flag in production.'
  },

  // ── Write to Note ─────────────────────────────────────────────────────────
  {
    label: 'write-to-note',
    detail: 'Write value to document observation',
    category: 'Document Write',
    insertText: 'this_documentCommunication := CALL ${1:WriteToNote_MLM} WITH this_documentCommunication, ${2:obs_name}, ${3:new_value}, "", "Replace";',
    docs: 'Writes a value into a document observation field via the DOM MLM pattern.'
  },

  // ── Get Variables MLM Pattern ─────────────────────────────────────────────
  {
    label: 'get-variables',
    detail: 'Standard get variable values pattern (RPM DOM)',
    category: 'Document Write',
    insertText: `Get_Variable_Values := MLM 'Called_RPM_DOM_Get_Definition_MLM';
(this_documentCommunication,
  client_guid, client_visit_guid, client_chart_guid, user_guid,
  document_type, document_name,
  event_type, this_parameters, current_value)
  := CALL Get_Variable_Values WITH (this_documentCommunication);`,
    docs: 'Standard pattern to extract key variables from the document communication object using the RPM DOM Definition MLM.'
  },

  // ── MLM Skeleton ─────────────────────────────────────────────────────────
  {
    label: 'mlm-skeleton',
    detail: 'Full MLM skeleton template',
    category: 'Templates',
    insertText: `maintenance:
\ttitle: \${1:MLM_NAME};;
\tmlmname: \${1:MLM_NAME};;
\tarden: version 2.5;;
\tversion: 1.00;;
\tinstitution: DrMohite.com;;
\tauthor: \${2:Your Name};;
\tspecialist: \${3:Specialist Name};;
\tdate: \${4:2024-01-01};;
\tvalidation: testing;;

library:
\tpurpose: \${5:What this MLM does};;
\texplanation: \${6:Detailed explanation};;
\tkeywords: \${7:keyword1, keyword2};;
\tcitations: ;;

knowledge:
\ttype: data-driven;;
\tdata:
\t\t(this_documentCommunication) := ARGUMENT;

\t\tIF Called_By_Editor THEN
\t\t\t// Test data for MLM Editor
\t\tENDIF;
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
end:`,
    docs: 'Complete MLM skeleton with all required slots pre-filled.'
  },

  // ── Observation Value Patterns ────────────────────────────────────────────
  {
    label: 'get-obs-value',
    detail: 'Get observation value from document parameter',
    category: 'Document Write',
    insertText: `Get_Param_Values := MLM 'CALLED_RETURN_OBJECT';
\${1:obs_obj} := CALL Get_Param_Values WITH this_documentcommunication, \${2:obs_name};
\${3:obs_value} := \${1:obs_obj}.Obs_Valuetext;`,
    docs: 'Retrieves the current value of a document observation field.'
  }
];
