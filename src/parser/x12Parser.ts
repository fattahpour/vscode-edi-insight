import { ParsedMessage, Segment, ExtractedMessage } from '../types';

export class X12Parser {
  parse(content: string): ParsedMessage {
    const isaSegment = this.extractISASegment(content);
    if (!isaSegment) {
      throw new Error('Invalid X12 message: ISA segment not found');
    }

    const separators = {
      segment: '~',
      element: '*',
      subElement: ':'
    };

    // ISA segment: element separator at position 3
    if (isaSegment.length >= 4) {
      separators.element = isaSegment[3];
      separators.subElement = isaSegment.length > 104 ? isaSegment[104] : ':';
    }

    const segmentStrings = content.split(separators.segment).filter(s => s.trim());
    const segments: Segment[] = [];

    for (const segmentString of segmentStrings) {
      if (!segmentString.trim()) continue;

      // Extract tag: first 3 characters, removing separator if present
      let tag = segmentString.substring(0, 3);
      if (tag.includes(separators.element)) {
        tag = tag.substring(0, tag.indexOf(separators.element));
      }
      
      // Get elements: start after the tag
      let elementsPart = segmentString.substring(3);
      
      // Skip the separator between the segment tag and its first element.
      if (elementsPart.startsWith(separators.element)) {
        elementsPart = elementsPart.substring(1);
      }
      
      const elements = elementsPart.split(separators.element);

      segments.push({
        tag,
        elements,
        raw: segmentString
      });
    }

    return {
      segments,
      separators
    };
  }

  private extractISASegment(content: string): string | null {
    const isaMatch = content.match(/ISA.{100,}/);
    return isaMatch ? isaMatch[0] : null;
  }

  extractElementValue(segment: Segment, position: number): string {
    if (position < 0 || position >= segment.elements.length) {
      return '';
    }
    return segment.elements[position].trim();
  }

  extractSubElements(value: string, subElementSep: string = ':'): string[] {
    if (!value) return [];
    return value.split(subElementSep).map(s => s.trim());
  }
}

export class MessageExtractor {
  extract(parsed: ParsedMessage): ExtractedMessage {
    const segments = parsed.segments;

    const isaSegment = segments.find(s => s.tag === 'ISA');
    const gsSegment = segments.find(s => s.tag === 'GS');
    const stSegment = segments.find(s => s.tag === 'ST');
    const seSegment = segments.find(s => s.tag === 'SE');
    const bprSegment = segments.find(s => s.tag === 'BPR');
    const trnSegments = segments.filter(s => s.tag === 'TRN');
    const n1Segments = segments.filter(s => s.tag === 'N1');
    const rmrSegments = segments.filter(s => s.tag === 'RMR');
    const dtmSegments = segments.filter(s => s.tag === 'DTM');
    const refSegments = segments.filter(s => s.tag === 'REF');
    const perSegments = segments.filter(s => s.tag === 'PER');
    const nteSegments = segments.filter(s => s.tag === 'NTE');
    const entSegments = segments.filter(s => s.tag === 'ENT');

    const dates = dtmSegments.map(seg => ({
      qualifier: seg.elements[0] ? seg.elements[0].trim() : '',
      date: seg.elements[1] ? this.formatDate(seg.elements[1]) : ''
    }));
    const bprEffectiveDate = bprSegment?.elements[12]?.trim();
    const dtmPaymentDate = dates.find(date => date.qualifier === '097')?.date || dates[0]?.date;

    const extracted: ExtractedMessage = {
      senderId: isaSegment && isaSegment.elements[5] ? isaSegment.elements[5].trim() : '',
      receiverId: isaSegment && isaSegment.elements[7] ? isaSegment.elements[7].trim() : '',
      testProduction: isaSegment && isaSegment.elements[14] ? (isaSegment.elements[14].trim() as 'T' | 'P' | 'Unknown') : 'Unknown',
      functionalGroupCode: gsSegment && gsSegment.elements[0] ? gsSegment.elements[0].trim() : '',
      transactionType: stSegment && stSegment.elements[0] ? stSegment.elements[0].trim() : '',
      transactionId: stSegment && stSegment.elements[1] ? stSegment.elements[1].trim() : '',
      segmentCount: seSegment && seSegment.elements[0] ? parseInt(seSegment.elements[0]) : 0,
      paymentAmount: bprSegment && bprSegment.elements[1] ? bprSegment.elements[1].trim() : undefined,
      paymentMethod: bprSegment && bprSegment.elements[3] ? bprSegment.elements[3].trim() : undefined,
      paymentDate: bprEffectiveDate ? this.formatDate(bprEffectiveDate) : dtmPaymentDate || undefined,
      paymentFormat: bprSegment && bprSegment.elements[4] ? bprSegment.elements[4].trim() : undefined,
      traceNumber: trnSegments.length > 0 && trnSegments[0].elements[1] ? trnSegments[0].elements[1].trim() : undefined,
      parties: n1Segments.map(seg => ({
        code: seg.elements[0] ? seg.elements[0].trim() : '',
        name: seg.elements[1] ? seg.elements[1].trim() : ''
      })),
      remittanceDetails: rmrSegments.map(seg => ({
        invoiceNumber: seg.elements[1]?.trim(),
        paidAmount: seg.elements[3]?.trim()
      })),
      dates,
      references: refSegments.map(seg => ({
        type: seg.elements[0] ? seg.elements[0].trim() : '',
        value: seg.elements[1]?.trim() || ''
      })),
      contacts: perSegments.map(seg => ({
        name: seg.elements[1]?.trim() || '',
        communicationQualifier: seg.elements[2]?.trim(),
        communicationNumber: seg.elements[3]?.trim() || '',
        alternateCommunicationQualifier: seg.elements[4]?.trim(),
        alternateCommunicationNumber: seg.elements[5]?.trim()
      })),
      notes: nteSegments.map(seg => ({
        referenceCode: seg.elements[0]?.trim(),
        text: seg.elements[1]?.trim() || ''
      })),
      entities: entSegments.map(seg => ({
        assignedNumber: seg.elements[0]?.trim(),
        entityIdentifierCode: seg.elements[1]?.trim(),
        identificationCodeQualifier: seg.elements[2]?.trim(),
        identificationCode: seg.elements[3]?.trim(),
        additionalEntityIdentifierCode: seg.elements[4]?.trim()
      })),
      allSegments: segments
    };

    return extracted;
  }

  private formatDate(dateStr: string): string {
    if (!dateStr || dateStr.length < 6) return dateStr;
    if (dateStr.length === 6) {
      const yy = parseInt(dateStr.substring(0, 2));
      const century = yy > 50 ? '19' : '20';
      return `${century}${dateStr.substring(0, 2)}-${dateStr.substring(2, 4)}-${dateStr.substring(4, 6)}`;
    }
    if (dateStr.length === 8) {
      return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
    }
    return dateStr;
  }
}
