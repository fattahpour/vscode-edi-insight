import { ParsedMessage, Segment, ExtractedMessage } from '../types';
export declare class X12Parser {
    parse(content: string): ParsedMessage;
    private extractISASegment;
    extractElementValue(segment: Segment, position: number): string;
    extractSubElements(value: string, subElementSep?: string): string[];
}
export declare class MessageExtractor {
    extract(parsed: ParsedMessage): ExtractedMessage;
    private formatDate;
}
