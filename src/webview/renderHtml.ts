import { AnalysisResult } from '../types';
import { SegmentExplainer } from '../analyzer/segmentExplainer';
import { MermaidGraphGenerator } from './mermaidGraph';

export interface WebviewAssets {
  mermaidUri: string;   // webview URI for the locally-bundled mermaid script
  cspSource: string;    // webview.cspSource
  nonce: string;        // per-render nonce for inline script
}

export class HtmlRenderer {
  render(result: AnalysisResult, rawContent: string = '', assets?: WebviewAssets): string {
    const { chips, sections } = this.build(result);
    return this.shell(chips, sections, this.escape(rawContent), assets);
  }

  // Rendered chips + analysis body, used for in-place updates (re-analyze)
  // without reloading the whole webview page.
  fragment(result: AnalysisResult): { chips: string; sections: string } {
    return this.build(result);
  }

  private build(result: AnalysisResult): { chips: string; sections: string } {
    const graphGen = new MermaidGraphGenerator();
    const segmentExplainer = new SegmentExplainer();
    const diagram = graphGen.generate(result.extracted);
    const e = (t: string | undefined) => this.escape(t);

    // --- Verdict chips (at-a-glance summary in the toolbar) ---
    const env = result.classification.environment;
    const envClass = env === 'Test' ? 'chip-test' : env === 'Production' ? 'chip-prod' : 'chip-unknown';
    const handoff = result.outputProfile.hasHandoffReport;
    const chips =
      `<span class="chip chip-accent">${e(result.classification.messageCode)} · ${e(result.classification.description.replace(/^X12 \d+ - /, ''))}</span>` +
      `<span class="chip ${envClass}">${e(env)}</span>` +
      `<span class="chip">${e(result.classification.paymentChannel)}</span>` +
      `<span class="chip ${handoff ? 'chip-yes' : 'chip-no'}">Handoff: ${handoff ? 'YES' : 'NO'}</span>` +
      `<span class="chip">${e(result.outputProfile.cadence)}</span>`;

    // --- Sections ---
    const sections: string[] = [];

    sections.push(this.section('Message Overview', true,
      '<div class="grid">' +
      this.box('Message Type', e(result.classification.messageType)) +
      this.box('Description', e(result.classification.description)) +
      this.box('Sender ID', e(result.extracted.senderId || 'N/A')) +
      this.box('Receiver ID', e(result.extracted.receiverId || 'N/A')) +
      '</div>'));

    sections.push(this.section('Environment', true,
      `<div class="grid"><div class="box accent-${env.toLowerCase()}"><div class="label">Status</div><div class="value">${e(env)}</div></div></div>`));

    sections.push(this.section('Payment Channel Detection', true,
      '<div class="grid">' +
      this.box('Detected Channel', e(result.classification.paymentChannel)) +
      this.box('Payment Method', e(result.extracted.paymentMethod || 'N/A')) +
      this.box('Payment Format', e(result.extracted.paymentFormat || 'N/A')) +
      '</div>'));

    let reportsHtml = '';
    if (result.reports.length > 0) {
      reportsHtml += '<ul class="report-list">';
      for (const report of result.reports) {
        reportsHtml += '<li><div class="report-title">' + e(report.name) + '</div>';
        reportsHtml += '<div class="muted"><strong>Reason:</strong> ' + e(report.reason) + '</div>';
        reportsHtml += '<div class="muted"><strong>Source Segments:</strong> ' +
          report.sourceSegments.map(s => `<span class="badge">${e(s)}</span>`).join('') + '</div>';
        reportsHtml += '<div class="muted"><strong>Key Fields:</strong> ' + e(report.keyFields.join(', ')) + '</div>';
        reportsHtml += '<div class="report-example"><strong>Example Output:</strong><br/>' + e(report.exampleRow) + '</div></li>';
      }
      reportsHtml += '</ul>';
    } else {
      reportsHtml = '<p class="no-data">No reports detected for this message.</p>';
    }
    sections.push(this.section('Business Report Detection', true, reportsHtml));

    let profHtml = '<div class="grid">';
    profHtml += '<div class="box"><div class="label">Downstream Handoff Report</div>' +
      `<div style="margin:6px 0"><span class="badge ${handoff ? 'badge-yes' : 'badge-no'}">${handoff ? 'YES' : 'NO'}</span></div>` +
      '<div class="muted"><strong>Handoff Reports:</strong></div>' +
      (result.outputProfile.handoffReports.length
        ? '<ul>' + result.outputProfile.handoffReports.map(r => `<li>${e(r)}</li>`).join('') + '</ul>'
        : '<p class="no-data">None.</p>') +
      '<div class="muted"><strong>Status Reports:</strong></div>' +
      (result.outputProfile.statusReports.length
        ? '<ul>' + result.outputProfile.statusReports.map(r => `<li>${e(r)}</li>`).join('') + '</ul>'
        : '<p class="no-data">None.</p>') +
      '</div>';
    profHtml += '<div class="box"><div class="label">Estimated Cadence</div>' +
      `<div class="cadence">${e(result.outputProfile.cadence)}</div>` +
      `<span class="badge badge-info">${e(result.outputProfile.confidence)} confidence</span>` +
      `<p class="muted" style="margin-top:8px"><strong>Estimated:</strong> ${e(result.outputProfile.cadenceReason)}</p></div>`;
    profHtml += '</div>';
    sections.push(this.section('Handoff &amp; Output Cadence', true, profHtml));

    sections.push(this.section('Payment Summary', true,
      '<div class="grid">' +
      this.summaryCard('Amount', e(result.extracted.paymentAmount || 'N/A')) +
      this.summaryCard('Payment Date', e(result.extracted.paymentDate || 'N/A')) +
      this.summaryCard('Trace Number', e(result.extracted.traceNumber || 'N/A')) +
      '</div>'));

    sections.push(this.section('Message Structure', false,
      '<div class="mermaid"></div><pre class="mermaid-source" style="display:none">' + e(diagram) + '</pre>'));

    sections.push(this.section('Parties', false,
      result.extracted.parties.length
        ? this.table(['Code', 'Name'], result.extracted.parties.map(p => [e(p.code), e(p.name)]))
        : '<p class="no-data">No party information found.</p>'));

    const contacts = result.extracted.contacts ?? [];
    sections.push(this.section('Contacts', false,
      contacts.length
        ? this.table(['Name', 'Communication', 'Alternate Communication'], contacts.map(c => [
            e(c.name || 'N/A'),
            e([c.communicationQualifier, c.communicationNumber].filter(Boolean).join(': ') || 'N/A'),
            e([c.alternateCommunicationQualifier, c.alternateCommunicationNumber].filter(Boolean).join(': ') || 'N/A')
          ]))
        : '<p class="no-data">No contact information found.</p>'));

    const entities = result.extracted.entities ?? [];
    sections.push(this.section('Entities', false,
      entities.length
        ? this.table(['Assigned Number', 'Entity Code', 'Identification', 'Additional Entity Code'], entities.map(en => [
            e(en.assignedNumber || 'N/A'),
            e(en.entityIdentifierCode || 'N/A'),
            e([en.identificationCodeQualifier, en.identificationCode].filter(Boolean).join(': ') || 'N/A'),
            e(en.additionalEntityIdentifierCode || 'N/A')
          ]))
        : '<p class="no-data">No entity information found.</p>'));

    const notes = result.extracted.notes ?? [];
    sections.push(this.section('Notes', false,
      notes.length
        ? this.table(['Reference Code', 'Text'], notes.map(n => [e(n.referenceCode || 'N/A'), e(n.text)]))
        : '<p class="no-data">No notes found.</p>'));

    sections.push(this.section('Invoice / Remittance Details', false,
      result.extracted.remittanceDetails.length
        ? this.table(['Invoice Number', 'Paid Amount'], result.extracted.remittanceDetails.map(d => [e(d.invoiceNumber || 'N/A'), e(d.paidAmount || 'N/A')]))
        : '<p class="no-data">No remittance details found.</p>'));

    let segHtml = '';
    for (const group of result.segmentGroups) {
      segHtml += '<div class="segment-group"><h3>' + e(group.name) + '</h3>';
      segHtml += '<p class="muted">' + e(group.description) + '</p>';
      const rows: string[][] = [];
      for (const segment of group.segments) {
        for (const row of segmentExplainer.explain(segment)) {
          rows.push([
            `<strong>${e(segment.tag)}</strong>`,
            e(`${segment.tag}${String(row.position).padStart(2, '0')}`),
            e(row.name),
            `<code>${e(row.value)}</code>`
          ]);
        }
      }
      segHtml += this.table(['Segment', 'Position', 'Name', 'Value'], rows, true);
      segHtml += '</div>';
    }
    sections.push(this.section('Segment Explanation', false, segHtml));

    let warnHtml = '';
    if (result.warnings.length) {
      for (const w of result.warnings) {
        const icon = w.severity === 'error' ? '❌ Error' : w.severity === 'warning' ? '⚠️ Warning' : 'ℹ️ Info';
        warnHtml += `<div class="warning ${w.severity}"><div class="warning-title">${icon}: ${e(w.message)}</div><div class="muted">Affected: ${e(w.affectedSegments.join(', '))}</div></div>`;
      }
    } else {
      warnHtml = '<p class="no-data">✅ No validation warnings found.</p>';
    }
    sections.push(this.section('Validation Warnings', false, warnHtml));

    sections.push(this.section('Raw JSON Output', false,
      '<pre class="code-block" id="jsonOutput">' + e(JSON.stringify(result, null, 2)) + '</pre>'));

    return { chips, sections: sections.join('\n') };
  }

  // ---- building blocks ----

  private section(title: string, open: boolean, inner: string): string {
    return `<details class="section"${open ? ' open' : ''}><summary><h2>${title}</h2></summary><div class="section-body">${inner}</div></details>`;
  }

  private box(label: string, value: string): string {
    return `<div class="box"><div class="label">${label}</div><div class="value">${value}</div></div>`;
  }

  private summaryCard(label: string, value: string): string {
    return `<div class="box summary"><div class="label">${label}</div><div class="value big">${value}</div></div>`;
  }

  private table(headers: string[], rows: string[][], rawCells = false): string {
    let h = '<table><thead><tr>' + headers.map(x => `<th>${x}</th>`).join('') + '</tr></thead><tbody>';
    for (const r of rows) {
      h += '<tr>' + r.map(c => `<td>${rawCells ? c : c}</td>`).join('') + '</tr>';
    }
    return h + '</tbody></table>';
  }

  private shell(chips: string, sections: string, rawContentEscaped: string, assets?: WebviewAssets): string {
    // Strict CSP: default-src 'none' blocks ALL network (no connect/fetch/img/font
    // from anywhere). Scripts run only from the extension bundle (cspSource) plus our
    // nonced inline script. No data ever leaves or enters the webview.
    const nonce = assets?.nonce ?? '';
    const csp = assets
      ? `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${assets.cspSource} data:; style-src ${assets.cspSource} 'unsafe-inline'; font-src ${assets.cspSource}; script-src 'nonce-${nonce}' ${assets.cspSource};">`
      : '';
    const mermaidScript = assets
      ? `<script defer nonce="${nonce}" src="${assets.mermaidUri}"></script>`
      : '';
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${csp}
  <title>EDI Insight - Analysis Result</title>
  ${mermaidScript}
  <style>
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
  </style>
</head>
<body>
  <div class="toolbar">
    <span class="brand">📊 EDI Insight</span>
    <div class="chips" id="chips">${chips}</div>
    <div class="actions">
      <button id="btnEdit" class="secondary">Edit Source</button>
      <button id="btnCopy" class="secondary">Copy JSON</button>
      <button id="btnExpand" class="secondary">Expand all</button>
      <button id="btnCollapse" class="secondary">Collapse all</button>
    </div>
  </div>
  <div class="container">
    <div class="edit-panel" id="editPanel">
      <h3>Edit EDI Source</h3>
      <textarea id="ediSource" spellcheck="false">${rawContentEscaped}</textarea>
      <div class="edit-actions">
        <button id="btnReanalyze">Re-analyze</button>
        <button id="btnSave" class="secondary">Save to File</button>
        <button id="btnCancel" class="secondary">Cancel</button>
        <span id="editStatus"></span>
      </div>
    </div>
    <h1>EDI Message Analysis</h1>
    <p class="subtitle">Business-language breakdown of the EDI payment/remittance message.</p>
    <div id="analysis">${sections}</div>
  </div>
  <script nonce="${nonce}">
    (function () {
      var vscode = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : null;
      function $(id) { return document.getElementById(id); }
      var panel = $('editPanel'), status = $('editStatus'), ta = $('ediSource');

      $('btnEdit').addEventListener('click', function () { panel.classList.toggle('visible'); if (panel.classList.contains('visible')) { ta.focus(); } });
      $('btnCancel').addEventListener('click', function () { panel.classList.remove('visible'); status.textContent=''; });
      $('btnReanalyze').addEventListener('click', function () { if (vscode) { status.textContent='Re-analyzing…'; status.className=''; vscode.postMessage({ type:'reanalyze', content: ta.value }); } });
      $('btnSave').addEventListener('click', function () { if (vscode) { vscode.postMessage({ type:'save', content: ta.value }); } });

      $('btnCopy').addEventListener('click', function () {
        var txt = ($('jsonOutput') || {}).textContent || '';
        var done = function () { var b = $('btnCopy'); b.textContent='Copied!'; setTimeout(function(){ b.textContent='Copy JSON'; }, 1500); };
        if (navigator.clipboard) { navigator.clipboard.writeText(txt).then(done).catch(done); } else { done(); }
      });
      $('btnExpand').addEventListener('click', function () { document.querySelectorAll('details.section').forEach(function(d){ d.open=true; }); });
      $('btnCollapse').addEventListener('click', function () { document.querySelectorAll('details.section').forEach(function(d){ d.open=false; }); });

      window.addEventListener('message', function (ev) {
        var m = ev.data || {};
        if (m.type === 'error') { status.textContent = 'Error: ' + m.message; status.className = 'err'; }
        else if (m.type === 'saved') { status.textContent = 'Saved to file.'; status.className = 'ok'; }
        else if (m.type === 'rendered') {
          $('chips').innerHTML = m.chips;
          $('analysis').innerHTML = m.sections;
          status.textContent = 'Re-analyzed.'; status.className = 'ok';
          draw();
        }
      });

      var graphId = 0;
      function draw(attempt) {
        var src = document.querySelector('.mermaid-source');
        var target = document.querySelector('.mermaid');
        if (!src || !target) { return; }
        if (typeof mermaid === 'undefined') {
          // Deferred CDN script not ready yet — retry briefly, then give up gracefully.
          if ((attempt || 0) < 40) { setTimeout(function () { draw((attempt || 0) + 1); }, 100); }
          else { target.innerHTML = '<pre style="color:#999">Graph unavailable (Mermaid failed to load).</pre>'; }
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

  private escape(text: string | undefined): string {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
