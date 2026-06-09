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
  // ISA info
  senderId: string;
  receiverId: string;
  testProduction: 'T' | 'P' | 'Unknown';

  // GS info
  functionalGroupCode: string;

  // ST info
  transactionType: string;
  transactionId: string;
  segmentCount: number;

  // BPR info
  paymentAmount?: string;
  paymentMethod?: string;
  paymentDate?: string;
  paymentFormat?: string;

  // TRN info
  traceNumber?: string;

  // N1 info (parties)
  parties: Array<{
    code: string;
    name: string;
  }>;

  // RMR info (remittance/invoice)
  remittanceDetails: Array<{
    invoiceNumber?: string;
    paidAmount?: string;
  }>;

  // DTM info (dates)
  dates: Array<{
    qualifier: string;
    date: string;
  }>;

  // REF info
  references: Array<{
    type: string;
    value: string;
  }>;

  // PER info
  contacts?: Array<{
    name: string;
    communicationQualifier?: string;
    communicationNumber: string;
    alternateCommunicationQualifier?: string;
    alternateCommunicationNumber?: string;
  }>;

  // NTE info
  notes?: Array<{
    referenceCode?: string;
    text: string;
  }>;

  // ENT info
  entities?: Array<{
    assignedNumber?: string;
    entityIdentifierCode?: string;
    identificationCodeQualifier?: string;
    identificationCode?: string;
    additionalEntityIdentifierCode?: string;
  }>;

  // All segments for segment table
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
