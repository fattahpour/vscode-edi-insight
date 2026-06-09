import { ExtractedMessage, MessageClassification, Report } from '../types';
export declare class ReportDetector {
    detect(extracted: ExtractedMessage, classification: MessageClassification): Report[];
}
