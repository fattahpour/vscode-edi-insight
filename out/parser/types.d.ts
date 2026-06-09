export interface SegmentDefinition {
    tag: string;
    name: string;
    description: string;
    elements: ElementDefinition[];
}
export interface ElementDefinition {
    position: number;
    name: string;
    type: 'string' | 'numeric' | 'date' | 'time';
    required: boolean;
    description: string;
    values?: string[];
}
export interface TransactionDefinition {
    code: string;
    name: string;
    description: string;
    version: string;
}
