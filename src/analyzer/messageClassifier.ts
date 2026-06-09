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
      paymentChannel: paymentChannel as 'ACH' | 'Wire' | 'Check' | 'BillPay' | 'C2C' | 'Unknown'
    };
  }

  private detectPaymentChannel(extracted: ExtractedMessage): string {
    const method = extracted.paymentMethod?.toUpperCase() || '';

    if (method === 'ACH') return 'ACH';
    if (method === 'WIR') return 'Wire';
    if (method === 'CHK') return 'Check';

    const allText = this.buildSearchText(extracted);
    if (allText.includes('billpay') || allText.includes('bill pay') ||
        allText.includes('utility') || allText.includes('consumer bill') ||
        allText.includes('invoice payment')) {
      return 'BillPay';
    }

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
