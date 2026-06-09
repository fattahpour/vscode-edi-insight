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

  private toHtml(result: AnalysisResult, rawContent: string): string {
    return new HtmlRenderer().renderStandalone(result, rawContent);
  }
}
