import { ExtractedMessage, MessageClassification } from '../types';
export declare class MessageClassifier {
    classify(extracted: ExtractedMessage): MessageClassification;
    private detectPaymentChannel;
    private buildSearchText;
}
