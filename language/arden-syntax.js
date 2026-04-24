// MLM Forge — Arden Syntax Monarch Tokenizer
// Registers the 'arden' language with Monaco and provides full syntax highlighting

window.registerArdenLanguage = function(monaco) {
  monaco.languages.register({ id: 'arden', extensions: ['.mlm', '.MLM'], aliases: ['Arden Syntax', 'arden'] });

  // ── Monarch Tokenizer ────────────────────────────────────────────────────
  monaco.languages.setMonarchTokensProvider('arden', {
    ignoreCase: true,
    defaultToken: 'text',
    tokenPostfix: '.arden',

    keywords: [
      'if', 'then', 'else', 'elseif', 'endif',
      'for', 'in', 'do', 'enddo', 'seqto', 'where',
      'try', 'catch', 'exception', 'endtry', 'endcatch',
      'conclude', 'return', 'argument', 'call', 'with',
      'read', 'last', 'first', 'write', 'at',
      'event', 'mlm', 'new', 'object',
      'and', 'or', 'not', 'exists', 'null',
      'true', 'false', 'now',
      'matches', 'pattern', 'contains',
      'substring', 'characters', 'starting', 'from',
      'length', 'of', 'count', 'as', 'string', 'number', 'text',
      'type', 'priority', 'urgency',
      'data-driven', 'temporal', 'data',
      'void', 'replace', 'append', 'replace_append',
      'sql', 'nolock'
    ],

    sections: [
      'maintenance', 'library', 'knowledge', 'end'
    ],

    slots: [
      'title', 'mlmname', 'arden', 'version', 'institution',
      'author', 'specialist', 'date', 'validation',
      'purpose', 'explanation', 'keywords', 'citations',
      'type', 'priority', 'evoke', 'logic', 'action', 'urgency'
    ],

    eventTypes: [
      'ClientDocumentEnter', 'ClientDocumentModify', 'ClientDocumentClose',
      'OrderEnter', 'OrderModify', 'OrderComplete', 'OrderVerify', 'OrderInit',
      'ObservationEnter', 'ObservationModify',
      'ClientVisitEnter', 'ClientVisitModify', 'ClientVisitDischarge',
      'AlertEnter', 'HealthIssueEnter', 'HealthIssueModify',
      'OrderTaskEnter', 'OrderTaskModify', 'OrderRelease',
      'CareProviderVisitRoleEnter', 'CareProviderVisitRoleModify',
      'DocumentOpening', 'MLMButtonClick', 'DocumentClosing',
      'AlertCheckingOrder'
    ],

    operators: [':=', ';;', '//', '/*', '*/', '||', '<>', '>=', '<=', '<', '>'],

    tokenizer: {
      root: [
        // Comments
        [/\/\/.*$/, 'comment'],
        [/\/\*/, 'comment', '@blockComment'],

        // Section headers (maintenance:, library:, knowledge:, end:)
        [/^(maintenance|library|knowledge|end)(\s*:)/i, ['keyword.section', 'keyword.section']],

        // Slot names at line start (title:, mlmname:, purpose:, etc.)
        [/^\s*(title|mlmname|arden|version|institution|author|specialist|date|validation|purpose|explanation|keywords|citations|priority|evoke|logic|action|urgency|type|data)(\s*:)/i, ['keyword.slot', 'delimiter']],

        // Double semicolons (section terminator)
        [/;;/, 'keyword.terminator'],

        // SQL strings inside { }
        [/\{/, 'delimiter.curly', '@sqlBlock'],

        // String literals
        [/"([^"]*)"/, 'string'],
        [/'([^']*)'/, 'string.mlmname'],

        // Event types
        [/\b(ClientDocumentEnter|ClientDocumentModify|ClientDocumentClose|OrderEnter|OrderModify|OrderComplete|OrderVerify|OrderInit|ObservationEnter|ObservationModify|ClientVisitEnter|ClientVisitModify|ClientVisitDischarge|AlertEnter|HealthIssueEnter|HealthIssueModify|OrderTaskEnter|OrderTaskModify|OrderRelease|CareProviderVisitRoleEnter|DocumentOpening|MLMButtonClick|DocumentClosing|AlertCheckingOrder)\b/i, 'keyword.eventtype'],

        // Main keywords
        [/\b(IF|THEN|ELSE|ELSEIF|ENDIF|FOR|IN|DO|ENDDO|SEQTO|WHERE|TRY|CATCH|EXCEPTION|ENDTRY|ENDCATCH|CONCLUDE|RETURN|ARGUMENT|CALL|WITH|READ|LAST|FIRST|WRITE|AT|EVENT|MLM|NEW|OBJECT|AND|OR|NOT|EXISTS|MATCHES|PATTERN|CONTAINS|SUBSTRING|CHARACTERS|STARTING|FROM|LENGTH|COUNT|AS|STRING|NUMBER|DATA-DRIVEN|TEMPORAL)\b/i, 'keyword'],

        // Assignment operator
        [/:=/, 'keyword.operator'],

        // String concatenation
        [/\|\|/, 'keyword.operator'],

        // Comparison operators
        [/<>|>=|<=|>|</, 'keyword.operator'],

        // SQL() function
        [/\bSQL\s*\(/i, 'function'],

        // Boolean/null constants
        [/\b(TRUE|FALSE|NULL|NOW)\b/i, 'constant'],

        // Called_By_Editor (special flag)
        [/\bCalled_By_Editor\b/i, 'variable.special'],

        // this_documentCommunication and its properties
        [/\bthis_documentCommunication\b/i, 'variable.this'],

        // Numeric literals
        [/\b\d+(\.\d+)?\b/, 'number'],

        // Identifiers — distinguish variables vs unknown
        [/[a-zA-Z_]\w*/, {
          cases: {
            '@keywords': 'keyword',
            '@default': 'identifier'
          }
        }],

        // Delimiters
        [/[{}()\[\]]/, 'delimiter'],
        [/[;,]/, 'delimiter'],
      ],

      blockComment: [
        [/[^/*]+/, 'comment'],
        [/\*\//, 'comment', '@pop'],
        [/[/*]/, 'comment']
      ],

      sqlBlock: [
        [/\}/, 'delimiter.curly', '@pop'],
        [/"([^"]*)"/, 'string'],
        [/\bSQL\s*\(/i, 'function'],
        [/\b(SELECT|FROM|WHERE|JOIN|LEFT|OUTER|INNER|AND|OR|NOT|ON|GROUP\s+BY|ORDER\s+BY|HAVING|AS|CASE|WHEN|THEN|ELSE|END|INSERT|UPDATE|DELETE|WITH|IN|IS|NULL|nolock|MAX|MIN|AVG|COUNT|TOP|CONVERT|CAST|ISNULL|COALESCE|varchar|int|datetime)\b/i, 'keyword.sql'],
        [/\|\|/, 'keyword.operator'],
        [/[a-zA-Z_]\w*/, 'identifier.sql'],
        [/\d+/, 'number'],
        [/./, 'text']
      ]
    }
  });

  // ── Language Configuration (brackets, comments, folding) ──────────────────
  monaco.languages.setLanguageConfiguration('arden', {
    comments: {
      lineComment: '//',
      blockComment: ['/*', '*/']
    },
    brackets: [
      ['{', '}'],
      ['(', ')'],
      ['[', ']']
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '(', close: ')' },
      { open: '[', close: ']' },
      { open: '"', close: '"', notIn: ['string', 'comment'] },
      { open: "'", close: "'", notIn: ['string', 'comment'] }
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" }
    ],
    folding: {
      markers: {
        start: /^\s*(maintenance|library|knowledge|data|logic|action|evoke)(\s*:)/i,
        end: /\s*;;\s*$/
      }
    },
    wordPattern: /[a-zA-Z_][\w]*/
  });
};
