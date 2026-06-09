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
import { ReportDetector as ReportDetectorForRender } from '../analyzer/reportDetector';
import { OutputProfiler as OutputProfilerForRender } from '../analyzer/outputProfiler';
import { HtmlRenderer } from '../webview/renderHtml';
import { ExportService } from '../exporter/exportService';

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

function buildResult(sampleName: string) {
  const raw = readSample(sampleName);
  const extracted = extractSample(sampleName);
  const classification = classifier.classify(extracted);
  const reports = new ReportDetector().detect(extracted, classification);
  return {
    classification,
    extracted,
    reports,
    warnings: new ValidationService().validate(extracted),
    segmentGroups: new SegmentGrouper().group(extracted.allSegments),
    outputProfile: new OutputProfiler().profile(extracted, classification, reports)
  };
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

test('HtmlRenderer embeds editable source and edit controls', () => {
  const raw = readSample('820-billpay-test.edi');
  const extracted = extractSample('820-billpay-test.edi');
  const classification = classifier.classify(extracted);
  const reports = new ReportDetectorForRender().detect(extracted, classification);
  const result = {
    classification,
    extracted,
    reports,
    warnings: new ValidationService().validate(extracted),
    segmentGroups: new SegmentGrouper().group(extracted.allSegments),
    outputProfile: new OutputProfilerForRender().profile(extracted, classification, reports)
  };

  const html = new HtmlRenderer().render(result, raw);

  assert.ok(html.includes('id="ediSource"'), 'has editable source textarea');
  assert.ok(html.includes('Edit Source'), 'has Edit Source button');
  assert.ok(html.includes('acquireVsCodeApi'), 'wires the VS Code messaging API');
  assert.ok(html.includes('ABC BILLPAY SERVICE'), 'embeds the raw EDI content');
  assert.ok(html.includes("type:'reanalyze'") || html.includes('type: \'reanalyze\''), 'posts reanalyze messages');
});

test('ExportService json produces valid JSON matching AnalysisResult shape', () => {
  const svc = new ExportService();
  const result = buildResult('820-billpay-test.edi');
  const json = svc.export('json', result, '', 'test');
  const parsed = JSON.parse(json);
  assert.equal(parsed.classification.environment, 'Test');
  assert.equal(parsed.classification.paymentChannel, 'BillPay');
  assert.ok(Array.isArray(parsed.extracted.parties));
  assert.ok(parsed.extracted.parties.length > 0);
});

test('ExportService md contains title, headings, party table, and Mermaid block', () => {
  const svc = new ExportService();
  const result = buildResult('820-billpay-test.edi');
  const md = svc.export('md', result, '', 'test.edi');
  assert.ok(md.includes('# EDI Analysis: test.edi'), 'has document title');
  assert.ok(md.includes('## Message Overview'), 'has Message Overview heading');
  assert.ok(md.includes('## Business Report Detection'), 'has Business Report Detection heading');
  assert.ok(md.includes('## Parties'), 'has Parties heading');
  assert.ok(md.includes('| PR | ABC BILLPAY SERVICE |'), 'has party data row');
  assert.ok(md.includes('```mermaid'), 'has Mermaid diagram fenced block');
});

test('ExportService csv contains section headers and tabular data', () => {
  const svc = new ExportService();
  const result = buildResult('820-billpay-test.edi');
  const csv = svc.export('csv', result, '', 'test');
  assert.ok(csv.includes('Parties'), 'has Parties section header');
  assert.ok(csv.includes('"Code","Name"'), 'has party column headers');
  assert.ok(csv.includes('"PR","ABC BILLPAY SERVICE"'), 'has party data row');
  assert.ok(csv.includes('Remittance Details'), 'has Remittance Details section header');
  assert.ok(csv.includes('"Invoice Number","Paid Amount"'), 'has remittance column headers');
  assert.ok(csv.includes('Segment Explanation'), 'has Segment Explanation section header');
  assert.ok(csv.includes('"Segment","Position","Name","Value"'), 'has segment column headers');
});
