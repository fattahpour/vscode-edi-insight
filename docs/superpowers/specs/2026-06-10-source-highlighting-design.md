# Source Highlighting & Validation Markers — Design

## Goal

Colorize EDI message sections by business group, highlight date/time fields, and visually flag invalid segments — both in the webview analysis panel and (best-effort) in the VS Code text editor.

## 1. Architecture & Data Flow

**New module:** `src/webview/sourceHighlighter.ts`

```ts
export class SourceHighlighter {
  highlight(extracted: ExtractedMessage, segmentGroups: SegmentGroup[], warnings: ValidationWarning[]): string;
}
```

For each `segment` in `extracted.allSegments` (original order):
- Determine which `SegmentGroup` it belongs to → assign CSS group class (`edi-group-envelope`, `edi-group-payment`, etc.)
- Re-render `segment.raw` element-by-element using `SEGMENT_DEFINITIONS` (same lookup `SegmentExplainer` uses):
  - Wrap each element value in `<span>`
  - If `elementDefinition.type === 'date' | 'time'`, add class `edi-datetime`
  - Separators (`*`, `~`, `:`) wrapped in `<span class="edi-sep">`
- If `segment.tag` appears in any `warning.affectedSegments`, wrap the whole line in `<span class="edi-invalid edi-invalid-{severity}" title="{joined warning messages}">` with a leading icon (❌/⚠️/ℹ️)
- Output: `<pre class="edi-annotated-source">` containing one `<div class="edi-line">...</div>` per segment, preceded by a legend bar (one swatch per group + "Date/Time" + "Invalid")

**Plumbing change:** `ExtractedMessage` gains:
```ts
separators: { element: string; subElement: string; segment: string };
```
Populated in `MessageExtractor.extract()` from `ParsedMessage.separators` — needed to know the element-separator character when re-joining.

**Wiring:** `renderHtml.ts` calls `new SourceHighlighter().highlight(...)`, places result in a new top section "Annotated Source" — open by default, first section (before "Message Overview").

## 2. Visual Design (Colors & Legend)

**Group palette** — 11 fixed hues (HSL), one per `SegmentGroup` (10 named groups + "Other"). Background = `hsla(h,70%,50%,0.15)`, left-border accent = `hsla(h,70%,50%,0.9)`. Text color untouched (theme fg preserved):

| Group | Hue |
|---|---|
| Interchange Envelope | 210 (blue) |
| Functional Group | 265 (indigo) |
| Transaction Set | 45 (amber) |
| Payment | 150 (green) |
| Trace | 190 (cyan) |
| Parties | 25 (orange) |
| Remittance / Invoice | 340 (rose) |
| Dates & References | 300 (magenta) |
| Notes | 0, sat 0 (gray) |
| Acknowledgment | 80 (lime) |
| Other | 0, sat 0, lighter (light gray) |

**Date/Time spans** (`.edi-datetime`): dotted underline + slightly bold, fixed accent color independent of group hue — stands out within any group.

**Invalid segments**: 4px solid left border — red (error) / yellow (warning) / blue (info) — plus icon prefix and `title` tooltip with the warning message(s).

**Legend bar**: one swatch per `SegmentGroup.name`, plus "Date/Time" and "Invalid" entries.

## 3. Editor Grammar, Table Integration, Export & Testing

**TextMate grammar** (`syntaxes/edi.tmLanguage.json`) — add 13 new `match` patterns, placed *before* the existing generic "Segment Tag" pattern (TextMate uses array order as tiebreaker for patterns matching at the same start position). Each matches a whole segment via `(?:^|(?<=~))TAG(?:\*[^*~]*)*` and assigns a `name` scope chosen so common themes render a different color per group:

| Segments | Scope name |
|---|---|
| ISA, IEA | `keyword.control.envelope.edi` |
| GS, GE | `storage.type.functionalgroup.edi` |
| ST, SE | `entity.name.function.transaction.edi` |
| BPR | `support.function.payment.edi` |
| TRN | `variable.parameter.trace.edi` |
| N1, ENT, PER | `entity.name.type.parties.edi` |
| RMR | `constant.character.remittance.edi` |
| DTM, REF | `string.quoted.datesrefs.edi` |
| NTE | `comment.line.notes.edi` |
| AK1-AK9 | `markup.bold.acknowledgment.edi` |
| (everything else) | existing `keyword.control.segment.edi` (unchanged) |

ISA, GS, and DTM additionally get nested capture groups for their date/time elements (ISA09/10, GS04/05, DTM02) → `constant.numeric.date.edi` / `constant.numeric.time.edi`, which overrides the segment color for just that span in themes that color `constant.numeric` distinctly.

Trade-off: separators/terminators inside a colored segment inherit that segment's whole-match scope (no separate dim "operator" color within colored segments). Uncolored "Other" segments keep today's look (tag colored, separators dimmed) via the existing fallback patterns.

Verified manually — TextMate grammars are not unit-testable with `node:test`.

**Segment Explanation table** (`src/analyzer/segmentExplainer.ts`, `src/webview/renderHtml.ts`):
- `SegmentExplanationRow` gains `type?: string` (sourced from `SEGMENT_DEFINITIONS` element definition, same as `SourceHighlighter`)
- Cells where `type === 'date' | 'time'` get `.edi-datetime` class
- Rows for segments in `warnings[].affectedSegments` get the same red/yellow left-border treatment as Annotated Source

**Export**: Annotated Source section + its CSS flow into the standalone HTML export automatically (shared `sections` build + `styles()`). JSON/Markdown/CSV exports unchanged — not visual formats.

**Tests** (`node:test`, extending `src/test/edi.test.ts`):
- `SourceHighlighter`: correct group class per segment, `.edi-datetime` on ISA09/10 and DTM02, `.edi-invalid` wrapper + tooltip text for segments referenced in warnings
- `MessageExtractor`: result includes `separators` matching `ParsedMessage.separators`
- `SegmentExplainer`: rows include `type` field matching dictionary definitions
- `HtmlRenderer.render` / `renderStandalone`: output contains "Annotated Source" section, legend markup, at least one `edi-group-*` class, and an `edi-datetime` span for fixture samples
