export interface Segment {
    tag: string;
    elements: string[];
    raw: string;
}
export interface ParsedMessage {
    segments: Segment[];
    separators: {
        segment: string;
        element: string;
        subElement: string;
    };
}
export interface ExtractedMessage {
    senderId: string;
    receiverId: string;
    testProduction: 'T' | 'P' | 'Unknown';
    functionalGroupCode: string;
    transactionType: string;
    transactionId: string;
    segmentCount: number;
    paymentAmount?: string;
    paymentMethod?: string;
    paymentDate?: string;
    paymentFormat?: string;
    traceNumber?: string;
    parties: Array<{
        code: string;
        name: string;
    }>;
    remittanceDetails: Array<{
        invoiceNumber?: string;
        paidAmount?: string;
    }>;
    dates: Array<{
        qualifier: string;
        date: string;
    }>;
    references: Array<{
        type: string;
        value: string;
    }>;
    allSegments: Segment[];
}
export interface MessageClassification {
    messageType: string;
    messageCode: string;
    description: string;
    environment: 'Test' | 'Production' | 'Unknown';
    paymentChannel: 'ACH' | 'Wire' | 'Check' | 'BillPay' | 'C2C' | 'Unknown';
}
export interface Report {
    name: string;
    reason: string;
    sourceSegments: string[];
    keyFields: string[];
    exampleRow: string;
}
export interface ValidationWarning {
    severity: 'error' | 'warning' | 'info';
    message: string;
    affectedSegments: string[];
}
export interface AnalysisResult {
    classification: MessageClassification;
    extracted: ExtractedMessage;
    reports: Report[];
    warnings: ValidationWarning[];
}
