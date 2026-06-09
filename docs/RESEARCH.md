# Gemini Research Output (for implementation reference)

## X12 004010 segment definitions

### PER (Administrative Communications Contact)
- PER01 Contact Function Code (IC, BD, CN)
- PER02 Name
- PER03 Comm Number Qualifier (TE phone, EM email, FX fax, EX ext)
- PER04 Communication Number
- PER05 Comm Number Qualifier
- PER06 Communication Number

### ENT (Entity)
- ENT01 Assigned Number
- ENT02 Entity Identifier Code (DR drawer, PY payee, BY buyer)
- ENT03 ID Code Qualifier (FI fed tax id, 38 D&B)
- ENT04 Identification Code
- ENT05 Entity Identifier Code

### NTE (Note/Special Instruction)
- NTE01 Note Reference Code (ADD, OTH, GEN)
- NTE02 Description (free text)

## syntaxes/edi.tmLanguage.json
```json
{
  "$schema": "https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json",
  "name": "X12 EDI",
  "scopeName": "source.edi",
  "patterns": [
    { "comment": "Segment Tag", "match": "(?:^|(?<=~))([A-Z][A-Z0-9]{1,2})", "captures": { "1": { "name": "keyword.control.segment.edi" } } },
    { "comment": "Element Separator", "match": "\\*", "name": "keyword.operator.element.edi" },
    { "comment": "Segment Terminator", "match": "~", "name": "keyword.control.terminator.edi" },
    { "comment": "Sub-element Separator", "match": ":", "name": "keyword.operator.subelement.edi" }
  ]
}
```

## package.json contributions
```json
"languages": [
  { "id": "edi", "aliases": ["EDI", "X12"], "extensions": [".edi", ".x12"], "configuration": "./language-configuration.json" }
],
"grammars": [
  { "language": "edi", "scopeName": "source.edi", "path": "./syntaxes/edi.tmLanguage.json" }
]
```
