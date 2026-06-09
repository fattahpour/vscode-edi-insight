import { ExtractedMessage, MessageClassification, Report } from '../types';

export interface OutputProfile {
  hasHandoffReport: boolean;
  handoffReports: string[];
  statusReports: string[];
  cadence: 'One-time' | 'Real-time' | 'Daily' | 'Weekly' | 'Monthly' | 'Recurring' | 'Unknown';
  cadenceReason: string;
  confidence: 'High' | 'Medium' | 'Low';
}

const HANDOFF_REPORT_TERMS = [
  'payment',
  'settlement',
  'remittance',
  'transfer',
  'healthcare',
  'invoice'
];

const STATUS_REPORT_TERMS = ['acknowledgment', 'application advice'];

export class OutputProfiler {
  profile(
    extracted: ExtractedMessage,
    classification: MessageClassification,
    reports: Report[]
  ): OutputProfile {
    const handoffReports: string[] = [];
    const statusReports: string[] = [];

    for (const report of reports) {
      const reportName = report.name.toLowerCase();
      if (STATUS_REPORT_TERMS.some(term => reportName.includes(term))) {
        statusReports.push(report.name);
      } else if (HANDOFF_REPORT_TERMS.some(term => reportName.includes(term))) {
        handoffReports.push(report.name);
      }
    }

    const cadenceProfile = this.inferCadence(extracted, classification);

    return {
      hasHandoffReport: handoffReports.length > 0,
      handoffReports,
      statusReports,
      ...cadenceProfile
    };
  }

  private inferCadence(
    extracted: ExtractedMessage,
    classification: MessageClassification
  ): Pick<OutputProfile, 'cadence' | 'cadenceReason' | 'confidence'> {
    const transactionType = classification.messageCode.toUpperCase();
    const paymentFormat = extracted.paymentFormat?.toUpperCase();

    if (transactionType === '997') {
      return {
        cadence: 'Real-time',
        confidence: 'High',
        cadenceReason: 'Functional acknowledgments are returned per received interchange (event-driven), not on a schedule.'
      };
    }

    if (transactionType === '824') {
      return {
        cadence: 'Real-time',
        confidence: 'Medium',
        cadenceReason: 'Application advice is generated in response to a received message.'
      };
    }

    if (transactionType === '820' && classification.paymentChannel === 'BillPay') {
      return {
        cadence: 'Daily',
        confidence: 'Medium',
        cadenceReason: 'Bill-pay settlement files are typically batched and exchanged daily.'
      };
    }

    if (
      transactionType === '820' &&
      classification.paymentChannel === 'ACH' &&
      paymentFormat === 'CCD'
    ) {
      return {
        cadence: 'Recurring',
        confidence: 'Low',
        cadenceReason: 'ACH CCD corporate credits commonly fund payroll/vendor cycles (weekly/biweekly); exact period not encoded in EDI.'
      };
    }

    if (
      transactionType === '820' &&
      classification.paymentChannel === 'ACH' &&
      paymentFormat === 'CTX'
    ) {
      return {
        cadence: 'Daily',
        confidence: 'Low',
        cadenceReason: 'ACH CTX B2B remittance batches are usually exchanged daily.'
      };
    }

    if (transactionType === '820' && classification.paymentChannel === 'Wire') {
      return {
        cadence: 'One-time',
        confidence: 'Medium',
        cadenceReason: 'Wire transfers are per-transaction, initiated ad hoc.'
      };
    }

    if (transactionType === '820' && classification.paymentChannel === 'C2C') {
      return {
        cadence: 'Real-time',
        confidence: 'Low',
        cadenceReason: 'Consumer-to-consumer transfers are initiated per event.'
      };
    }

    return {
      cadence: 'Unknown',
      confidence: 'Low',
      cadenceReason: 'Not enough signal to infer a schedule; EDI does not carry an explicit cadence field.'
    };
  }
}
