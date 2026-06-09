import { ExtractedMessage } from '../types';

export class MermaidGraphGenerator {
  generate(extracted: ExtractedMessage): string {
    let diagram = 'graph TD\n';
    diagram += '  ISA["ISA: Interchange Control Header"]\n';
    diagram += `    --> GS["GS: Functional Group<br/>(${extracted.functionalGroupCode})"]\n`;
    diagram += `      --> ST["ST: Transaction Set<br/>(${extracted.transactionType})"]\n`;

    if (extracted.paymentAmount) {
      diagram += `        --> BPR["BPR: Payment Info<br/>Amount: ${extracted.paymentAmount}<br/>Method: ${extracted.paymentMethod}"]\n`;
    } else {
      diagram += `        --> BPR["BPR: Payment Info"]\n`;
    }

    if (extracted.traceNumber) {
      diagram += `      --> TRN["TRN: Trace Info<br/>Trace: ${extracted.traceNumber}"]\n`;
    } else {
      diagram += `      --> TRN["TRN: Trace Info"]\n`;
    }

    if (extracted.parties.length > 0) {
      extracted.parties.forEach((party, idx) => {
        const partyLabel = party.code === 'PR' ? 'Payer' : party.code === 'PE' ? 'Payee' : party.code;
        diagram += `      --> N1_${idx}["N1: ${partyLabel}<br/>${party.name}"]\n`;
      });
    } else {
      diagram += `      --> N1["N1: Party Identification"]\n`;
    }

    if (extracted.remittanceDetails.length > 0) {
      diagram += `      --> RMR["RMR: Remittance Info<br/>Invoice: ${extracted.remittanceDetails[0].invoiceNumber}"]\n`;
    } else {
      diagram += `      --> RMR["RMR: Remittance Info"]\n`;
    }

    if (extracted.paymentDate) {
      diagram += `      --> DTM["DTM: Date Info<br/>Date: ${extracted.paymentDate}"]\n`;
    } else {
      diagram += `      --> DTM["DTM: Date/Time Reference"]\n`;
    }

    diagram += `      --> SE["SE: Transaction Set Trailer<br/>Segments: ${extracted.segmentCount}"]\n`;
    diagram += `        --> GE["GE: Functional Group Trailer"]\n`;
    diagram += `          --> IEA["IEA: Interchange Trailer"]\n`;

    return diagram;
  }
}
