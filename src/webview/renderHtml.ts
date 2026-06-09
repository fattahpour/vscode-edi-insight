import { AnalysisResult } from '../types';
import { SegmentExplainer } from '../analyzer/segmentExplainer';
import { MermaidGraphGenerator } from './mermaidGraph';

export class HtmlRenderer {
  render(result: AnalysisResult): string {
    const graphGen = new MermaidGraphGenerator();
    const segmentExplainer = new SegmentExplainer();
    const diagram = graphGen.generate(result.extracted);

    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EDI Insight - Analysis Result</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .section { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #2c3e50; margin-bottom: 10px; font-size: 28px; }
    h2 { color: #34495e; margin-top: 20px; margin-bottom: 15px; border-bottom: 2px solid #3498db; padding-bottom: 10px; font-size: 20px; }
    .header-info { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin-bottom: 20px; }
    .info-box { padding: 15px; border-left: 4px solid #3498db; background: #ecf0f1; border-radius: 4px; }
    .info-label { font-weight: bold; color: #2c3e50; margin-bottom: 5px; font-size: 12px; text-transform: uppercase; }
    .info-value { color: #34495e; font-size: 16px; word-break: break-all; }
    .status-test { border-left-color: #f39c12; }
    .status-production { border-left-color: #27ae60; }
    .status-unknown { border-left-color: #95a5a6; }
    .warning { padding: 15px; margin-bottom: 15px; border-left: 4px solid; border-radius: 4px; background-color: #fef5e7; }
    .warning.error { border-left-color: #e74c3c; background-color: #fadbd8; }
    .warning.info { border-left-color: #3498db; background-color: #d6eaf8; }
    .warning-title { font-weight: bold; margin-bottom: 5px; }
    .warning.error .warning-title { color: #c0392b; }
    .warning.warning .warning-title { color: #d68910; }
    .warning.info .warning-title { color: #2980b9; }
    .warning-segments { font-size: 12px; margin-top: 5px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 14px; }
    thead { background: #34495e; color: white; }
    th { padding: 12px; text-align: left; font-weight: bold; }
    td { padding: 12px; border-bottom: 1px solid #ecf0f1; }
    tbody tr:hover { background: #f8f9fa; }
    .mermaid { display: flex; justify-content: center; margin: 20px 0; overflow-x: auto; }
    .report-list { list-style: none; }
    .report-list li { padding: 15px; margin-bottom: 15px; border: 1px solid #bdc3c7; border-radius: 4px; background: #f8f9fa; }
    .report-title { font-weight: bold; color: #2c3e50; margin-bottom: 8px; font-size: 16px; }
    .report-reason { color: #7f8c8d; font-size: 13px; margin-bottom: 10px; }
    .report-fields { color: #34495e; font-size: 13px; margin-bottom: 8px; }
    .report-example { background: white; padding: 10px; border-left: 3px solid #3498db; font-family: monospace; font-size: 12px; overflow-x: auto; }
    .code-block { background: #2c3e50; color: #ecf0f1; padding: 15px; border-radius: 4px; overflow-x: auto; font-family: 'Courier New', monospace; font-size: 13px; margin-bottom: 15px; }
    .no-data { color: #7f8c8d; font-style: italic; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; margin-right: 5px; margin-bottom: 5px; }
    .badge-segment { background: #ecf0f1; color: #2c3e50; }
    .payment-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px; }
    .summary-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
    .summary-card.amount { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
    .summary-card.date { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
    .summary-card.method { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
    .summary-label { font-size: 12px; opacity: 0.9; text-transform: uppercase; margin-bottom: 8px; }
    .summary-value { font-size: 24px; font-weight: bold; word-break: break-all; }
  </style>
</head>
<body>
  <div class="container">
    <div class="section"><h1>📊 EDI Message Analysis</h1><p>Detailed analysis of EDI payment/remittance message</p></div>`;

    html += '<div class="section"><h2>Message Overview</h2><div class="header-info">';
    html += `<div class="info-box"><div class="info-label">Message Type</div><div class="info-value">${this.escape(result.classification.messageType)}</div></div>`;
    html += `<div class="info-box"><div class="info-label">Description</div><div class="info-value">${this.escape(result.classification.description)}</div></div>`;
    html += `<div class="info-box"><div class="info-label">Sender ID</div><div class="info-value">${this.escape(result.extracted.senderId || 'N/A')}</div></div>`;
    html += `<div class="info-box"><div class="info-label">Receiver ID</div><div class="info-value">${this.escape(result.extracted.receiverId || 'N/A')}</div></div>`;
    html += '</div></div>';

    html += '<div class="section"><h2>Environment</h2><div class="header-info">';
    html += `<div class="info-box status-${result.classification.environment.toLowerCase()}"><div class="info-label">Status</div><div class="info-value">${result.classification.environment}</div></div>`;
    html += '</div></div>';

    html += '<div class="section"><h2>Payment Channel Detection</h2><div class="header-info">';
    html += `<div class="info-box"><div class="info-label">Detected Channel</div><div class="info-value">${this.escape(result.classification.paymentChannel)}</div></div>`;
    html += `<div class="info-box"><div class="info-label">Payment Method</div><div class="info-value">${this.escape(result.extracted.paymentMethod || 'N/A')}</div></div>`;
    html += `<div class="info-box"><div class="info-label">Payment Format</div><div class="info-value">${this.escape(result.extracted.paymentFormat || 'N/A')}</div></div>`;
    html += '</div></div>';

    html += '<div class="section"><h2>Business Report Detection</h2>';
    if (result.reports.length > 0) {
      html += '<ul class="report-list">';
      for (const report of result.reports) {
        html += '<li><div class="report-title">' + this.escape(report.name) + '</div>';
        html += '<div class="report-reason"><strong>Reason:</strong> ' + this.escape(report.reason) + '</div>';
        html += '<div class="report-fields"><strong>Source Segments:</strong> ';
        for (const seg of report.sourceSegments) {
          html += '<span class="badge badge-segment">' + seg + '</span>';
        }
        html += '</div>';
        html += '<div class="report-fields"><strong>Key Fields:</strong> ' + this.escape(report.keyFields.join(', ')) + '</div>';
        html += '<div class="report-example"><strong>Example Output:</strong><br/>' + this.escape(report.exampleRow) + '</div>';
        html += '</li>';
      }
      html += '</ul>';
    } else {
      html += '<p class="no-data">No reports detected for this message.</p>';
    }
    html += '</div>';

    html += '<div class="section"><h2>Payment Summary</h2><div class="payment-summary">';
    html += `<div class="summary-card amount"><div class="summary-label">Amount</div><div class="summary-value">${this.escape(result.extracted.paymentAmount || 'N/A')}</div></div>`;
    html += `<div class="summary-card date"><div class="summary-label">Payment Date</div><div class="summary-value">${this.escape(result.extracted.paymentDate || 'N/A')}</div></div>`;
    html += `<div class="summary-card method"><div class="summary-label">Trace Number</div><div class="summary-value">${this.escape(result.extracted.traceNumber || 'N/A')}</div></div>`;
    html += '</div></div>';

    html += '<div class="section"><h2>Message Structure</h2><div class="mermaid">' + diagram + '</div></div>';

    html += '<div class="section"><h2>Parties</h2>';
    if (result.extracted.parties.length > 0) {
      html += '<table><thead><tr><th>Code</th><th>Name</th></tr></thead><tbody>';
      for (const party of result.extracted.parties) {
        html += `<tr><td>${this.escape(party.code)}</td><td>${this.escape(party.name)}</td></tr>`;
      }
      html += '</tbody></table>';
    } else {
      html += '<p class="no-data">No party information found.</p>';
    }
    html += '</div>';

    html += '<div class="section"><h2>Contacts</h2>';
    if ((result.extracted.contacts ?? []).length > 0) {
      html += '<table><thead><tr><th>Name</th><th>Communication</th><th>Alternate Communication</th></tr></thead><tbody>';
      for (const contact of result.extracted.contacts ?? []) {
        const communication = [contact.communicationQualifier, contact.communicationNumber].filter(Boolean).join(': ');
        const alternateCommunication = [contact.alternateCommunicationQualifier, contact.alternateCommunicationNumber].filter(Boolean).join(': ');
        html += `<tr><td>${this.escape(contact.name || 'N/A')}</td><td>${this.escape(communication || 'N/A')}</td><td>${this.escape(alternateCommunication || 'N/A')}</td></tr>`;
      }
      html += '</tbody></table>';
    } else {
      html += '<p class="no-data">No contact information found.</p>';
    }
    html += '</div>';

    html += '<div class="section"><h2>Entities</h2>';
    if ((result.extracted.entities ?? []).length > 0) {
      html += '<table><thead><tr><th>Assigned Number</th><th>Entity Code</th><th>Identification</th><th>Additional Entity Code</th></tr></thead><tbody>';
      for (const entity of result.extracted.entities ?? []) {
        const identification = [entity.identificationCodeQualifier, entity.identificationCode].filter(Boolean).join(': ');
        html += `<tr><td>${this.escape(entity.assignedNumber || 'N/A')}</td><td>${this.escape(entity.entityIdentifierCode || 'N/A')}</td><td>${this.escape(identification || 'N/A')}</td><td>${this.escape(entity.additionalEntityIdentifierCode || 'N/A')}</td></tr>`;
      }
      html += '</tbody></table>';
    } else {
      html += '<p class="no-data">No entity information found.</p>';
    }
    html += '</div>';

    html += '<div class="section"><h2>Notes</h2>';
    if ((result.extracted.notes ?? []).length > 0) {
      html += '<table><thead><tr><th>Reference Code</th><th>Text</th></tr></thead><tbody>';
      for (const note of result.extracted.notes ?? []) {
        html += `<tr><td>${this.escape(note.referenceCode || 'N/A')}</td><td>${this.escape(note.text)}</td></tr>`;
      }
      html += '</tbody></table>';
    } else {
      html += '<p class="no-data">No notes found.</p>';
    }
    html += '</div>';

    html += '<div class="section"><h2>Invoice / Remittance Details</h2>';
    if (result.extracted.remittanceDetails.length > 0) {
      html += '<table><thead><tr><th>Invoice Number</th><th>Paid Amount</th></tr></thead><tbody>';
      for (const detail of result.extracted.remittanceDetails) {
        html += `<tr><td>${this.escape(detail.invoiceNumber || 'N/A')}</td><td>${this.escape(detail.paidAmount || 'N/A')}</td></tr>`;
      }
      html += '</tbody></table>';
    } else {
      html += '<p class="no-data">No remittance details found.</p>';
    }
    html += '</div>';

    html += '<div class="section"><h2>Segment Explanation</h2><table><thead><tr><th>Segment</th><th>Position</th><th>Name</th><th>Value</th></tr></thead><tbody>';
    for (const segment of result.extracted.allSegments) {
      const rows = segmentExplainer.explain(segment);
      for (const row of rows) {
        html += `<tr><td><strong>${this.escape(segment.tag)}</strong></td><td>${this.escape(`${segment.tag}${String(row.position).padStart(2, '0')}`)}</td><td>${this.escape(row.name)}</td><td><code>${this.escape(row.value)}</code></td></tr>`;
      }
    }
    html += '</tbody></table></div>';

    html += '<div class="section"><h2>Validation Warnings</h2>';
    if (result.warnings.length > 0) {
      for (const warning of result.warnings) {
        const icon = warning.severity === 'error' ? '❌ Error' : warning.severity === 'warning' ? '⚠️ Warning' : 'ℹ️ Info';
        html += `<div class="warning ${warning.severity}"><div class="warning-title">${icon}: ${this.escape(warning.message)}</div><div class="warning-segments">Affected: ${warning.affectedSegments.join(', ')}</div></div>`;
      }
    } else {
      html += '<p class="no-data">✅ No validation warnings found.</p>';
    }
    html += '</div>';

    html += '<div class="section"><h2>Raw JSON Output</h2><div class="code-block">' + this.escape(JSON.stringify(result, null, 2)) + '</div></div>';

    html += `</div>
  <script>
    mermaid.initialize({ startOnLoad: true, theme: 'default' });
    const diagramCode = \`${diagram.replace(/`/g, '\\`')}\`;
    mermaid.render('mermaidDiagram', diagramCode).then(({ svg }) => {
      const mermaidDiv = document.querySelector('.mermaid');
      mermaidDiv.innerHTML = svg;
    }).catch(err => {
      console.error('Mermaid error:', err);
    });
  </script>
</body>
</html>`;

    return html;
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
