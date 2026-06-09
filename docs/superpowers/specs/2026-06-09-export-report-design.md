# Export Report Feature Design

**Date:** 2026-06-09  
**Status:** Approved

## Overview

Add multi-format report export to the EDI Insight VS Code extension. Users can export the full analysis of an EDI file as HTML, JSON, Markdown, or CSV via a single "Export" button in the webview toolbar.

## Trigger & UX Flow

1. User clicks **Export** button in webview toolbar.
2. Webview sends `{ type: 'export' }` via `postMessage` to extension.
3. Extension shows native `vscode.window.showQuickPick` with four format options: HTML, JSON, Markdown, CSV.
4. Extension shows `vscode.window.showSaveDialog` pre-filled with default filename derived from source file basename (e.g. `invoice.edi.analysis.html`).
5. `ExportService` converts `currentResult` + `currentRawContent` to chosen format.
6. Extension writes file to chosen path via `fs.writeFile`.
7. Extension posts `{ type: 'exported', path }` back to webview.
8. Webview shows brief success toast (reuses existing `editStatus` element style).

No new VS Code commands registered. No `package.json` changes required.

## Format Specifications

### JSON
- Content: `JSON.stringify(currentResult, null, 2)`
- Default filename: `<basename>.analysis.json`
- File filter: `{ 'JSON': ['json'] }`

### CSV
- Content: multiple sections in one file, separated by blank lines
- Sections (each with its own column headers):
  - Parties: `Code, Name`
  - Contacts: `Name, Communication, Alternate Communication`
  - Entities: `Assigned Number, Entity Code, Identification, Additional Entity Code`
  - Remittance Details: `Invoice Number, Paid Amount`
  - Segment Explanation: `Segment, Position, Name, Value`
- Default filename: `<basename>.analysis.csv`
- File filter: `{ 'CSV': ['csv'] }`

### Markdown
- Structure mirrors webview sections using `##` headings
- Top: summary code block with chips data (message type, env, payment channel, handoff, cadence)
- Tables use GitHub-flavored markdown pipe syntax
- Message Structure section: Mermaid source as fenced ` ```mermaid ``` ` code block
- Default filename: `<basename>.analysis.md`
- File filter: `{ 'Markdown': ['md'] }`

### HTML
- Full standalone page reusing all CSS from `renderHtml.ts`
- Differences from live webview:
  - No CSP `<meta>` tag, no nonce
  - Mermaid loaded via CDN `<script>` (acceptable for exported file; live webview stays offline)
  - Toolbar action buttons: Export and Copy JSON remain; Edit Source / Re-analyze / Save to File removed (require VS Code API)
  - No `acquireVsCodeApi` call in inline script
- Default filename: `<basename>.analysis.html`
- File filter: `{ 'HTML': ['html'] }`

## Architecture

### New File: `src/exporter/exportService.ts`

```
ExportService
  export(format: 'html'|'json'|'md'|'csv', result: AnalysisResult, rawContent: string, sourceName: string): string
    → toJson(result)
    → toCsv(result)
    → toMarkdown(result, rawContent, sourceName)
    → toHtml(result, rawContent)
```

`toHtml()` delegates to `HtmlRenderer.renderStandalone()`.

### Modified: `src/webview/renderHtml.ts`

Add `renderStandalone(result: AnalysisResult, rawContent: string): string`:
- Same content as `render()` minus `WebviewAssets` param
- CDN mermaid script tag instead of local URI
- Toolbar omits Edit Source / Re-analyze / Save to File buttons
- No nonce, no CSP meta tag

### Modified: `src/extension.ts`

Module-scope additions:
```typescript
let currentResult: AnalysisResult | undefined;
let currentRawContent: string = '';
```

`handleMessage()` additions:
- `type === 'export'`: QuickPick → SaveDialog → ExportService → fs.writeFile → post `exported`

`activate()` update:
- After `analyze(content)` succeeds, store result in `currentResult` and `currentRawContent`.

### Modified: `src/webview/renderHtml.ts` (shell/toolbar)

- Add `<button id="btnExport" class="secondary">Export</button>` to `.actions` div
- Inline script: `btnExport` click → `vscode.postMessage({ type: 'export' })`
- Message handler: `m.type === 'exported'` → show `'Exported: ' + m.path` in status element

## Error Handling

- User cancels QuickPick or SaveDialog: silently abort, no message posted.
- Write failure: post `{ type: 'error', message }` to webview (reuses existing error display).
- No `currentResult` available (export triggered before any analysis): QuickPick is only reachable after a successful analysis since the button only exists in the rendered webview.

## Out of Scope

- ZIP export bundling multiple formats at once
- Configurable export folder in extension settings
- Command palette entry for export
- PDF export
