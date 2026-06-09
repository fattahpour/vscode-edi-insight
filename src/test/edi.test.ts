import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { MessageClassifier } from '../analyzer/messageClassifier';
import { OutputProfiler } from '../analyzer/outputProfiler';
import { ReportDetector } from '../analyzer/reportDetector';
import { SegmentGrouper } from '../analyzer/segmentGrouper';
import { ValidationService } from '../analyzer/validationService';
import { MessageExtractor, X12Parser } from '../parser/x12Parser';

const samplesDirectory = path.resolve(__dirname, '../../samples');
const parser = new X12Parser();
const extractor = new MessageExtractor();
const classifier = new MessageClassifier();

function readSample(name: string): string {
  return readFileSync(path.join(samplesDirectory, name), 'utf8');
}

function extractSample(name: string) {
  return extractor.extract(parser.parse(readSample(name)));
}

test('X12Parser tokenizes fixtures and detects separators', () => {
  const expectedSegmentCounts: Record<string, number> = {
    '820-billpay-test.edi': 12,
    '820-ach-production.edi': 11,
    '997-ack.edi': 10
  };

  for (const [name, expectedCount] of Object.entries(expectedSegmentCounts)) {
    const parsed = parser.parse(readSample(name));

    assert.equal(parsed.segments.length, expectedCount, name);
    assert.equal(parsed.segments[0].tag, 'ISA', name);
    assert.equal(parsed.separators.element, '*', name);
  }
});

test('MessageExtractor extracts bill-pay ISA, payment, and party data', () => {
  const extracted = extractSample('820-billpay-test.edi');

  assert.equal(extracted.senderId, 'SENDER');
  assert.equal(extracted.testProduction, 'T');
  assert.equal(extracted.paymentMethod, 'ACH');
  assert.equal(extracted.paymentDate, '2024-05-20');
  assert.deepEqual(extracted.parties, [
    { code: 'PR', name: 'ABC BILLPAY SERVICE' },
    { code: 'PE', name: 'XYZ UTILITY COMPANY' }
  ]);
});

test('MessageClassifier distinguishes environments and payment channels', () => {
  const billPay = classifier.classify(extractSample('820-billpay-test.edi'));
  const achProduction = classifier.classify(extractSample('820-ach-production.edi'));

  assert.equal(billPay.environment, 'Test');
  assert.equal(billPay.paymentChannel, 'BillPay');
  assert.equal(achProduction.environment, 'Production');
  assert.equal(achProduction.paymentChannel, 'ACH');
});

test('ReportDetector selects reports for ACH payments and acknowledgments', () => {
  const detector = new ReportDetector();
  const ach = extractSample('820-ach-production.edi');
  const acknowledgment = extractSample('997-ack.edi');

  assert.deepEqual(
    detector.detect(ach, classifier.classify(ach)).map(report => report.name),
    ['Payment Summary Report', 'ACH Payment Report']
  );
  assert.deepEqual(
    detector.detect(acknowledgment, classifier.classify(acknowledgment)).map(report => report.name),
    ['Functional Acknowledgment Report']
  );
});

test('ValidationService reports envelope errors without false sample errors', () => {
  const validation = new ValidationService();
  const wellFormed = extractSample('820-ach-production.edi');
  const missingIeaContent = readSample('820-ach-production.edi').replace(/IEA[^~]*~/, '');
  const missingIea = extractor.extract(parser.parse(missingIeaContent));

  assert.deepEqual(
    validation.validate(wellFormed).filter(warning => warning.severity === 'error'),
    []
  );

  const errors = validation.validate(missingIea).filter(warning => warning.severity === 'error');
  assert.equal(errors.length, 1);
  assert.equal(errors[0].message, 'Missing IEA (Interchange Control Trailer) segment');
  assert.deepEqual(errors[0].affectedSegments, ['IEA']);
});

test('OutputProfiler identifies handoffs and infers output cadence', () => {
  const detector = new ReportDetector();
  const profiler = new OutputProfiler();
  const billPay = extractSample('820-billpay-test.edi');
  const acknowledgment = extractSample('997-ack.edi');
  const billPayClassification = classifier.classify(billPay);
  const acknowledgmentClassification = classifier.classify(acknowledgment);

  const billPayProfile = profiler.profile(
    billPay,
    billPayClassification,
    detector.detect(billPay, billPayClassification)
  );
  const acknowledgmentProfile = profiler.profile(
    acknowledgment,
    acknowledgmentClassification,
    detector.detect(acknowledgment, acknowledgmentClassification)
  );

  assert.equal(billPayProfile.hasHandoffReport, true);
  assert.equal(billPayProfile.cadence, 'Daily');
  assert.equal(acknowledgmentProfile.hasHandoffReport, false);
  assert.deepEqual(acknowledgmentProfile.statusReports, ['Functional Acknowledgment Report']);
  assert.equal(acknowledgmentProfile.cadence, 'Real-time');
});

test('SegmentGrouper places ISA and IEA in the interchange envelope', () => {
  const parsed = parser.parse(readSample('820-billpay-test.edi'));
  const groups = new SegmentGrouper().group(parsed.segments);
  const interchangeEnvelope = groups.find(group => group.name === 'Interchange Envelope');

  assert.ok(interchangeEnvelope);
  assert.deepEqual(interchangeEnvelope.segments.map(segment => segment.tag), ['ISA', 'IEA']);
});
