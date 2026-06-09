"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SEGMENT_DEFINITIONS = exports.TRANSACTION_TYPES = void 0;
exports.TRANSACTION_TYPES = {
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
exports.SEGMENT_DEFINITIONS = {
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
