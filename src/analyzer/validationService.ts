import { ExtractedMessage, ValidationWarning } from '../types';

export class ValidationService {
  validate(extracted: ExtractedMessage): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    if (!extracted.allSegments.find(s => s.tag === 'ISA')) {
      warnings.push({
        severity: 'error',
        message: 'Missing ISA (Interchange Control Header) segment',
        affectedSegments: ['ISA']
      });
    }

    if (!extracted.allSegments.find(s => s.tag === 'IEA')) {
      warnings.push({
        severity: 'error',
        message: 'Missing IEA (Interchange Control Trailer) segment',
        affectedSegments: ['IEA']
      });
    }

    if (!extracted.allSegments.find(s => s.tag === 'GS')) {
      warnings.push({
        severity: 'error',
        message: 'Missing GS (Functional Group Header) segment',
        affectedSegments: ['GS']
      });
    }

    if (!extracted.allSegments.find(s => s.tag === 'GE')) {
      warnings.push({
        severity: 'error',
        message: 'Missing GE (Functional Group Trailer) segment',
        affectedSegments: ['GE']
      });
    }

    if (!extracted.allSegments.find(s => s.tag === 'ST')) {
      warnings.push({
        severity: 'error',
        message: 'Missing ST (Transaction Set Header) segment',
        affectedSegments: ['ST']
      });
    }

    if (!extracted.allSegments.find(s => s.tag === 'SE')) {
      warnings.push({
        severity: 'error',
        message: 'Missing SE (Transaction Set Trailer) segment',
        affectedSegments: ['SE']
      });
    }

    if (extracted.transactionType === 'Unknown') {
      warnings.push({
        severity: 'warning',
        message: 'Unknown transaction type - may not be supported',
        affectedSegments: ['ST']
      });
    }

    if (extracted.paymentMethod === '' && ['820', '835'].includes(extracted.transactionType)) {
      warnings.push({
        severity: 'warning',
        message: 'Missing payment method in BPR segment',
        affectedSegments: ['BPR']
      });
    }

    if (!extracted.traceNumber && ['820', '835'].includes(extracted.transactionType)) {
      warnings.push({
        severity: 'info',
        message: 'No trace number found in TRN segment',
        affectedSegments: ['TRN']
      });
    }

    if (extracted.parties.length === 0) {
      warnings.push({
        severity: 'warning',
        message: 'No party information (N1 segments) found',
        affectedSegments: ['N1']
      });
    }

    if (!extracted.senderId) {
      warnings.push({
        severity: 'warning',
        message: 'Missing sender ID in ISA segment',
        affectedSegments: ['ISA']
      });
    }

    if (!extracted.receiverId) {
      warnings.push({
        severity: 'warning',
        message: 'Missing receiver ID in ISA segment',
        affectedSegments: ['ISA']
      });
    }

    if (extracted.segmentCount > 0 && extracted.allSegments.length !== extracted.segmentCount) {
      warnings.push({
        severity: 'warning',
        message: `Segment count mismatch: SE shows ${extracted.segmentCount} but found ${extracted.allSegments.length}`,
        affectedSegments: ['SE']
      });
    }

    return warnings;
  }
}
