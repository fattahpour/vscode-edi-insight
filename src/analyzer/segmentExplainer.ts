import { SEGMENT_DEFINITIONS } from '../parser/ediDictionary';
import { Segment } from '../types';

export interface SegmentExplanationRow {
  position: number;
  name: string;
  value: string;
}

export class SegmentExplainer {
  explain(segment: Segment): SegmentExplanationRow[] {
    const definition = SEGMENT_DEFINITIONS[segment.tag];

    return segment.elements.map((value, index) => {
      const position = index + 1;
      const elementDefinition = definition?.elements.find(element => element.position === position);

      return {
        position,
        name: elementDefinition?.name ?? `Element ${position}`,
        value: value.trim()
      };
    });
  }
}
