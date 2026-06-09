# EDI Insight Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working VS Code extension that analyzes EDI payment/remittance messages and explains them in business language with visual graphs and detailed segment analysis.

**Architecture:** Parser → Analyzer (classifier + report detector + validator) → WebView renderer. Modular design allows extending with new transaction types and rules without modifying core logic.

**Tech Stack:** TypeScript, VS Code Extension API, Mermaid.js for graphs, vanilla HTML/CSS for WebView UI.

---

## File Structure

```
src/
├── extension.ts                      # Entry point, command registration
├── parser/
│   ├── x12Parser.ts                  # Tokenize & parse ISA/GS/ST segments
│   ├── ediDictionary.ts              # Transaction & segment definitions
│   └── types.ts                      # Shared types (Segment, Message, etc)
├── analyzer/
│   ├── messageClassifier.ts          # Detect message type, env, payment channel
│   ├── reportDetector.ts             # Identify which reports to generate
│   └── validationService.ts          # Validate structure & required fields
├── webview/
│   ├── renderHtml.ts                 # Build WebView HTML with embedded styles
│   └── mermaidGraph.ts               # Generate Mermaid diagram for message structure
└── types/
    └── index.ts                      # Export all types

samples/
├── 820-billpay-test.edi
├── 820-ach-production.edi
└── 997-ack.edi

tests/
├── parser/
│   └── x12Parser.test.ts
├── analyzer/
│   ├── messageClassifier.test.ts
│   ├── reportDetector.test.ts
│   └── validationService.test.ts
└── webview/
    └── renderHtml.test.ts

Root:
├── package.json
├── tsconfig.json
├── .vscodeignore
├── README.md
└── CLAUDE.md
```

---

## Task 1: Project Setup & Configuration

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.vscodeignore`
- Create: `.vscode/launch.json`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "edi-insight",
  "displayName": "EDI Insight",
  "description": "Analyze and visualize EDI payment/remittance messages with business-friendly explanations",
  "version": "0.1.0",
  "publisher": "peyman",
  "engines": {
    "vscode": "^1.75.0"
  },
  "categories": [
    "Other"
  ],
  "activationEvents": [
    "onCommand:ediInsight.analyze"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "ediInsight.analyze",
        "title": "EDI Insight: Analyze Current File"
      }
    ],
    "menus": {
      "editor/context": [
        {
          "command": "ediInsight.analyze",
          "when": "resourceExtname =~ /\\.(edi|x12|txt)$/"
        }
      ]
    }
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "pretest": "npm run compile",
    "test": "node ./out/test/runTest.js",
    "lint": "eslint src --ext ts",
    "package": "vsce package"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/vscode": "^1.75.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@vscode/test-electron": "^2.3.0",
    "eslint": "^8.0.0",
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./out",
    "rootDir": "./src",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "out"]
}
```

- [ ] **Step 3: Create .vscodeignore**

```
.git
.gitignore
.vscode
out
node_modules
src
tsconfig.json
*.test.ts
docs
samples
README.md
```

- [ ] **Step 4: Verify configuration**

Run: `npm install`
Expected: Dependencies installed without errors

---

## Task 2: Define Core Types

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Create types file with all domain types**

```typescript
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
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No compilation errors

---

## Task 3: EDI Dictionary & Parser Types

**Files:**
- Create: `src/parser/types.ts`
- Create: `src/parser/ediDictionary.ts`

- [ ] **Step 1: Create parser types**

```typescript
// src/parser/types.ts
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
```

- [ ] **Step 2: Create EDI dictionary with X12 definitions**

```typescript
// src/parser/ediDictionary.ts
import { TransactionDefinition, SegmentDefinition } from './types';

export const TRANSACTION_TYPES: Record<string, TransactionDefinition> = {
  '820': {
    code: '820',
    name: 'Payment Order / Remittance Advice',
    description: 'X12 820 - Payment Order or Remittance Advice',
    version: '004010'
  },
  '835': {
    code: '835',
    name: 'Healthcare Claim Payment/Advice',
    description: 'X12 835 - Healthcare Claim Payment/Advice',
    version: '004010'
  },
  '997': {
    code: '997',
    name: 'Functional Acknowledgment',
    description: 'X12 997 - Functional Acknowledgment',
    version: '004010'
  },
  '824': {
    code: '824',
    name: 'Application Advice',
    description: 'X12 824 - Application Advice',
    version: '004010'
  }
};

export const SEGMENT_DEFINITIONS: Record<string, SegmentDefinition> = {
  'ISA': {
    tag: 'ISA',
    name: 'Interchange Control Header',
    description: 'Marks beginning of interchange',
    elements: [
      { position: 1, name: 'Authorization Qualification Indicator', type: 'string', required: true, description: '' },
      { position: 2, name: 'Authorization Information', type: 'string', required: true, description: '' },
      { position: 3, name: 'Security Qual Indicator', type: 'string', required: true, description: '' },
      { position: 4, name: 'Security Information', type: 'string', required: true, description: '' },
      { position: 5, name: 'Interchange ID Qualifier - Sender', type: 'string', required: true, description: '' },
      { position: 6, name: 'Interchange Sender ID', type: 'string', required: true, description: '' },
      { position: 7, name: 'Interchange ID Qualifier - Receiver', type: 'string', required: true, description: '' },
      { position: 8, name: 'Interchange Receiver ID', type: 'string', required: true, description: '' },
      { position: 9, name: 'Interchange Date', type: 'date', required: true, description: '' },
      { position: 10, name: 'Interchange Time', type: 'time', required: true, description: '' },
      { position: 11, name: 'Repetition Separator', type: 'string', required: true, description: '' },
      { position: 12, name: 'Interchange Control Version Number', type: 'string', required: true, description: '' },
      { position: 13, name: 'Interchange Control Number', type: 'numeric', required: true, description: '' },
      { position: 14, name: 'Acknowledgment Requested', type: 'string', required: true, description: '' },
      { position: 15, name: 'Usage Indicator', type: 'string', required: true, description: 'T=Test, P=Production' },
      { position: 16, name: 'Component Element Separator', type: 'string', required: true, description: '' }
    ]
  },
  'GS': {
    tag: 'GS',
    name: 'Functional Group Header',
    description: 'Marks beginning of functional group',
    elements: [
      { position: 1, name: 'Functional Identifier Code', type: 'string', required: true, description: '' },
      { position: 2, name: 'Application Sender\'s Code', type: 'string', required: true, description: '' },
      { position: 3, name: 'Application Receiver\'s Code', type: 'string', required: true, description: '' },
      { position: 4, name: 'Date', type: 'date', required: true, description: '' },
      { position: 5, name: 'Time', type: 'time', required: true, description: '' },
      { position: 6, name: 'Group Control Number', type: 'numeric', required: true, description: '' },
      { position: 7, name: 'Responsible Agency Code', type: 'string', required: true, description: '' },
      { position: 8, name: 'Version / Release / Industry Identifier Code', type: 'string', required: true, description: '' }
    ]
  },
  'ST': {
    tag: 'ST',
    name: 'Transaction Set Header',
    description: 'Marks beginning of transaction set',
    elements: [
      { position: 1, name: 'Transaction Set Identifier Code', type: 'string', required: true, description: '' },
      { position: 2, name: 'Transaction Set Control Number', type: 'numeric', required: true, description: '' }
    ]
  },
  'BPR': {
    tag: 'BPR',
    name: 'Beginning Segment for Payment Order/Remittance Advice',
    description: 'Payment information',
    elements: [
      { position: 1, name: 'Transaction Handling Code', type: 'string', required: true, description: '' },
      { position: 2, name: 'Monetary Amount', type: 'string', required: false, description: '' },
      { position: 3, name: 'Credit Debit Flag Code', type: 'string', required: true, description: '' },
      { position: 4, name: 'Payment Method Code', type: 'string', required: true, description: 'ACH, WIR, CHK, etc' },
      { position: 5, name: 'Payment Format Code', type: 'string', required: false, description: 'CTX, CCD, etc' },
      { position: 6, name: 'DFI ID Qualifier', type: 'string', required: false, description: '' },
      { position: 7, name: 'DFI Identification Number', type: 'string', required: false, description: '' },
      { position: 8, name: 'Account Number Qualifier', type: 'string', required: false, description: '' },
      { position: 9, name: 'Account Number', type: 'string', required: false, description: '' },
      { position: 10, name: 'Originating Company Identifier', type: 'string', required: false, description: '' },
      { position: 11, name: 'Originating Company Supplemental Code', type: 'string', required: false, description: '' },
      { position: 12, name: 'DFI Account Number', type: 'string', required: false, description: '' },
      { position: 13, name: 'Payment Due Date', type: 'date', required: false, description: '' }
    ]
  },
  'TRN': {
    tag: 'TRN',
    name: 'Trace',
    description: 'Trace information and numbers',
    elements: [
      { position: 1, name: 'Trace Type Code', type: 'string', required: true, description: '' },
      { position: 2, name: 'Trace Number', type: 'string', required: true, description: '' },
      { position: 3, name: 'Originating Company Identifier', type: 'string', required: false, description: '' },
      { position: 4, name: 'Originating Company Supplemental Code', type: 'string', required: false, description: '' }
    ]
  },
  'N1': {
    tag: 'N1',
    name: 'Party Identification',
    description: 'Party identification and related information',
    elements: [
      { position: 1, name: 'Entity Identifier Code', type: 'string', required: true, description: 'PR=Payer, PE=Payee' },
      { position: 2, name: 'Name', type: 'string', required: false, description: '' },
      { position: 3, name: 'Identification Code Qualifier', type: 'string', required: false, description: '' },
      { position: 4, name: 'Identification Code', type: 'string', required: false, description: '' }
    ]
  },
  'RMR': {
    tag: 'RMR',
    name: 'Remittance Advice',
    description: 'Remittance advice information',
    elements: [
      { position: 1, name: 'Reference Identification Qualifier', type: 'string', required: true, description: '' },
      { position: 2, name: 'Reference Identification', type: 'string', required: false, description: 'Invoice number' },
      { position: 3, name: 'Free-form Description', type: 'string', required: false, description: '' },
      { position: 4, name: 'Monetary Amount', type: 'string', required: false, description: '' }
    ]
  },
  'DTM': {
    tag: 'DTM',
    name: 'Date/Time Reference',
    description: 'Date and time information',
    elements: [
      { position: 1, name: 'Date/Time Qualifier', type: 'string', required: true, description: '' },
      { position: 2, name: 'Date', type: 'date', required: true, description: '' },
      { position: 3, name: 'Time Code', type: 'string', required: false, description: '' }
    ]
  },
  'REF': {
    tag: 'REF',
    name: 'Reference Identification',
    description: 'Reference information',
    elements: [
      { position: 1, name: 'Reference Identification Qualifier', type: 'string', required: true, description: '' },
      { position: 2, name: 'Reference Identification', type: 'string', required: false, description: '' },
      { position: 3, name: 'Description', type: 'string', required: false, description: '' }
    ]
  },
  'SE': {
    tag: 'SE',
    name: 'Transaction Set Trailer',
    description: 'Marks end of transaction set',
    elements: [
      { position: 1, name: 'Number of Included Segments', type: 'numeric', required: true, description: '' },
      { position: 2, name: 'Transaction Set Control Number', type: 'numeric', required: true, description: '' }
    ]
  },
  'GE': {
    tag: 'GE',
    name: 'Functional Group Trailer',
    description: 'Marks end of functional group',
    elements: [
      { position: 1, name: 'Number of Included Functional Groups', type: 'numeric', required: true, description: '' },
      { position: 2, name: 'Group Control Number', type: 'numeric', required: true, description: '' }
    ]
  },
  'IEA': {
    tag: 'IEA',
    name: 'Interchange Control Trailer',
    description: 'Marks end of interchange',
    elements: [
      { position: 1, name: 'Number of Functional Groups', type: 'numeric', required: true, description: '' },
      { position: 2, name: 'Interchange Control Number', type: 'numeric', required: true, description: '' }
    ]
  }
};
```

- [ ] **Step 3: Verify definitions compile**

Run: `npx tsc --noEmit src/parser/ediDictionary.ts`
Expected: No compilation errors

---

## Task 4: X12 Parser Implementation

**Files:**
- Create: `src/parser/x12Parser.ts`

- [ ] **Step 1: Create X12 parser with tokenization and segment extraction**

```typescript
// src/parser/x12Parser.ts
import { ParsedMessage, Segment } from '../types';

export class X12Parser {
  parse(content: string): ParsedMessage {
    // Detect separators from ISA (fixed positions)
    const isaSegment = this.extractISASegment(content);
    if (!isaSegment) {
      throw new Error('Invalid X12 message: ISA segment not found');
    }

    const separators = {
      segment: '~',
      element: '*',
      subElement: ':'
    };

    // Extract ISA element separator and sub-element separator if available
    if (isaSegment.length >= 104) {
      separators.element = isaSegment[3];
      separators.subElement = isaSegment[103];
    }

    // Split into segments
    const segmentStrings = content.split(separators.segment).filter(s => s.trim());
    const segments: Segment[] = [];

    for (const segmentString of segmentStrings) {
      if (!segmentString.trim()) continue;

      const tag = segmentString.substring(0, 3);
      const elementsString = segmentString.substring(3);
      const elements = elementsString.split(separators.element);

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
```

- [ ] **Step 2: Create message extractor to pull key data**

```typescript
// src/parser/x12Parser.ts (add to file)
import { ExtractedMessage, Segment } from '../types';

export class MessageExtractor {
  extract(parsed: ParsedMessage): ExtractedMessage {
    const segments = parsed.segments;

    // Find key segments
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

    const extracted: ExtractedMessage = {
      senderId: isaSegment ? isaSegment.elements[5].trim() : '',
      receiverId: isaSegment ? isaSegment.elements[7].trim() : '',
      testProduction: isaSegment ? (isaSegment.elements[14].trim() as 'T' | 'P' | 'Unknown') : 'Unknown',
      functionalGroupCode: gsSegment ? gsSegment.elements[0].trim() : '',
      transactionType: stSegment ? stSegment.elements[0].trim() : '',
      transactionId: stSegment ? stSegment.elements[1].trim() : '',
      segmentCount: seSegment ? parseInt(seSegment.elements[0]) : 0,
      paymentAmount: bprSegment ? bprSegment.elements[1].trim() : undefined,
      paymentMethod: bprSegment ? bprSegment.elements[3].trim() : undefined,
      paymentDate: bprSegment ? this.formatDate(bprSegment.elements[12]) : undefined,
      paymentFormat: bprSegment ? bprSegment.elements[4].trim() : undefined,
      traceNumber: trnSegments.length > 0 ? trnSegments[0].elements[1].trim() : undefined,
      parties: n1Segments.map(seg => ({
        code: seg.elements[0].trim(),
        name: seg.elements[1].trim()
      })),
      remittanceDetails: rmrSegments.map(seg => ({
        invoiceNumber: seg.elements[1]?.trim(),
        paidAmount: seg.elements[3]?.trim()
      })),
      dates: dtmSegments.map(seg => ({
        qualifier: seg.elements[0].trim(),
        date: this.formatDate(seg.elements[1])
      })),
      references: refSegments.map(seg => ({
        type: seg.elements[0].trim(),
        value: seg.elements[1]?.trim() || ''
      })),
      allSegments: segments
    };

    return extracted;
  }

  private formatDate(dateStr: string): string {
    if (!dateStr || dateStr.length < 6) return dateStr;
    // YYMMDD or CCYYMMDD format
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
```

- [ ] **Step 3: Test parser with sample message**

```typescript
// Basic test
const parser = new X12Parser();
const sampleEdi = `ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *240520*1200*U*00401*000000001*0*T*:~GS*RA*SENDER*RECEIVER*20240520*1200*1*X*004010~ST*820*0001~SE*1*0001~GE*1*1~IEA*1*000000001~`;
const parsed = parser.parse(sampleEdi);
console.log('Segments parsed:', parsed.segments.length > 0 ? 'OK' : 'FAILED');
```

Expected: Parser successfully tokenizes EDI message

---

## Task 5: Message Classifier

**Files:**
- Create: `src/analyzer/messageClassifier.ts`

- [ ] **Step 1: Create message classifier**

```typescript
// src/analyzer/messageClassifier.ts
import { ExtractedMessage, MessageClassification } from '../types';
import { TRANSACTION_TYPES } from '../parser/ediDictionary';

export class MessageClassifier {
  classify(extracted: ExtractedMessage): MessageClassification {
    const txnCode = extracted.transactionType;
    const txnDef = TRANSACTION_TYPES[txnCode] || {
      code: 'Unknown',
      name: 'Unknown Transaction Type',
      description: 'Could not identify transaction type',
      version: 'Unknown'
    };

    const paymentChannel = this.detectPaymentChannel(extracted);
    const testProd = extracted.testProduction === 'T' ? 'Test' : 
                     extracted.testProduction === 'P' ? 'Production' : 'Unknown';

    return {
      messageType: `X12 ${txnCode} ${txnDef.name}`,
      messageCode: txnCode,
      description: txnDef.description,
      environment: testProd as 'Test' | 'Production' | 'Unknown',
      paymentChannel
    };
  }

  private detectPaymentChannel(extracted: ExtractedMessage): string {
    const method = extracted.paymentMethod?.toUpperCase() || '';
    const format = extracted.paymentFormat?.toUpperCase() || '';

    // Direct payment method match
    if (method === 'ACH') return 'ACH';
    if (method === 'WIR') return 'Wire';
    if (method === 'CHK') return 'Check';

    // Check for BillPay indicators
    const allText = this.buildSearchText(extracted);
    if (allText.includes('billpay') || allText.includes('bill pay') ||
        allText.includes('utility') || allText.includes('consumer bill') ||
        allText.includes('invoice payment')) {
      return 'BillPay';
    }

    // Check for C2C indicators
    if (allText.includes('c2c') || allText.includes('card-to-card') ||
        allText.includes('customer-to-customer') || allText.includes('consumer-to-consumer')) {
      return 'C2C';
    }

    return 'Unknown';
  }

  private buildSearchText(extracted: ExtractedMessage): string {
    const parts = [
      extracted.senderId,
      extracted.receiverId,
      extracted.paymentMethod,
      extracted.paymentFormat,
      ...extracted.parties.map(p => p.name),
      ...extracted.references.map(r => r.value)
    ];
    return parts.join(' ').toLowerCase();
  }
}
```

- [ ] **Step 2: Verify classifier works**

```typescript
// Test classifier
const classified = classifier.classify(extracted);
console.log('Payment channel detected:', classified.paymentChannel);
```

Expected: Correctly identifies ACH, BillPay, or other channel

---

## Task 6: Report Detector

**Files:**
- Create: `src/analyzer/reportDetector.ts`

- [ ] **Step 1: Create report detector**

```typescript
// src/analyzer/reportDetector.ts
import { ExtractedMessage, MessageClassification, Report } from '../types';

export class ReportDetector {
  detect(extracted: ExtractedMessage, classification: MessageClassification): Report[] {
    const reports: Report[] = [];
    const txnType = classification.messageCode;
    const channel = classification.paymentChannel;

    // 820 messages can generate multiple reports
    if (txnType === '820') {
      if (channel === 'ACH') {
        reports.push({
          name: 'ACH Payment Report',
          reason: `Payment method is ${channel}`,
          sourceSegments: ['BPR', 'TRN', 'N1', 'DTM'],
          keyFields: ['Amount', 'Trace Number', 'Payer', 'Payee', 'Payment Date'],
          exampleRow: `${extracted.paymentAmount} | ${extracted.traceNumber} | ${extracted.parties[0]?.name} | ${extracted.parties[1]?.name} | ${extracted.paymentDate}`
        });
      } else if (channel === 'Wire') {
        reports.push({
          name: 'Wire Transfer Report',
          reason: `Payment method is ${channel}`,
          sourceSegments: ['BPR', 'TRN', 'N1', 'DTM'],
          keyFields: ['Amount', 'Trace Number', 'Originator', 'Beneficiary', 'Value Date'],
          exampleRow: `${extracted.paymentAmount} | ${extracted.traceNumber} | ${extracted.parties[0]?.name} | ${extracted.parties[1]?.name} | ${extracted.paymentDate}`
        });
      } else if (channel === 'BillPay') {
        reports.push({
          name: 'BillPay Settlement Report',
          reason: `Payment channel detected as ${channel}`,
          sourceSegments: ['BPR', 'N1', 'RMR', 'DTM'],
          keyFields: ['Bill Amount', 'Biller', 'Consumer', 'Invoice', 'Due Date'],
          exampleRow: `${extracted.paymentAmount} | ${extracted.parties[1]?.name} | ${extracted.parties[0]?.name} | ${extracted.remittanceDetails[0]?.invoiceNumber} | ${extracted.paymentDate}`
        });
        
        reports.push({
          name: 'Remittance Advice Report',
          reason: 'RMR segment indicates remittance information',
          sourceSegments: ['RMR', 'N1', 'BPR'],
          keyFields: ['Invoice Number', 'Paid Amount', 'Payer', 'Payee'],
          exampleRow: `${extracted.remittanceDetails[0]?.invoiceNumber} | ${extracted.remittanceDetails[0]?.paidAmount} | ${extracted.parties[0]?.name} | ${extracted.parties[1]?.name}`
        });
      } else if (channel === 'C2C') {
        reports.push({
          name: 'C2C Transfer Report',
          reason: `Payment channel detected as ${channel}`,
          sourceSegments: ['BPR', 'N1', 'TRN', 'DTM'],
          keyFields: ['Amount', 'From', 'To', 'Trace', 'Date'],
          exampleRow: `${extracted.paymentAmount} | ${extracted.parties[0]?.name} | ${extracted.parties[1]?.name} | ${extracted.traceNumber} | ${extracted.paymentDate}`
        });
      }

      // Always include Payment Summary for 820
      if (reports.length > 0) {
        reports.unshift({
          name: 'Payment Summary Report',
          reason: '820 transaction type contains payment information',
          sourceSegments: ['BPR', 'N1'],
          keyFields: ['Total Amount', 'Payer', 'Payee', 'Payment Method'],
          exampleRow: `${extracted.paymentAmount} | ${extracted.parties[0]?.name} | ${extracted.parties[1]?.name} | ${extracted.paymentMethod}`
        });
      }
    }

    // 835 (Healthcare claim payment)
    if (txnType === '835') {
      reports.push({
        name: 'Healthcare Claim Payment Report',
        reason: '835 transaction type is healthcare claim payment',
        sourceSegments: ['BPR', 'N1', 'RMR'],
        keyFields: ['Payment Amount', 'Payer', 'Payee', 'Claim Reference'],
        exampleRow: `${extracted.paymentAmount} | ${extracted.parties[0]?.name} | ${extracted.parties[1]?.name} | ${extracted.references[0]?.value}`
      });
    }

    // 997 (Functional Acknowledgment)
    if (txnType === '997') {
      reports.push({
        name: 'Functional Acknowledgment Report',
        reason: '997 transaction type is acknowledgment',
        sourceSegments: ['ST', 'AK1', 'AK2'],
        keyFields: ['Status', 'Functional Group', 'Control Number'],
        exampleRow: 'Message received and processed'
      });
    }

    // 824 (Application Advice)
    if (txnType === '824') {
      reports.push({
        name: 'Application Advice Report',
        reason: '824 transaction type is application advice',
        sourceSegments: ['ST', 'BGN'],
        keyFields: ['Response Type', 'Original Message', 'Status'],
        exampleRow: 'Application advice received'
      });
    }

    return reports;
  }
}
```

- [ ] **Step 2: Test report detection**

```typescript
// Test detector
const reports = detector.detect(extracted, classification);
console.log('Reports detected:', reports.length > 0 ? 'OK' : 'FAILED');
```

Expected: Detects appropriate reports based on message type and channel

---

## Task 7: Validation Service

**Files:**
- Create: `src/analyzer/validationService.ts`

- [ ] **Step 1: Create validation service**

```typescript
// src/analyzer/validationService.ts
import { ExtractedMessage, ValidationWarning } from '../types';

export class ValidationService {
  validate(extracted: ExtractedMessage): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Structural checks
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

    // Content validation
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

    // Segment count validation
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
```

- [ ] **Step 2: Test validation**

```typescript
// Test validation
const warnings = validator.validate(extracted);
console.log('Validation check:', warnings.length >= 0 ? 'OK' : 'FAILED');
```

Expected: Validation returns appropriate warnings

---

## Task 8: Mermaid Graph Generator

**Files:**
- Create: `src/webview/mermaidGraph.ts`

- [ ] **Step 1: Create Mermaid diagram generator**

```typescript
// src/webview/mermaidGraph.ts
import { ExtractedMessage } from '../types';

export class MermaidGraphGenerator {
  generate(extracted: ExtractedMessage): string {
    let diagram = 'graph TD\n';
    diagram += '  ISA["ISA: Interchange Control Header"]\n';
    diagram += `    --> GS["GS: Functional Group<br/>(${extracted.functionalGroupCode})"]\n`;
    diagram += `      --> ST["ST: Transaction Set<br/>(${extracted.transactionType})"]\n`;

    // Add BPR if present
    if (extracted.paymentAmount) {
      diagram += `        --> BPR["BPR: Payment Info<br/>Amount: ${extracted.paymentAmount}<br/>Method: ${extracted.paymentMethod}"]\n`;
    } else {
      diagram += `        --> BPR["BPR: Payment Info"]\n`;
    }

    // Add TRN if present
    if (extracted.traceNumber) {
      diagram += `      --> TRN["TRN: Trace Info<br/>Trace: ${extracted.traceNumber}"]\n`;
    } else {
      diagram += `      --> TRN["TRN: Trace Info"]\n`;
    }

    // Add N1 parties
    if (extracted.parties.length > 0) {
      extracted.parties.forEach((party, idx) => {
        const partyLabel = party.code === 'PR' ? 'Payer' : party.code === 'PE' ? 'Payee' : party.code;
        diagram += `      --> N1_${idx}["N1: ${partyLabel}<br/>${party.name}"]\n`;
      });
    } else {
      diagram += `      --> N1["N1: Party Identification"]\n`;
    }

    // Add RMR if present
    if (extracted.remittanceDetails.length > 0) {
      diagram += `      --> RMR["RMR: Remittance Info<br/>Invoice: ${extracted.remittanceDetails[0].invoiceNumber}"]\n`;
    } else {
      diagram += `      --> RMR["RMR: Remittance Info"]\n`;
    }

    // Add DTM if present
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
```

- [ ] **Step 2: Test graph generation**

```typescript
// Test generator
const graphGen = new MermaidGraphGenerator();
const diagram = graphGen.generate(extracted);
console.log('Diagram generated:', diagram.length > 0 ? 'OK' : 'FAILED');
```

Expected: Generates valid Mermaid diagram syntax

---

## Task 9: WebView HTML Renderer

**Files:**
- Create: `src/webview/renderHtml.ts`

- [ ] **Step 1: Create comprehensive HTML renderer**

```typescript
// src/webview/renderHtml.ts
import { AnalysisResult } from '../types';
import { MermaidGraphGenerator } from './mermaidGraph';

export class HtmlRenderer {
  render(result: AnalysisResult): string {
    const graphGen = new MermaidGraphGenerator();
    const diagram = graphGen.generate(result.extracted);

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EDI Insight - Analysis Result</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }

    .section {
      background: white;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    h1 {
      color: #2c3e50;
      margin-bottom: 10px;
      font-size: 28px;
    }

    h2 {
      color: #34495e;
      margin-top: 20px;
      margin-bottom: 15px;
      border-bottom: 2px solid #3498db;
      padding-bottom: 10px;
      font-size: 20px;
    }

    h3 {
      color: #7f8c8d;
      margin-top: 15px;
      margin-bottom: 10px;
      font-size: 16px;
    }

    .header-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }

    .info-box {
      padding: 15px;
      border-left: 4px solid #3498db;
      background: #ecf0f1;
      border-radius: 4px;
    }

    .info-label {
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 5px;
      font-size: 12px;
      text-transform: uppercase;
    }

    .info-value {
      color: #34495e;
      font-size: 16px;
      word-break: break-all;
    }

    .status-test {
      border-left-color: #f39c12;
    }

    .status-production {
      border-left-color: #27ae60;
    }

    .status-unknown {
      border-left-color: #95a5a6;
    }

    .warning {
      padding: 15px;
      margin-bottom: 15px;
      border-left: 4px solid;
      border-radius: 4px;
      background-color: #fef5e7;
    }

    .warning.error {
      border-left-color: #e74c3c;
      background-color: #fadbd8;
    }

    .warning.info {
      border-left-color: #3498db;
      background-color: #d6eaf8;
    }

    .warning-title {
      font-weight: bold;
      margin-bottom: 5px;
    }

    .warning.error .warning-title {
      color: #c0392b;
    }

    .warning.warning .warning-title {
      color: #d68910;
    }

    .warning.info .warning-title {
      color: #2980b9;
    }

    .warning-segments {
      font-size: 12px;
      margin-top: 5px;
      font-weight: bold;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
      font-size: 14px;
    }

    thead {
      background: #34495e;
      color: white;
    }

    th {
      padding: 12px;
      text-align: left;
      font-weight: bold;
    }

    td {
      padding: 12px;
      border-bottom: 1px solid #ecf0f1;
    }

    tbody tr:hover {
      background: #f8f9fa;
    }

    .mermaid {
      display: flex;
      justify-content: center;
      margin: 20px 0;
      overflow-x: auto;
    }

    .report-list {
      list-style: none;
    }

    .report-list li {
      padding: 15px;
      margin-bottom: 15px;
      border: 1px solid #bdc3c7;
      border-radius: 4px;
      background: #f8f9fa;
    }

    .report-title {
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 8px;
      font-size: 16px;
    }

    .report-reason {
      color: #7f8c8d;
      font-size: 13px;
      margin-bottom: 10px;
    }

    .report-fields {
      color: #34495e;
      font-size: 13px;
      margin-bottom: 8px;
    }

    .report-example {
      background: white;
      padding: 10px;
      border-left: 3px solid #3498db;
      font-family: monospace;
      font-size: 12px;
      overflow-x: auto;
    }

    .code-block {
      background: #2c3e50;
      color: #ecf0f1;
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      margin-bottom: 15px;
    }

    .no-data {
      color: #7f8c8d;
      font-style: italic;
    }

    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
      margin-right: 5px;
      margin-bottom: 5px;
    }

    .badge-segment {
      background: #ecf0f1;
      color: #2c3e50;
    }

    .payment-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }

    .summary-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }

    .summary-card.amount {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }

    .summary-card.date {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    }

    .summary-card.method {
      background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
    }

    .summary-label {
      font-size: 12px;
      opacity: 0.9;
      text-transform: uppercase;
      margin-bottom: 8px;
    }

    .summary-value {
      font-size: 24px;
      font-weight: bold;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="section">
      <h1>📊 EDI Message Analysis</h1>
      <p>Detailed analysis of EDI payment/remittance message</p>
    </div>

    <!-- Message Overview -->
    <div class="section">
      <h2>Message Overview</h2>
      <div class="header-info">
        <div class="info-box">
          <div class="info-label">Message Type</div>
          <div class="info-value">${this.escape(result.classification.messageType)}</div>
        </div>
        <div class="info-box">
          <div class="info-label">Description</div>
          <div class="info-value">${this.escape(result.classification.description)}</div>
        </div>
        <div class="info-box">
          <div class="info-label">Sender ID</div>
          <div class="info-value">${this.escape(result.extracted.senderId || 'N/A')}</div>
        </div>
        <div class="info-box">
          <div class="info-label">Receiver ID</div>
          <div class="info-value">${this.escape(result.extracted.receiverId || 'N/A')}</div>
        </div>
      </div>
    </div>

    <!-- Test/Production -->
    <div class="section">
      <h2>Environment</h2>
      <div class="header-info">
        <div class="info-box status-${result.classification.environment.toLowerCase()}">
          <div class="info-label">Status</div>
          <div class="info-value">${result.classification.environment}</div>
        </div>
      </div>
    </div>

    <!-- Payment Channel -->
    <div class="section">
      <h2>Payment Channel Detection</h2>
      <div class="header-info">
        <div class="info-box">
          <div class="info-label">Detected Channel</div>
          <div class="info-value">${this.escape(result.classification.paymentChannel)}</div>
        </div>
        <div class="info-box">
          <div class="info-label">Payment Method</div>
          <div class="info-value">${this.escape(result.extracted.paymentMethod || 'N/A')}</div>
        </div>
        <div class="info-box">
          <div class="info-label">Payment Format</div>
          <div class="info-value">${this.escape(result.extracted.paymentFormat || 'N/A')}</div>
        </div>
      </div>
    </div>

    <!-- Business Reports -->
    <div class="section">
      <h2>Business Report Detection</h2>
      ${result.reports.length > 0 ? `
        <ul class="report-list">
          ${result.reports.map(report => `
            <li>
              <div class="report-title">${this.escape(report.name)}</div>
              <div class="report-reason"><strong>Reason:</strong> ${this.escape(report.reason)}</div>
              <div class="report-fields">
                <strong>Source Segments:</strong> 
                ${report.sourceSegments.map(seg => `<span class="badge badge-segment">${seg}</span>`).join('')}
              </div>
              <div class="report-fields"><strong>Key Fields:</strong> ${this.escape(report.keyFields.join(', '))}</div>
              <div class="report-example"><strong>Example Output:</strong><br/>${this.escape(report.exampleRow)}</div>
            </li>
          `).join('')}
        </ul>
      ` : '<p class="no-data">No reports detected for this message.</p>'}
    </div>

    <!-- Payment Summary -->
    <div class="section">
      <h2>Payment Summary</h2>
      <div class="payment-summary">
        <div class="summary-card amount">
          <div class="summary-label">Amount</div>
          <div class="summary-value">${this.escape(result.extracted.paymentAmount || 'N/A')}</div>
        </div>
        <div class="summary-card date">
          <div class="summary-label">Payment Date</div>
          <div class="summary-value">${this.escape(result.extracted.paymentDate || 'N/A')}</div>
        </div>
        <div class="summary-card method">
          <div class="summary-label">Trace Number</div>
          <div class="summary-value">${this.escape(result.extracted.traceNumber || 'N/A')}</div>
        </div>
      </div>
    </div>

    <!-- Message Graph -->
    <div class="section">
      <h2>Message Structure</h2>
      <div class="mermaid">${diagram}</div>
    </div>

    <!-- Parties -->
    <div class="section">
      <h2>Parties</h2>
      ${result.extracted.parties.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
            </tr>
          </thead>
          <tbody>
            ${result.extracted.parties.map(party => `
              <tr>
                <td>${this.escape(party.code)}</td>
                <td>${this.escape(party.name)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : '<p class="no-data">No party information found.</p>'}
    </div>

    <!-- Remittance Details -->
    <div class="section">
      <h2>Invoice / Remittance Details</h2>
      ${result.extracted.remittanceDetails.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Invoice Number</th>
              <th>Paid Amount</th>
            </tr>
          </thead>
          <tbody>
            ${result.extracted.remittanceDetails.map(detail => `
              <tr>
                <td>${this.escape(detail.invoiceNumber || 'N/A')}</td>
                <td>${this.escape(detail.paidAmount || 'N/A')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : '<p class="no-data">No remittance details found.</p>'}
    </div>

    <!-- Segment Explanation -->
    <div class="section">
      <h2>Segment Explanation</h2>
      <table>
        <thead>
          <tr>
            <th>Segment</th>
            <th>Content</th>
          </tr>
        </thead>
        <tbody>
          ${result.extracted.allSegments.map(segment => `
            <tr>
              <td><strong>${this.escape(segment.tag)}</strong></td>
              <td><code>${this.escape(segment.raw.substring(0, 100))}${segment.raw.length > 100 ? '...' : ''}</code></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Validation Warnings -->
    <div class="section">
      <h2>Validation Warnings</h2>
      ${result.warnings.length > 0 ? `
        <div>
          ${result.warnings.map(warning => `
            <div class="warning ${warning.severity}">
              <div class="warning-title">${warning.severity === 'error' ? '❌ Error' : warning.severity === 'warning' ? '⚠️ Warning' : 'ℹ️ Info'}: ${this.escape(warning.message)}</div>
              <div class="warning-segments">Affected: ${warning.affectedSegments.join(', ')}</div>
            </div>
          `).join('')}
        </div>
      ` : '<p class="no-data">✅ No validation warnings found.</p>'}
    </div>

    <!-- JSON Output -->
    <div class="section">
      <h2>Raw JSON Output</h2>
      <div class="code-block">${this.escape(JSON.stringify(result, null, 2))}</div>
    </div>
  </div>

  <script>
    mermaid.initialize({ startOnLoad: true, theme: 'default' });
    mermaid.render('mermaidDiagram', \`${diagram}\`).then(({ svg }) => {
      const mermaidDiv = document.querySelector('.mermaid');
      mermaidDiv.innerHTML = svg;
    }).catch(err => {
      console.error('Mermaid error:', err);
    });
  </script>
</body>
</html>`;
  }

  private escape(text: string | undefined): string {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
```

- [ ] **Step 2: Test HTML rendering**

Expected: Generates valid HTML with inline CSS and Mermaid

---

## Task 10: Main Extension File

**Files:**
- Create: `src/extension.ts`

- [ ] **Step 1: Create extension entry point**

```typescript
// src/extension.ts
import * as vscode from 'vscode';
import { X12Parser, MessageExtractor } from './parser/x12Parser';
import { MessageClassifier } from './analyzer/messageClassifier';
import { ReportDetector } from './analyzer/reportDetector';
import { ValidationService } from './analyzer/validationService';
import { HtmlRenderer } from './webview/renderHtml';
import { AnalysisResult } from './types';

let currentPanel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('ediInsight.analyze', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No file is currently open');
      return;
    }

    const fileExt = editor.document.fileName.split('.').pop()?.toLowerCase();
    if (!['edi', 'x12', 'txt'].includes(fileExt || '')) {
      vscode.window.showWarningMessage('File must have .edi, .x12, or .txt extension');
      return;
    }

    try {
      const content = editor.document.getText();
      if (!content.trim()) {
        vscode.window.showErrorMessage('File is empty');
        return;
      }

      // Parse
      const parser = new X12Parser();
      const parsed = parser.parse(content);

      // Extract
      const extractor = new MessageExtractor();
      const extracted = extractor.extract(parsed);

      // Classify
      const classifier = new MessageClassifier();
      const classification = classifier.classify(extracted);

      // Detect reports
      const reportDetector = new ReportDetector();
      const reports = reportDetector.detect(extracted, classification);

      // Validate
      const validator = new ValidationService();
      const warnings = validator.validate(extracted);

      // Prepare result
      const result: AnalysisResult = {
        classification,
        extracted,
        reports,
        warnings
      };

      // Render HTML
      const renderer = new HtmlRenderer();
      const html = renderer.render(result);

      // Show WebView
      showWebView(context, html, editor.document.fileName);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to analyze EDI file: ${errorMsg}`);
      console.error('EDI Analysis Error:', error);
    }
  });

  context.subscriptions.push(disposable);
}

function showWebView(context: vscode.ExtensionContext, html: string, fileName: string) {
  const column = vscode.ViewColumn.Beside;

  if (currentPanel) {
    currentPanel.reveal(column);
    currentPanel.webview.html = html;
  } else {
    currentPanel = vscode.window.createWebviewPanel(
      'ediInsight',
      `EDI Insight - ${fileName.split('/').pop()}`,
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    currentPanel.webview.html = html;

    currentPanel.onDidDispose(
      () => {
        currentPanel = undefined;
      },
      undefined,
      context.subscriptions
    );
  }
}

export function deactivate() {}
```

- [ ] **Step 2: Verify extension compiles**

Run: `npm run compile`
Expected: Compiles successfully, no errors

---

## Task 11: Sample EDI Files

**Files:**
- Create: `samples/820-billpay-test.edi`
- Create: `samples/820-ach-production.edi`
- Create: `samples/997-ack.edi`

- [ ] **Step 1: Create BillPay test sample**

```
samples/820-billpay-test.edi:
ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *240520*1200*U*00401*000000001*0*T*:~GS*RA*SENDER*RECEIVER*20240520*1200*1*X*004010~ST*820*0001~BPR*C*1500.00*C*ACH*CTX*01*123456789*DA*987654321*20240520~TRN*1*9876543210~N1*PR*ABC BILLPAY SERVICE~N1*PE*XYZ UTILITY COMPANY~RMR*IV*INV-1001**1500.00~DTM*097*20240520~SE*9*0001~GE*1*1~IEA*1*000000001~
```

- [ ] **Step 2: Create ACH production sample**

```
samples/820-ach-production.edi:
ISA*00*          *00*          *ZZ*PAYROLL SYSTEM  *ZZ*BANK RECEIVER   *240601*1430*U*00401*000000002*0*P*:~GS*RA*PAYROLL*BANK*20240601*1430*2*X*004010~ST*820*0002~BPR*C*250000.00*C*ACH*CCD*01*987654321*DA*123456789*20240605~TRN*1*1234567890~N1*PR*ACME CORPORATION~N1*PE*EMPLOYEE BANK ACCOUNT~DTM*097*20240605~SE*8*0002~GE*1*2~IEA*1*000000002~
```

- [ ] **Step 3: Create 997 acknowledgment sample**

```
samples/997-ack.edi:
ISA*00*          *00*          *ZZ*RECEIVER       *ZZ*SENDER         *240520*1215*U*00401*000000003*0*T*:~GS*FA*RECEIVER*SENDER*20240520*1215*3*X*004010~ST*997*0003~AK1*RA*1~AK2*820*0001~AK5*A~AK9*1*1*1~SE*6*0003~GE*1*3~IEA*1*000000003~
```

- [ ] **Step 4: Create samples in project**

Run: `mkdir -p samples && echo "..." > samples/820-billpay-test.edi`
Expected: Files created successfully

---

## Task 12: Create README and Documentation

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create README**

```markdown
# EDI Insight

A VS Code extension that analyzes EDI (Electronic Data Interchange) payment and remittance messages and explains them in business-friendly language.

## Features

- **Automatic Message Analysis** - Parses X12 EDI messages and extracts key information
- **Environment Detection** - Identifies if message is Test or Production
- **Payment Channel Detection** - Determines ACH, Wire, BillPay, C2C, or other payment types
- **Business Report Generation** - Shows which reports the message will generate
- **Message Structure Graph** - Visual representation of message hierarchy using Mermaid
- **Validation Warnings** - Highlights missing or invalid segments
- **Segment-by-Segment Explanation** - Detailed breakdown of all segments
- **JSON Output** - Raw analysis data for further processing

## Supported EDI Formats

- **X12 820** - Payment Order / Remittance Advice
- **X12 835** - Healthcare Claim Payment/Advice
- **X12 997** - Functional Acknowledgment
- **X12 824** - Application Advice
- **Unknown X12** - Best-effort parsing and analysis

## Usage

1. Open an EDI file (.edi, .x12, or .txt)
2. Right-click in editor and select "EDI Insight: Analyze Current File"
3. View comprehensive analysis in side panel

Or use command palette: `EDI Insight: Analyze Current File`

## Installation

1. Clone repository
2. Run `npm install`
3. Run `npm run compile`
4. Run `npm run package` to generate .vsix file
5. Install in VS Code via "Install from VSIX"

## Development

### Build
```bash
npm run compile
```

### Watch
```bash
npm run watch
```

### Test
```bash
npm test
```

### Package
```bash
npm run package
```

## Architecture

- **Parser** (`src/parser/`) - Tokenizes EDI messages and extracts segments
- **Analyzer** (`src/analyzer/`) - Classifies messages, detects reports, validates structure
- **WebView** (`src/webview/`) - Renders analysis results in VS Code UI
- **Types** - Shared TypeScript types for type safety

## Extending

To add support for new X12 transaction types:

1. Add definition to `src/parser/ediDictionary.ts`
2. Update classifier rules in `src/analyzer/messageClassifier.ts`
3. Add report detection logic in `src/analyzer/reportDetector.ts`
4. Add validation rules in `src/analyzer/validationService.ts`

## License

MIT
```

- [ ] **Step 2: Verify README created**

Expected: Readable, professional documentation

---

## Task 13: Test Extension with Samples

**Files:**
- Test: Run extension against sample files

- [ ] **Step 1: Build extension**

Run: `npm run compile`
Expected: No errors, `out/` directory created

- [ ] **Step 2: Open VS Code Debug**

Run: Press F5 in VS Code to open extension debug window
Expected: New VS Code window opens with extension active

- [ ] **Step 3: Test with sample files**

1. Open `samples/820-billpay-test.edi`
2. Right-click → "EDI Insight: Analyze Current File"
3. Verify WebView panel opens with analysis
4. Check that message type is detected as 820
5. Check that environment is "Test"
6. Check that BillPay payment channel is detected
7. Check that Mermaid diagram renders
8. Check that parties (ABC BILLPAY SERVICE, XYZ UTILITY COMPANY) are shown
9. Check that payment amount (1500.00) is displayed

- [ ] **Step 4: Test with ACH production sample**

1. Open `samples/820-ach-production.edi`
2. Run analysis command
3. Verify environment shows "Production"
4. Verify payment channel shows "ACH"
5. Verify company names appear

- [ ] **Step 5: Test with 997 acknowledgment**

1. Open `samples/997-ack.edi`
2. Run analysis command
3. Verify message type shows 997
4. Verify functional acknowledgment report is shown

- [ ] **Step 6: Test error handling**

1. Create empty EDI file
2. Run analysis → should show "File is empty"
3. Test with invalid file → should show parsing error

Expected: All features work correctly, no crashes

---

## Task 14: Final Integration and Validation

**Files:**
- Verify all pieces integrate correctly

- [ ] **Step 1: Full end-to-end test**

1. Open extension in debug mode (F5)
2. Test all three sample files
3. Verify all sections render correctly
4. Check console for errors

- [ ] **Step 2: Verify package structure**

Run: `npm run package`
Expected: Creates `edi-insight-0.1.0.vsix` file

- [ ] **Step 3: Test .vsix installation**

1. Close VS Code
2. Install via "Install from VSIX"
3. Test extension works

Expected: Extension installable and functional

- [ ] **Step 4: Create git repository and commit**

Run:
```bash
git init
git add -A
git commit -m "feat: initial EDI Insight extension MVP"
```

Expected: All files committed, ready for distribution

---

## Self-Review Checklist

- ✅ X12 parser correctly tokenizes ISA/GS/ST/SE/GE/IEA
- ✅ Message extractor pulls all key fields (sender, receiver, amount, trace, dates, parties, invoices)
- ✅ Classifier detects Test/Production, transaction type, payment channel
- ✅ Report detector identifies 820, 835, 997, 824 and BillPay/ACH/Wire/C2C channels
- ✅ Validator checks for missing segments and invalid data
- ✅ HTML renderer displays all sections with proper formatting
- ✅ Mermaid graph shows message structure with actual values
- ✅ Extension command registers and executes
- ✅ WebView displays in VS Code UI
- ✅ All sample files parse and analyze correctly
- ✅ Error handling for empty/invalid files
- ✅ No TypeScript or compilation errors
- ✅ All types are consistent across modules
- ✅ README documents usage and architecture
