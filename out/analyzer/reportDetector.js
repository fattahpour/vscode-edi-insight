"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportDetector = void 0;
class ReportDetector {
    detect(extracted, classification) {
        const reports = [];
        const txnType = classification.messageCode;
        const channel = classification.paymentChannel;
        if (txnType === '820') {
            if (channel === 'ACH') {
                reports.push({
                    name: 'ACH Payment Report',
                    reason: `Payment method is ${channel}`,
                    sourceSegments: ['BPR', 'TRN', 'N1', 'DTM'],
                    keyFields: ['Amount', 'Trace Number', 'Payer', 'Payee', 'Payment Date'],
                    exampleRow: `${extracted.paymentAmount} | ${extracted.traceNumber} | ${extracted.parties[0]?.name} | ${extracted.parties[1]?.name} | ${extracted.paymentDate}`
                });
            }
            else if (channel === 'Wire') {
                reports.push({
                    name: 'Wire Transfer Report',
                    reason: `Payment method is ${channel}`,
                    sourceSegments: ['BPR', 'TRN', 'N1', 'DTM'],
                    keyFields: ['Amount', 'Trace Number', 'Originator', 'Beneficiary', 'Value Date'],
                    exampleRow: `${extracted.paymentAmount} | ${extracted.traceNumber} | ${extracted.parties[0]?.name} | ${extracted.parties[1]?.name} | ${extracted.paymentDate}`
                });
            }
            else if (channel === 'BillPay') {
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
            }
            else if (channel === 'C2C') {
                reports.push({
                    name: 'C2C Transfer Report',
                    reason: `Payment channel detected as ${channel}`,
                    sourceSegments: ['BPR', 'N1', 'TRN', 'DTM'],
                    keyFields: ['Amount', 'From', 'To', 'Trace', 'Date'],
                    exampleRow: `${extracted.paymentAmount} | ${extracted.parties[0]?.name} | ${extracted.parties[1]?.name} | ${extracted.traceNumber} | ${extracted.paymentDate}`
                });
            }
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
        if (txnType === '835') {
            reports.push({
                name: 'Healthcare Claim Payment Report',
                reason: '835 transaction type is healthcare claim payment',
                sourceSegments: ['BPR', 'N1', 'RMR'],
                keyFields: ['Payment Amount', 'Payer', 'Payee', 'Claim Reference'],
                exampleRow: `${extracted.paymentAmount} | ${extracted.parties[0]?.name} | ${extracted.parties[1]?.name} | ${extracted.references[0]?.value}`
            });
        }
        if (txnType === '997') {
            reports.push({
                name: 'Functional Acknowledgment Report',
                reason: '997 transaction type is acknowledgment',
                sourceSegments: ['ST', 'AK1', 'AK2'],
                keyFields: ['Status', 'Functional Group', 'Control Number'],
                exampleRow: 'Message received and processed'
            });
        }
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
exports.ReportDetector = ReportDetector;
