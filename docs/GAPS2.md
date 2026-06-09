# EDI Insight — Feature Batch 2

Project: /home/peyman/Desktop/workstation/vscode-edi-insight-plugin (TypeScript strict, builds out/ via npm run compile, tests via npm test node:test).

## F1: Segment grouping
Create src/analyzer/segmentGrouper.ts exporting:
  interface SegmentGroup { name: string; description: string; segments: Segment[]; }
  class SegmentGrouper { group(segments: Segment[]): SegmentGroup[] }
Group by tag into these ordered buckets (skip empty groups):
  - "Interchange Envelope" (ISA, IEA) — outermost wrapper
  - "Functional Group" (GS, GE)
  - "Transaction Set" (ST, SE)
  - "Payment" (BPR)
  - "Trace" (TRN)
  - "Parties" (N1, ENT, PER)
  - "Remittance / Invoice" (RMR)
  - "Dates & References" (DTM, REF)
  - "Notes" (NTE)
  - "Acknowledgment" (AK1, AK2, AK3, AK4, AK5, AK9)
  - "Other" (anything not matched)
Each group keeps segments in original order.

## F2 + F3: Output profile (handoff report + cadence)
Create src/analyzer/outputProfiler.ts exporting:
  interface OutputProfile {
    hasHandoffReport: boolean;
    handoffReports: string[];   // downstream business deliverables
    statusReports: string[];    // acknowledgments / status only
    cadence: 'One-time' | 'Real-time' | 'Daily' | 'Weekly' | 'Monthly' | 'Recurring' | 'Unknown';
    cadenceReason: string;      // human explanation (this is an INFERENCE, say so)
    confidence: 'High' | 'Medium' | 'Low';
  }
  class OutputProfiler { profile(extracted: ExtractedMessage, classification: MessageClassification, reports: Report[]): OutputProfile }

Handoff logic:
  - A report is a HANDOFF if its name is a business deliverable: contains any of
    'Payment','Settlement','Remittance','Transfer','Healthcare','Invoice'.
  - A report is STATUS (not handoff) if name contains 'Acknowledgment' or 'Application Advice'.
  - hasHandoffReport = handoffReports.length > 0.

Cadence inference (transaction type + channel + BPR05 payment format = extracted.paymentFormat):
  - txn 997 -> 'Real-time', confidence High, reason "Functional acknowledgments are returned per received interchange (event-driven), not on a schedule."
  - txn 824 -> 'Real-time', confidence Medium, reason "Application advice is generated in response to a received message."
  - txn 820 + channel BillPay -> 'Daily', confidence Medium, reason "Bill-pay settlement files are typically batched and exchanged daily."
  - txn 820 + channel ACH + format CCD -> 'Recurring', confidence Low, reason "ACH CCD corporate credits commonly fund payroll/vendor cycles (weekly/biweekly); exact period not encoded in EDI."
  - txn 820 + channel ACH + format CTX -> 'Daily', confidence Low, reason "ACH CTX B2B remittance batches are usually exchanged daily."
  - txn 820 + channel Wire -> 'One-time', confidence Medium, reason "Wire transfers are per-transaction, initiated ad hoc."
  - txn 820 + channel C2C -> 'Real-time', confidence Low, reason "Consumer-to-consumer transfers are initiated per event."
  - else -> 'Unknown', confidence Low, reason "Not enough signal to infer a schedule; EDI does not carry an explicit cadence field."

## Wiring
- Extend AnalysisResult (src/types/index.ts) with: segmentGroups: SegmentGroup[]; outputProfile: OutputProfile;
- Update src/extension.ts to build both and include in result.
- Update src/webview/renderHtml.ts:
  - New section "Handoff & Output Cadence" (place right after Business Report Detection):
    show hasHandoffReport as a clear YES/NO badge, list handoff reports, list status reports,
    show cadence big, with confidence badge and cadenceReason text (label it "Estimated").
  - Replace the flat "Segment Explanation" table with grouped rendering: one subsection per
    SegmentGroup (group name + description heading), each containing the existing element-by-element
    SegmentExplainer breakdown for its segments. Keep using SegmentExplainer.
- Add a unit test in src/test for: handoff yes for 820-billpay-test.edi, handoff no for 997-ack.edi;
  cadence Daily for billpay sample, Real-time for 997; segmentGrouper buckets ISA/IEA into Interchange Envelope.

## Constraints
strict TS clean, npm run compile zero errors, npm test all pass, no new deps, offline.
