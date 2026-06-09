# EDI Insight — Gap Closure Brief

Project: /home/peyman/Desktop/workstation/vscode-edi-insight-plugin
Stack: TypeScript, VS Code Extension API, strict mode, commonjs, out/ build.

## Gaps to close

### G1: ISA off-by-one parsing bug (CRITICAL correctness)
File: src/parser/x12Parser.ts
Cause: parse() strips leading empty element for non-ISA segments only
(`tag !== 'ISA'` exception). ISA keeps a leading '' element, so every ISA
index read in MessageExtractor is shifted by one.
Effect: senderId reads "ZZ" not "SENDER"; testProduction reads "0" not "T";
environment always "Unknown".
Fix: strip the leading element separator for ISA too (remove the exception),
so elements[5]=ISA06 sender, elements[7]=ISA08 receiver, elements[14]=ISA15
usage indicator. Verify against samples/.

### G2: No tests
Add a test runner not requiring VS Code host (pure unit tests for parser,
classifier, reportDetector, validationService). Prefer a lightweight runner
(node:test or mocha) so `npm test` runs headless. Cover:
- parser tokenization + ISA/GS/ST/SE extraction
- environment Test vs Production
- payment channel ACH / Wire / Check / BillPay / C2C / Unknown
- report detection per transaction type
- validation warnings (missing segments, count mismatch)
Use samples/ as fixtures.

### G3: Segment-by-segment explanation unused dictionary
File: src/parser/ediDictionary.ts SEGMENT_DEFINITIONS is dead code.
src/webview/renderHtml.ts segment table only shows raw string.
Fix: build a segment explainer that maps each element to its
ElementDefinition name from SEGMENT_DEFINITIONS, rendering element-by-element
(position, name, value). Unknown segments fall back to raw.

### G4: EDI syntax highlighting
Add a TextMate grammar + language contribution in package.json so .edi/.x12
files get segment-tag highlighting (ISA/GS/ST/BPR/etc highlighted, separators
distinct). Register language id "edi", scopeName "source.edi", grammar file
under syntaxes/.

### G5: Missing purpose segments PER, ENT, NTE
Add SEGMENT_DEFINITIONS entries for PER (Administrative Contact), ENT
(Entity), NTE (Note/free text). Extract them so classifier purpose detection
can use them. Surface in extracted message + webview where relevant.

## Constraints
- No paid APIs, offline, strict TypeScript, keep modular.
- `npm run compile` must stay clean. `npm test` must pass headless.
