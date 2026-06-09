import { Segment } from '../types';

export interface SegmentGroup {
  name: string;
  description: string;
  segments: Segment[];
}

interface GroupDefinition {
  name: string;
  description: string;
  tags?: readonly string[];
}

const GROUP_DEFINITIONS: readonly GroupDefinition[] = [
  {
    name: 'Interchange Envelope',
    description: 'Outermost wrapper for the complete EDI interchange.',
    tags: ['ISA', 'IEA']
  },
  {
    name: 'Functional Group',
    description: 'Groups related transaction sets within the interchange.',
    tags: ['GS', 'GE']
  },
  {
    name: 'Transaction Set',
    description: 'Marks the start and end of an individual transaction set.',
    tags: ['ST', 'SE']
  },
  {
    name: 'Payment',
    description: 'Contains payment amount, method, format, and effective-date details.',
    tags: ['BPR']
  },
  {
    name: 'Trace',
    description: 'Provides trace and tracking identifiers for the transaction.',
    tags: ['TRN']
  },
  {
    name: 'Parties',
    description: 'Identifies organizations, entities, and contacts involved in the transaction.',
    tags: ['N1', 'ENT', 'PER']
  },
  {
    name: 'Remittance / Invoice',
    description: 'Connects payments to remittance or invoice details.',
    tags: ['RMR']
  },
  {
    name: 'Dates & References',
    description: 'Provides business dates and reference identifiers.',
    tags: ['DTM', 'REF']
  },
  {
    name: 'Notes',
    description: 'Contains free-form notes and supporting text.',
    tags: ['NTE']
  },
  {
    name: 'Acknowledgment',
    description: 'Reports acknowledgment status and transaction-level errors.',
    tags: ['AK1', 'AK2', 'AK3', 'AK4', 'AK5', 'AK9']
  },
  {
    name: 'Other',
    description: 'Contains segments that do not match a defined business group.'
  }
];

export class SegmentGrouper {
  group(segments: Segment[]): SegmentGroup[] {
    const groups = GROUP_DEFINITIONS.map(definition => ({
      name: definition.name,
      description: definition.description,
      segments: [] as Segment[]
    }));
    const groupIndexByTag = new Map<string, number>();

    GROUP_DEFINITIONS.forEach((definition, index) => {
      for (const tag of definition.tags ?? []) {
        groupIndexByTag.set(tag, index);
      }
    });

    const otherGroupIndex = GROUP_DEFINITIONS.length - 1;
    for (const segment of segments) {
      const groupIndex = groupIndexByTag.get(segment.tag) ?? otherGroupIndex;
      groups[groupIndex].segments.push(segment);
    }

    return groups.filter(group => group.segments.length > 0);
  }
}
