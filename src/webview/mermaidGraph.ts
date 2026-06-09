import { ExtractedMessage } from '../types';

export class MermaidGraphGenerator {
  generate(extracted: ExtractedMessage): string {
    const nodes: string[] = [];
    const edges: string[] = [];

    // Sanitize label text for Mermaid quoted strings.
    const label = (text: string): string =>
      (text ?? '').replace(/"/g, "'").replace(/[\r\n]+/g, ' ');

    nodes.push('ISA["ISA: Interchange Control Header"]');
    nodes.push(`GS["GS: Functional Group (${label(extracted.functionalGroupCode || '?')})"]`);
    nodes.push(`ST["ST: Transaction Set (${label(extracted.transactionType || '?')})"]`);

    edges.push('ISA --> GS');
    edges.push('GS --> ST');

    if (extracted.paymentAmount) {
      nodes.push(`BPR["BPR: Payment Info<br/>Amount: ${label(extracted.paymentAmount)}<br/>Method: ${label(extracted.paymentMethod || '')}"]`);
    } else {
      nodes.push('BPR["BPR: Payment Info"]');
    }
    edges.push('ST --> BPR');

    if (extracted.traceNumber) {
      nodes.push(`TRN["TRN: Trace Info<br/>Trace: ${label(extracted.traceNumber)}"]`);
    } else {
      nodes.push('TRN["TRN: Trace Info"]');
    }
    edges.push('ST --> TRN');

    if (extracted.parties.length > 0) {
      extracted.parties.forEach((party, idx) => {
        const partyLabel = party.code === 'PR' ? 'Payer' : party.code === 'PE' ? 'Payee' : party.code;
        nodes.push(`N1_${idx}["N1: ${label(partyLabel)}<br/>${label(party.name)}"]`);
        edges.push(`ST --> N1_${idx}`);
      });
    } else {
      nodes.push('N1["N1: Party Identification"]');
      edges.push('ST --> N1');
    }

    if (extracted.remittanceDetails.length > 0) {
      nodes.push(`RMR["RMR: Remittance Info<br/>Invoice: ${label(extracted.remittanceDetails[0].invoiceNumber || '')}"]`);
    } else {
      nodes.push('RMR["RMR: Remittance Info"]');
    }
    edges.push('ST --> RMR');

    if (extracted.paymentDate) {
      nodes.push(`DTM["DTM: Date Info<br/>Date: ${label(extracted.paymentDate)}"]`);
    } else {
      nodes.push('DTM["DTM: Date/Time Reference"]');
    }
    edges.push('ST --> DTM');

    nodes.push(`SE["SE: Transaction Set Trailer<br/>Segments: ${extracted.segmentCount}"]`);
    nodes.push('GE["GE: Functional Group Trailer"]');
    nodes.push('IEA["IEA: Interchange Trailer"]');
    edges.push('ST --> SE');
    edges.push('GS --> GE');
    edges.push('ISA --> IEA');

    return ['graph TD', ...nodes.map(n => '  ' + n), ...edges.map(e => '  ' + e)].join('\n');
  }
}
