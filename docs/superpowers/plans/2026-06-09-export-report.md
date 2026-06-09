# Export Report Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a multi-format (HTML, JSON, Markdown, CSV) report export feature triggered by an Export button in the webview toolbar, using a VS Code QuickPick → SaveDialog flow.

**Architecture:** A new `ExportService` owns all format conversion logic. The webview Export button sends `{ type: 'export' }` via postMessage; the extension handles it with `showQuickPick` → `showSaveDialog` → file write → `{ type: 'exported' }` response. `renderStandalone()` is added to `HtmlRenderer` for CDN-based standalone HTML without VS Code dependencies. CSS is extracted into a shared `styles()` helper used by both `shell()` and `shellStandalone()`.

**Tech Stack:** TypeScript, VS Code Extension API (`vscode.window.showQuickPick`, `vscode.window.showSaveDialog`, `vscode.workspace.fs.writeFile`), Node.js built-in test runner (`node:test`).

---

## File Map

| Action | File | Responsibility |
| ------ | ---- | -------------- |
| Create | `src/exporter/exportService.ts` | All format conversion: JSON, CSV, Markdown, HTML |
| Modify | `src/webview/renderHtml.ts` | Add `renderStandalone()`, `shellStandalone()`, extract `styles()`, add Export button + JS handlers |
| Modify | `src/extension.ts` | Add `currentResult`/`currentRawContent` module vars, import ExportService, handle `export` message type |
| Modify | `src/test/edi.test.ts` | Tests for ExportService (all 4 formats), `renderStandalone`, Export button in toolbar |

---

### Task 1: ExportService skeleton + JSON export

**Files:**
- Create: `src/exporter/exportService.ts`
- Modify: `src/test/edi.test.ts`

- [ ] **Step 1: Add import, shared helper, and failing JSON test in `src/test/edi.test.ts`**

Add the `ExportService` import after the existing imports (around line 14):

```typescript
import { ExportService } from '../exporter/exportService';
```

Add a `buildResult` helper function after the `extractSample` function (around line 27):

```typescript
function buildResult(sampleName: string) {
  const raw = readSample(sampleName);
  const extracted = extractSample(sampleName);
  const classification = classifier.classify(extracted);
  const reports = new ReportDetector().detect(extracted, classification);
  return {
    classification,
    extracted,
    reports,
    warnings: new ValidationService().validate(extracted),
    segmentGroups: new SegmentGrouper().group(extracted.allSegments),
    outputProfile: new OutputProfiler().profile(extracted, classification, reports)
  };
}
```

Add this test at the bottom of the file:

```typescript
test('ExportService json produces valid JSON matching AnalysisResult shape', () => {
  const svc = new ExportService();
  const result = buildResult('820-billpay-test.edi');
  const json = svc.export('json', result, '', 'test');
  const parsed = JSON.parse(json);
  assert.equal(parsed.classification.environment, 'Test');
  assert.equal(parsed.classification.paymentChannel, 'BillPay');
  assert.ok(Array.isArray(parsed.extracted.parties));
  assert.ok(parsed.extracted.parties.length > 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test 2>&1 | tail -20
```

Expected: compilation error — `Cannot find module '../exporter/exportService'`.

- [ ] **Step 3: Create `src/exporter/exportService.ts`**

```typescript
import { AnalysisResult } from '../types';
import { HtmlRenderer } from '../webview/renderHtml';
import { MermaidGraphGenerator } from '../webview/mermaidGraph';

export type ExportFormat = 'html' | 'json' | 'md' | 'csv';

export class ExportService {
  export(format: ExportFormat, result: AnalysisResult, rawContent: string, sourceName: string): string {
    switch (format) {
      case 'json': return this.toJson(result);
      case 'csv':  return this.toCsv(result);
      case 'md':   return this.toMarkdown(result, sourceName);
      case 'html': return this.toHtml(result, rawContent);
    }
  }

  private toJson(result: AnalysisResult): string {
    return JSON.stringify(result, null, 2);
  }

  private toCsv(_result: AnalysisResult): string { return ''; }

  private toMarkdown(_result: AnalysisResult, _sourceName: string): string { return ''; }

  private toHtml(_result: AnalysisResult, _rawContent: string): string { return ''; }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test 2>&1 | grep -E "pass|fail|ok|not ok"
```

Expected: all tests pass including the new JSON test.

- [ ] **Step 5: Commit**

```bash
git add src/exporter/exportService.ts src/test/edi.test.ts
git commit -m "feat: add ExportService skeleton with JSON export"
```

---

### Task 2: ExportService — CSV export

**Files:**
- Modify: `src/exporter/exportService.ts`
- Modify: `src/test/edi.test.ts`

- [ ] **Step 1: Add failing CSV test at the bottom of `src/test/edi.test.ts`**

```typescript
test('ExportService csv contains section headers and tabular data', () => {
  const svc = new ExportService();
  const result = buildResult('820-billpay-test.edi');
  const csv = svc.export('csv', result, '', 'test');
  assert.ok(csv.includes('Parties'), 'has Parties section header');
  assert.ok(csv.includes('"Code","Name"'), 'has party column headers');
  assert.ok(csv.includes('"PR","ABC BILLPAY SERVICE"'), 'has party data row');
  assert.ok(csv.includes('Remittance Details'), 'has Remittance Details section header');
  assert.ok(csv.includes('"Invoice Number","Paid Amount"'), 'has remittance column headers');
  assert.ok(csv.includes('Segment Explanation'), 'has Segment Explanation section header');
  assert.ok(csv.includes('"Segment","Position","Name","Value"'), 'has segment column headers');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test 2>&1 | grep -E "csv|fail|not ok"
```

Expected: CSV test fails — empty string returned by stub.

- [ ] **Step 3: Replace `toCsv` stub in `src/exporter/exportService.ts`**

```typescript
private toCsv(result: AnalysisResult): string {
  const lines: string[] = [];
  const esc = (v: string | undefined) => `"${(v ?? '').replace(/"/g, '""')}"`;
  const row = (...cells: (string | undefined)[]) => cells.map(esc).join(',');

  lines.push('Parties');
  lines.push(row('Code', 'Name'));
  for (const p of result.extracted.parties) { lines.push(row(p.code, p.name)); }
  lines.push('');

  lines.push('Contacts');
  lines.push(row('Name', 'Communication', 'Alternate Communication'));
  for (const c of (result.extracted.contacts ?? [])) {
    const comm = [c.communicationQualifier, c.communicationNumber].filter(Boolean).join(': ');
    const alt = [c.alternateCommunicationQualifier, c.alternateCommunicationNumber].filter(Boolean).join(': ');
    lines.push(row(c.name, comm, alt));
  }
  lines.push('');

  lines.push('Entities');
  lines.push(row('Assigned Number', 'Entity Code', 'Identification', 'Additional Entity Code'));
  for (const en of (result.extracted.entities ?? [])) {
    const id = [en.identificationCodeQualifier, en.identificationCode].filter(Boolean).join(': ');
    lines.push(row(en.assignedNumber, en.entityIdentifierCode, id, en.additionalEntityIdentifierCode));
  }
  lines.push('');

  lines.push('Remittance Details');
  lines.push(row('Invoice Number', 'Paid Amount'));
  for (const d of result.extracted.remittanceDetails) { lines.push(row(d.invoiceNumber, d.paidAmount)); }
  lines.push('');

  lines.push('Segment Explanation');
  lines.push(row('Segment', 'Position', 'Name', 'Value'));
  for (const g of result.segmentGroups) {
    for (const seg of g.segments) {
      for (let i = 0; i < seg.elements.length; i++) {
        lines.push(row(seg.tag, String(i + 1).padStart(2, '0'), g.name, seg.elements[i]));
      }
    }
  }

  return lines.join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test 2>&1 | grep -E "pass|fail|ok|not ok"
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/exporter/exportService.ts src/test/edi.test.ts
git commit -m "feat: add CSV export to ExportService"
```

---

### Task 3: ExportService — Markdown export

**Files:**
- Modify: `src/exporter/exportService.ts`
- Modify: `src/test/edi.test.ts`

- [ ] **Step 1: Add failing Markdown test at the bottom of `src/test/edi.test.ts`**

```typescript
test('ExportService md contains title, headings, party table, and Mermaid block', () => {
  const svc = new ExportService();
  const result = buildResult('820-billpay-test.edi');
  const md = svc.export('md', result, '', 'test.edi');
  assert.ok(md.includes('# EDI Analysis: test.edi'), 'has document title');
  assert.ok(md.includes('## Message Overview'), 'has Message Overview heading');
  assert.ok(md.includes('## Business Report Detection'), 'has Business Report Detection heading');
  assert.ok(md.includes('## Parties'), 'has Parties heading');
  assert.ok(md.includes('| PR | ABC BILLPAY SERVICE |'), 'has party data row');
  assert.ok(md.includes('```mermaid'), 'has Mermaid diagram fenced block');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test 2>&1 | grep -E "md|markdown|fail|not ok"
```

Expected: Markdown test fails — empty string returned by stub.

- [ ] **Step 3: Replace `toMarkdown` stub in `src/exporter/exportService.ts`**

```typescript
private toMarkdown(result: AnalysisResult, sourceName: string): string {
  const e = result.extracted;
  const c = result.classification;
  const op = result.outputProfile;
  const lines: string[] = [];

  lines.push(`# EDI Analysis: ${sourceName}`, '');
  lines.push('```');
  lines.push(`Message: ${c.messageCode} · ${c.description}`);
  lines.push(`Environment: ${c.environment}`);
  lines.push(`Payment Channel: ${c.paymentChannel}`);
  lines.push(`Handoff: ${op.hasHandoffReport ? 'YES' : 'NO'}`);
  lines.push(`Cadence: ${op.cadence}`);
  lines.push('```', '');

  lines.push('## Message Overview', '');
  lines.push('| Field | Value |', '| ----- | ----- |');
  lines.push(`| Message Type | ${c.messageType} |`);
  lines.push(`| Description | ${c.description} |`);
  lines.push(`| Sender ID | ${e.senderId || 'N/A'} |`);
  lines.push(`| Receiver ID | ${e.receiverId || 'N/A'} |`, '');

  lines.push('## Environment', '');
  lines.push(`**Status:** ${c.environment}`, '');

  lines.push('## Payment Channel Detection', '');
  lines.push('| Field | Value |', '| ----- | ----- |');
  lines.push(`| Detected Channel | ${c.paymentChannel} |`);
  lines.push(`| Payment Method | ${e.paymentMethod || 'N/A'} |`);
  lines.push(`| Payment Format | ${e.paymentFormat || 'N/A'} |`, '');

  lines.push('## Business Report Detection', '');
  if (result.reports.length > 0) {
    for (const r of result.reports) {
      lines.push(`### ${r.name}`);
      lines.push(`- **Reason:** ${r.reason}`);
      lines.push(`- **Source Segments:** ${r.sourceSegments.join(', ')}`);
      lines.push(`- **Key Fields:** ${r.keyFields.join(', ')}`);
      lines.push(`- **Example Output:** \`${r.exampleRow}\``, '');
    }
  } else {
    lines.push('No reports detected for this message.', '');
  }

  lines.push('## Handoff & Output Cadence', '');
  lines.push(`- **Downstream Handoff Report:** ${op.hasHandoffReport ? 'YES' : 'NO'}`);
  if (op.handoffReports.length) { lines.push(`- **Handoff Reports:** ${op.handoffReports.join(', ')}`); }
  if (op.statusReports.length) { lines.push(`- **Status Reports:** ${op.statusReports.join(', ')}`); }
  lines.push(`- **Cadence:** ${op.cadence} (${op.confidence} confidence)`);
  lines.push(`- **Reason:** ${op.cadenceReason}`, '');

  lines.push('## Payment Summary', '');
  lines.push('| Field | Value |', '| ----- | ----- |');
  lines.push(`| Amount | ${e.paymentAmount || 'N/A'} |`);
  lines.push(`| Payment Date | ${e.paymentDate || 'N/A'} |`);
  lines.push(`| Trace Number | ${e.traceNumber || 'N/A'} |`, '');

  if (e.parties.length > 0) {
    lines.push('## Parties', '');
    lines.push('| Code | Name |', '| ---- | ---- |');
    for (const p of e.parties) { lines.push(`| ${p.code} | ${p.name} |`); }
    lines.push('');
  }

  if ((e.contacts ?? []).length > 0) {
    lines.push('## Contacts', '');
    lines.push('| Name | Communication | Alternate Communication |', '| ---- | ------------- | ----------------------- |');
    for (const ct of (e.contacts ?? [])) {
      const comm = [ct.communicationQualifier, ct.communicationNumber].filter(Boolean).join(': ');
      const alt = [ct.alternateCommunicationQualifier, ct.alternateCommunicationNumber].filter(Boolean).join(': ');
      lines.push(`| ${ct.name || 'N/A'} | ${comm || 'N/A'} | ${alt || 'N/A'} |`);
    }
    lines.push('');
  }

  if (e.remittanceDetails.length > 0) {
    lines.push('## Invoice / Remittance Details', '');
    lines.push('| Invoice Number | Paid Amount |', '| -------------- | ----------- |');
    for (const d of e.remittanceDetails) { lines.push(`| ${d.invoiceNumber || 'N/A'} | ${d.paidAmount || 'N/A'} |`); }
    lines.push('');
  }

  if (result.warnings.length > 0) {
    lines.push('## Validation Warnings', '');
    for (const w of result.warnings) {
      const icon = w.severity === 'error' ? '❌' : w.severity === 'warning' ? '⚠️' : 'ℹ️';
      lines.push(`- ${icon} **${w.severity.toUpperCase()}:** ${w.message} (Affected: ${w.affectedSegments.join(', ')})`);
    }
    lines.push('');
  }

  lines.push('## Message Structure', '');
  lines.push('```mermaid');
  lines.push(new MermaidGraphGenerator().generate(result.extracted));
  lines.push('```', '');

  return lines.join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test 2>&1 | grep -E "pass|fail|ok|not ok"
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/exporter/exportService.ts src/test/edi.test.ts
git commit -m "feat: add Markdown export to ExportService"
```

---

### Task 4: HtmlRenderer — extract styles(), add renderStandalone()

**Files:**
- Modify: `src/webview/renderHtml.ts`
- Modify: `src/test/edi.test.ts`

- [ ] **Step 1: Add failing renderStandalone test at the bottom of `src/test/edi.test.ts`**

```typescript
test('HtmlRenderer renderStandalone produces standalone HTML without VS Code dependencies', () => {
  const raw = readSample('820-billpay-test.edi');
  const result = buildResult('820-billpay-test.edi');
  const html = new HtmlRenderer().renderStandalone(result, raw);
  assert.ok(html.startsWith('<!DOCTYPE html>'), 'is a full HTML document');
  assert.ok(!html.includes('acquireVsCodeApi'), 'no VS Code API');
  assert.ok(!html.includes('Content-Security-Policy'), 'no CSP meta tag');
  assert.ok(html.includes('cdn.jsdelivr.net'), 'loads Mermaid from CDN');
  assert.ok(!html.includes('btnEdit'), 'no Edit Source button');
  assert.ok(!html.includes('Re-analyze'), 'no Re-analyze button');
  assert.ok(!html.includes('btnReanalyze'), 'no Re-analyze handler');
  assert.ok(!html.includes('btnSave'), 'no Save to File handler');
  assert.ok(html.includes('btnCopy'), 'has Copy JSON button');
  assert.ok(html.includes('ABC BILLPAY SERVICE'), 'contains party data from analysis');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test 2>&1 | grep -E "standalone|fail|not ok"
```

Expected: FAIL — `renderStandalone is not a function`.

- [ ] **Step 3: Extract CSS into `private styles()` in `src/webview/renderHtml.ts`**

In `shell()`, find the `<style>` block (the entire content between `<style>` and `</style>`, approximately lines 222–318 of the current file). Replace the entire CSS literal inside the style tag with `${this.styles()}`:

```typescript
  <style>
    ${this.styles()}
  </style>
```

Add the `private styles()` method before the `private escape()` method at the bottom of the class:

```typescript
private styles(): string {
  return `
    :root {
      --bg: var(--vscode-editor-background, #1e1e1e);
      --fg: var(--vscode-editor-foreground, #d4d4d4);
      --muted: var(--vscode-descriptionForeground, #9aa0a6);
      --panel: var(--vscode-sideBar-background, rgba(127,127,127,0.08));
      --border: var(--vscode-panel-border, rgba(127,127,127,0.3));
      --accent: var(--vscode-textLink-foreground, #3794ff);
      --code-bg: var(--vscode-textCodeBlock-background, rgba(127,127,127,0.12));
      --btn-bg: var(--vscode-button-background, #0e639c);
      --btn-fg: var(--vscode-button-foreground, #fff);
      --btn-hover: var(--vscode-button-hoverBackground, #1177bb);
      --btn2-bg: var(--vscode-button-secondaryBackground, rgba(127,127,127,0.25));
      --btn2-fg: var(--vscode-button-secondaryForeground, var(--fg));
      --input-bg: var(--vscode-input-background, #2d2d2d);
      --input-fg: var(--vscode-input-foreground, #d4d4d4);
      --input-border: var(--vscode-input-border, var(--border));
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: var(--vscode-font-family, -apple-system, "Segoe UI", sans-serif); font-size: var(--vscode-font-size, 13px); line-height: 1.55; color: var(--fg); background: var(--bg); }
    .container { max-width: 1100px; margin: 0 auto; padding: 0 16px 40px; }

    .toolbar { position: sticky; top: 0; z-index: 50; background: var(--bg); border-bottom: 1px solid var(--border); padding: 10px 16px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
    .toolbar .brand { font-weight: 700; font-size: 15px; color: var(--fg); margin-right: 4px; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; flex: 1; }
    .chip { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 11px; background: var(--code-bg); color: var(--fg); border: 1px solid var(--border); white-space: nowrap; }
    .chip-accent { background: color-mix(in srgb, var(--accent) 22%, transparent); border-color: var(--accent); }
    .chip-test { background: rgba(243,156,18,0.18); border-color: #f39c12; }
    .chip-prod { background: rgba(39,174,96,0.18); border-color: #27ae60; }
    .chip-unknown { opacity: 0.85; }
    .chip-yes { background: rgba(39,174,96,0.18); border-color: #27ae60; }
    .chip-no { background: rgba(231,76,60,0.18); border-color: #e74c3c; }
    .actions { display: flex; gap: 6px; flex-wrap: wrap; }
    button { font-family: inherit; font-size: 12px; cursor: pointer; border: none; border-radius: 4px; padding: 5px 12px; background: var(--btn-bg); color: var(--btn-fg); }
    button:hover { background: var(--btn-hover); }
    button.secondary { background: var(--btn2-bg); color: var(--btn2-fg); }

    .edit-panel { display: none; background: var(--panel); border: 1px solid var(--border); border-radius: 6px; padding: 14px; margin: 14px 0; }
    .edit-panel.visible { display: block; }
    .edit-panel h3 { font-size: 14px; margin-bottom: 8px; }
    #ediSource { width: 100%; min-height: 200px; resize: vertical; font-family: var(--vscode-editor-font-family, "Courier New", monospace); font-size: 12px; background: var(--input-bg); color: var(--input-fg); border: 1px solid var(--input-border); border-radius: 4px; padding: 10px; }
    .edit-actions { display: flex; gap: 8px; margin-top: 10px; align-items: center; }
    #editStatus { font-size: 12px; }
    #editStatus.ok { color: #27ae60; }
    #editStatus.err { color: #e74c3c; }

    h1 { font-size: 22px; margin: 18px 0 4px; }
    .subtitle { color: var(--muted); margin-bottom: 8px; }
    details.section { background: var(--panel); border: 1px solid var(--border); border-radius: 6px; margin-bottom: 12px; }
    details.section > summary { cursor: pointer; list-style: none; padding: 12px 16px; user-select: none; }
    details.section > summary::-webkit-details-marker { display: none; }
    details.section > summary h2 { display: inline; font-size: 16px; color: var(--fg); border: none; }
    details.section > summary::before { content: '▸'; color: var(--muted); margin-right: 8px; font-size: 11px; }
    details.section[open] > summary::before { content: '▾'; }
    .section-body { padding: 4px 16px 16px; }

    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
    .box { padding: 12px; background: var(--code-bg); border-left: 3px solid var(--accent); border-radius: 4px; }
    .box.summary { border-left-width: 4px; }
    .box.accent-test { border-left-color: #f39c12; }
    .box.accent-production { border-left-color: #27ae60; }
    .box.accent-unknown { border-left-color: var(--muted); }
    .label { font-size: 11px; text-transform: uppercase; letter-spacing: .03em; color: var(--muted); margin-bottom: 4px; font-weight: 600; }
    .value { font-size: 15px; word-break: break-word; }
    .value.big { font-size: 22px; font-weight: 700; }
    .cadence { font-size: 24px; font-weight: 700; margin: 4px 0 8px; }
    .muted { color: var(--muted); font-size: 13px; margin: 6px 0; }
    .no-data { color: var(--muted); font-style: italic; }

    table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 13px; }
    th { text-align: left; padding: 9px 10px; border-bottom: 2px solid var(--border); color: var(--muted); font-size: 11px; text-transform: uppercase; }
    td { padding: 8px 10px; border-bottom: 1px solid var(--border); vertical-align: top; }
    code { font-family: var(--vscode-editor-font-family, monospace); background: var(--code-bg); padding: 1px 5px; border-radius: 3px; }

    .badge { display: inline-block; padding: 3px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; margin: 0 4px 4px 0; background: var(--code-bg); border: 1px solid var(--border); }
    .badge-yes { background: rgba(39,174,96,0.18); border-color: #27ae60; color: var(--fg); }
    .badge-no { background: rgba(231,76,60,0.18); border-color: #e74c3c; color: var(--fg); }
    .badge-info { background: color-mix(in srgb, var(--accent) 20%, transparent); border-color: var(--accent); }

    .report-list { list-style: none; }
    .report-list li { padding: 12px; margin-bottom: 10px; border: 1px solid var(--border); border-radius: 4px; background: var(--code-bg); }
    .report-title { font-weight: 700; margin-bottom: 6px; }
    .report-example { background: var(--bg); padding: 8px 10px; border-left: 3px solid var(--accent); font-family: monospace; font-size: 12px; overflow-x: auto; margin-top: 6px; }

    .mermaid { display: flex; justify-content: center; margin: 12px 0; overflow-x: auto; }
    .segment-group { margin-top: 18px; }
    .segment-group:first-child { margin-top: 0; }
    .segment-group h3 { font-size: 15px; margin-bottom: 2px; }

    .warning { padding: 12px; margin-bottom: 10px; border-left: 4px solid var(--muted); border-radius: 4px; background: var(--code-bg); }
    .warning.error { border-left-color: #e74c3c; }
    .warning.warning { border-left-color: #f39c12; }
    .warning.info { border-left-color: var(--accent); }
    .warning-title { font-weight: 700; margin-bottom: 4px; }

    .code-block { background: var(--code-bg); color: var(--fg); padding: 14px; border-radius: 4px; overflow-x: auto; font-family: var(--vscode-editor-font-family, "Courier New", monospace); font-size: 12px; white-space: pre-wrap; word-break: break-word; line-height: 1.4; tab-size: 2; }
  `;
}
```

- [ ] **Step 4: Add `renderStandalone` public method and `shellStandalone` private method to `src/webview/renderHtml.ts`**

Add `renderStandalone` after the `fragment` method (around line 22):

```typescript
renderStandalone(result: AnalysisResult, rawContent: string = ''): string {
  const { chips, sections } = this.build(result);
  return this.shellStandalone(chips, sections);
}
```

Add `shellStandalone` as a private method after `shell()` (before `section()`):

```typescript
private shellStandalone(chips: string, sections: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EDI Insight - Analysis Result</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  <style>
    ${this.styles()}
  </style>
</head>
<body>
  <div class="toolbar">
    <span class="brand">📊 EDI Insight</span>
    <div class="chips">${chips}</div>
    <div class="actions">
      <button id="btnCopy" class="secondary">Copy JSON</button>
      <button id="btnExpand" class="secondary">Expand all</button>
      <button id="btnCollapse" class="secondary">Collapse all</button>
    </div>
  </div>
  <div class="container">
    <h1>EDI Message Analysis</h1>
    <p class="subtitle">Business-language breakdown of the EDI payment/remittance message.</p>
    <div id="analysis">${sections}</div>
  </div>
  <script>
    (function () {
      function $(id) { return document.getElementById(id); }

      $('btnCopy').addEventListener('click', function () {
        var txt = ($('jsonOutput') || {}).textContent || '';
        var done = function () { var b = $('btnCopy'); b.textContent = 'Copied!'; setTimeout(function () { b.textContent = 'Copy JSON'; }, 1500); };
        if (navigator.clipboard) { navigator.clipboard.writeText(txt).then(done).catch(done); } else { done(); }
      });
      $('btnExpand').addEventListener('click', function () { document.querySelectorAll('details.section').forEach(function (d) { d.open = true; }); });
      $('btnCollapse').addEventListener('click', function () { document.querySelectorAll('details.section').forEach(function (d) { d.open = false; }); });

      var graphId = 0;
      function draw(attempt) {
        var src = document.querySelector('.mermaid-source');
        var target = document.querySelector('.mermaid');
        if (!src || !target) { return; }
        if (typeof mermaid === 'undefined') {
          if ((attempt || 0) < 40) { setTimeout(function () { draw((attempt || 0) + 1); }, 100); }
          else { target.innerHTML = '<pre style="color:#999">Graph unavailable.</pre>'; }
          return;
        }
        var dark = document.body.classList.contains('vscode-dark') || document.body.classList.contains('vscode-high-contrast');
        mermaid.initialize({ startOnLoad: false, theme: dark ? 'dark' : 'default', securityLevel: 'loose' });
        mermaid.render('ediGraph' + (graphId++), src.textContent || '').then(function (res) { target.innerHTML = res.svg; })
          .catch(function (err) { target.innerHTML = '<pre style="color:#e74c3c;white-space:pre-wrap">Graph render error: ' + String(err && err.message ? err.message : err) + '</pre>'; });
      }
      if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', function () { draw(); }); } else { draw(); }
    })();
  </script>
</body>
</html>`;
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test 2>&1 | grep -E "pass|fail|ok|not ok"
```

Expected: all tests pass including the new `renderStandalone` test.

- [ ] **Step 6: Commit**

```bash
git add src/webview/renderHtml.ts src/test/edi.test.ts
git commit -m "feat: add renderStandalone to HtmlRenderer; extract styles() helper"
```

---

### Task 5: ExportService — HTML export

**Files:**
- Modify: `src/exporter/exportService.ts`
- Modify: `src/test/edi.test.ts`

- [ ] **Step 1: Add failing HTML export test at the bottom of `src/test/edi.test.ts`**

```typescript
test('ExportService html delegates to renderStandalone', () => {
  const svc = new ExportService();
  const raw = readSample('820-billpay-test.edi');
  const result = buildResult('820-billpay-test.edi');
  const html = svc.export('html', result, raw, 'test');
  assert.ok(html.startsWith('<!DOCTYPE html>'), 'is full HTML document');
  assert.ok(!html.includes('acquireVsCodeApi'), 'no VS Code API');
  assert.ok(html.includes('cdn.jsdelivr.net'), 'loads Mermaid from CDN');
  assert.ok(html.includes('ABC BILLPAY SERVICE'), 'contains party data');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test 2>&1 | grep -E "html.*delegates|fail|not ok"
```

Expected: HTML export test fails — empty string returned by stub.

- [ ] **Step 3: Replace `toHtml` stub in `src/exporter/exportService.ts`**

```typescript
private toHtml(result: AnalysisResult, rawContent: string): string {
  return new HtmlRenderer().renderStandalone(result, rawContent);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test 2>&1 | grep -E "pass|fail|ok|not ok"
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/exporter/exportService.ts src/test/edi.test.ts
git commit -m "feat: add HTML export to ExportService"
```

---

### Task 6: Extension — wire export message handler

**Files:**
- Modify: `src/extension.ts`

No unit tests for this task (VS Code API not available in test runner). Compile to verify type correctness; manual test in Step 7.

- [ ] **Step 1: Add `path` import and `ExportService` import at the top of `src/extension.ts`**

After the existing imports, add:

```typescript
import * as path from 'path';
import { ExportService, ExportFormat } from './exporter/exportService';
```

- [ ] **Step 2: Add module-scope state variables after `currentSourceUri` declaration**

After line `let currentSourceUri: vscode.Uri | undefined;` add:

```typescript
let currentResult: AnalysisResult | undefined;
let currentRawContent: string = '';
```

- [ ] **Step 3: Store result after analysis in `activate()`**

In the `try` block of `activate()`, replace:

```typescript
      currentSourceUri = editor.document.uri;
      const panel = ensurePanel(context, editor.document.fileName);
      panel.webview.html = new HtmlRenderer().render(analyze(content), content, buildAssets(context, panel.webview));
```

with:

```typescript
      currentSourceUri = editor.document.uri;
      currentResult = analyze(content);
      currentRawContent = content;
      const panel = ensurePanel(context, editor.document.fileName);
      panel.webview.html = new HtmlRenderer().render(currentResult, content, buildAssets(context, panel.webview));
```

- [ ] **Step 4: Add `export` branch in `handleMessage()`**

In `handleMessage()`, after the closing `}` of the `if (msg.type === 'reanalyze')` block and before `if (msg.type === 'save')`, add:

```typescript
  if (msg.type === 'export') {
    await handleExport();
    return;
  }
```

- [ ] **Step 5: Add `handleExport` function after `handleMessage`**

```typescript
async function handleExport(): Promise<void> {
  if (!currentPanel || !currentResult) { return; }

  const formatItems: Array<{ label: string; description: string; format: ExportFormat }> = [
    { label: 'HTML', description: 'Standalone HTML file with embedded styles', format: 'html' },
    { label: 'JSON', description: 'Full analysis result as structured JSON', format: 'json' },
    { label: 'Markdown', description: 'Structured markdown summary with tables', format: 'md' },
    { label: 'CSV', description: 'Tabular data (parties, remittance, segments)', format: 'csv' },
  ];

  const picked = await vscode.window.showQuickPick(formatItems, { placeHolder: 'Choose export format' });
  if (!picked) { return; }

  const baseName = currentSourceUri
    ? (path.basename(currentSourceUri.fsPath).replace(/\.[^.]+$/, ''))
    : 'edi-analysis';

  const filterMap: Record<ExportFormat, Record<string, string[]>> = {
    html: { 'HTML Files': ['html'] },
    json: { 'JSON Files': ['json'] },
    md:   { 'Markdown Files': ['md'] },
    csv:  { 'CSV Files': ['csv'] },
  };

  const defaultUri = currentSourceUri
    ? vscode.Uri.file(path.join(path.dirname(currentSourceUri.fsPath), `${baseName}.analysis.${picked.format}`))
    : undefined;

  const saveUri = await vscode.window.showSaveDialog({ defaultUri, filters: filterMap[picked.format] });
  if (!saveUri) { return; }

  try {
    const output = new ExportService().export(picked.format, currentResult, currentRawContent, baseName);
    await vscode.workspace.fs.writeFile(saveUri, Buffer.from(output, 'utf8'));
    currentPanel.webview.postMessage({ type: 'exported', path: saveUri.fsPath });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    currentPanel.webview.postMessage({ type: 'error', message });
  }
}
```

- [ ] **Step 6: Compile to verify no TypeScript errors**

```bash
npm run compile 2>&1
```

Expected: no errors, `out/` updated.

- [ ] **Step 7: Commit**

```bash
git add src/extension.ts
git commit -m "feat: wire export message handler in extension"
```

---

### Task 7: Webview toolbar — Export button and feedback

**Files:**
- Modify: `src/webview/renderHtml.ts`
- Modify: `src/test/edi.test.ts`

- [ ] **Step 1: Add failing toolbar test at the bottom of `src/test/edi.test.ts`**

```typescript
test('HtmlRenderer render includes Export button and handles exported message', () => {
  const raw = readSample('820-billpay-test.edi');
  const result = buildResult('820-billpay-test.edi');
  const html = new HtmlRenderer().render(result, raw);
  assert.ok(html.includes('id="btnExport"'), 'has Export button element');
  assert.ok(html.includes("type:'export'") || html.includes("type: 'export'"), 'posts export message on click');
  assert.ok(html.includes("'exported'"), 'handles exported confirmation message');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test 2>&1 | grep -E "Export button|fail|not ok"
```

Expected: test fails — no `btnExport` in the rendered HTML.

- [ ] **Step 3: Add Export button to `.actions` div in `shell()` in `src/webview/renderHtml.ts`**

Find this block in `shell()`:

```html
    <div class="actions">
      <button id="btnEdit" class="secondary">Edit Source</button>
      <button id="btnCopy" class="secondary">Copy JSON</button>
```

Replace with:

```html
    <div class="actions">
      <button id="btnEdit" class="secondary">Edit Source</button>
      <button id="btnExport" class="secondary">Export</button>
      <button id="btnCopy" class="secondary">Copy JSON</button>
```

- [ ] **Step 4: Add Export button click handler in `shell()` inline script**

In the inline `<script>` block of `shell()`, after the line:

```javascript
      $('btnEdit').addEventListener('click', function () { panel.classList.toggle('visible'); if (panel.classList.contains('visible')) { ta.focus(); } });
```

Add:

```javascript
      $('btnExport').addEventListener('click', function () { if (vscode) { vscode.postMessage({ type:'export' }); } });
```

- [ ] **Step 5: Add `exported` message handler in `shell()` inline script**

In the `window.addEventListener('message', ...)` handler in `shell()`, find:

```javascript
        else if (m.type === 'rendered') {
```

Before it, add:

```javascript
        else if (m.type === 'exported') { var b = $('btnExport'); var orig = b ? b.textContent : ''; if (b) { b.textContent = 'Exported!'; setTimeout(function () { b.textContent = orig; }, 2000); } }
```

- [ ] **Step 6: Run all tests to verify everything passes**

```bash
npm test 2>&1
```

Expected: all tests pass with no failures.

- [ ] **Step 7: Commit**

```bash
git add src/webview/renderHtml.ts src/test/edi.test.ts
git commit -m "feat: add Export button to webview toolbar with exported feedback"
```
