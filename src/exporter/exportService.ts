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

  private toMarkdown(_result: AnalysisResult, _sourceName: string): string { return ''; }

  private toHtml(_result: AnalysisResult, _rawContent: string): string { return ''; }
}
