# EDI Insight — UI Overhaul + Edit Mode

Project root: /home/peyman/Desktop/workstation/vscode-edi-insight-plugin
TypeScript strict, builds out/ via `npm run compile`, tests `npm test` (node:test). No new deps. Offline.

Keep ALL existing analysis sections and data. This is a presentation + interactivity change, plus an edit feature. Do not remove any section content (Message Overview, Environment, Payment Channel, Business Report Detection, Handoff & Output Cadence, Payment Summary, Message Structure, Parties, Contacts, Entities, Notes, Invoice/Remittance, Segment Explanation, Validation Warnings, Raw JSON).

## U1: Theme-native styling (src/webview/renderHtml.ts)
Replace the hardcoded light palette with VS Code theme CSS variables so it matches the user's theme (light/dark/high-contrast). Use these with sensible fallbacks:
  - background: var(--vscode-editor-background)
  - text: var(--vscode-editor-foreground) / var(--vscode-foreground)
  - card/panel bg: var(--vscode-sideBar-background) or color-mix; borders: var(--vscode-panel-border) / var(--vscode-widget-border)
  - accent: var(--vscode-textLink-foreground) / var(--vscode-focusBorder)
  - buttons: background var(--vscode-button-background), color var(--vscode-button-foreground), hover var(--vscode-button-hoverBackground); secondary button var(--vscode-button-secondaryBackground/Foreground)
  - code/pre: var(--vscode-textCodeBlock-background), font var(--vscode-editor-font-family)
  - inputs/textarea: var(--vscode-input-background/foreground/border)
  - badges: subtle, theme-based (use --vscode-badge-background/foreground for neutral; keep yes=greenish, no=reddish, but via low-opacity overlays so they read in dark mode)
Remove the pink/purple gradient summary cards; make summary cards flat theme cards with an accent left-border. Keep the same data.

## U2: Sticky toolbar + verdict chips (top of body)
A sticky header bar (position: sticky; top:0; z-index) containing:
  - Title "EDI Insight"
  - A row of compact "verdict chips" summarizing: transaction code+name, environment (Test/Production/Unknown), payment channel, "Handoff: YES/NO", cadence. Color the environment chip (Test=amber, Production=green, Unknown=grey) and handoff chip (YES=green, NO=red) using theme-friendly tints.
  - Action buttons (right aligned): "Edit Source", "Copy JSON", "Expand all", "Collapse all".
The toolbar must stay visible on scroll.

## U3: Collapsible sections
Render each analysis section as <details class="section" open><summary><h2>...</h2></summary> ...content... </details>.
Keep the first 6 sections open by default (Overview, Environment, Payment Channel, Business Report, Handoff & Cadence, Payment Summary); the rest collapsed (open attribute omitted). "Expand all"/"Collapse all" toolbar buttons toggle every <details>.
Style <summary> to be clickable (cursor pointer), remove default marker clutter, keep the h2 styling.

## U4: Edit Source mode (THE REQUESTED FEATURE)
- Embed the raw EDI source text. Add a new param to HtmlRenderer.render: `render(result: AnalysisResult, rawContent: string): string`. Put rawContent into a <textarea id="ediSource"> inside a hidden edit panel (display:none by default) that sits directly under the toolbar.
- "Edit Source" toolbar button toggles the edit panel visible. Inside the panel:
  - a full-width monospace <textarea> prefilled with rawContent (theme input styling, min-height ~200px, resizable)
  - buttons: "Re-analyze" (primary), "Save to File" (secondary), "Cancel" (hides the panel)
  - a small inline status line for errors/success messages (<div id="editStatus">)
- Client script uses `const vscode = acquireVsCodeApi();`
  - "Re-analyze": vscode.postMessage({ type: 'reanalyze', content: textareaValue })
  - "Save to File": vscode.postMessage({ type: 'save', content: textareaValue })
  - Listen for window 'message' events from extension: { type:'error', message } -> show red in #editStatus; { type:'saved' } -> show green "Saved" in #editStatus.
- Preserve the existing mermaid render script and JSON copy. Set mermaid theme based on body class: if document.body.classList contains 'vscode-dark' or 'vscode-high-contrast' use theme 'dark', else 'default'.

## U5: Copy JSON
"Copy JSON" toolbar button copies the pretty JSON to clipboard via navigator.clipboard.writeText (fallback: select the code-block). Briefly change button label to "Copied!".

## Extension wiring (src/extension.ts)
- Refactor the analysis pipeline into a helper: `function analyze(content: string): AnalysisResult` (parser -> extractor -> classifier -> reportDetector -> segmentGrouper -> outputProfiler -> validator). Reuse it in the command.
- Track the source document for the panel: keep the vscode.Uri of the analyzed document (module-level `currentSourceUri`), set when analyzing.
- Pass rawContent to renderer: renderer.render(result, content).
- Add `currentPanel.webview.onDidReceiveMessage` handler:
  - 'reanalyze': wrap analyze(msg.content) in try/catch. On success: re-render with renderer.render(result, msg.content) and set currentPanel.webview.html. On failure: currentPanel.webview.postMessage({ type:'error', message: errString }).
  - 'save': if currentSourceUri set, open the doc, apply a WorkspaceEdit replacing the entire range with msg.content, save it; then postMessage({ type:'saved' }). On error postMessage error. If no uri, postMessage error "No source file to save to."
  - Register the handler each time the panel is (re)created; ensure it is attached in showWebView. Keep retainContextWhenHidden, enableScripts true.
- showWebView signature may change to accept rawContent if needed for re-render; keep it working.

## Tests
- Update any test that calls renderer.render to pass a rawContent string (e.g. the file content). Add one test asserting render(result, raw) output contains the <textarea id="ediSource"> with the raw content and the 'Edit Source' button and 'acquireVsCodeApi'.
- All existing tests must still pass.

## Constraints
strict TS clean (npm run compile 0 errors), npm test all pass, no new deps, must function offline (mermaid already via CDN script tag — leave as-is). Escape rawContent properly when embedding in the textarea (HTML-escape so '<' '&' don't break markup).
