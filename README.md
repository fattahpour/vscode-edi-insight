# EDI Insight

A VS Code extension that analyzes EDI (Electronic Data Interchange) payment and remittance messages and explains them in business-friendly language.

## Features

- **Automatic Message Analysis** - Parses X12 EDI messages and extracts key information
- **Environment Detection** - Identifies if message is Test or Production
- **Payment Channel Detection** - Determines ACH, Wire, BillPay, C2C, or other payment types
- **Business Report Generation** - Shows which reports the message will generate
- **Message Structure Graph** - Visual representation of message hierarchy using Mermaid
- **Validation Warnings** - Highlights missing or invalid segments
- **Segment-by-Segment Explanation** - Detailed breakdown of all segments
- **JSON Output** - Raw analysis data for further processing

## Supported EDI Formats

- **X12 820** - Payment Order / Remittance Advice
- **X12 835** - Healthcare Claim Payment/Advice
- **X12 997** - Functional Acknowledgment
- **X12 824** - Application Advice
- **Unknown X12** - Best-effort parsing and analysis

## Usage

1. Open an EDI file (.edi, .x12, or .txt)
2. Right-click in editor and select "EDI Insight: Analyze Current File"
3. View comprehensive analysis in side panel

Or use command palette: `EDI Insight: Analyze Current File`

## Installation

1. Clone repository
2. Run `npm install`
3. Run `npm run compile`
4. Run `npm run package` to generate .vsix file
5. Install in VS Code via "Install from VSIX"

## Development

### Build
```bash
npm run compile
```

### Watch
```bash
npm run watch
```

### Test
```bash
npm test
```

### Package
```bash
npm run package
```

## Architecture

- **Parser** (`src/parser/`) - Tokenizes EDI messages and extracts segments
- **Analyzer** (`src/analyzer/`) - Classifies messages, detects reports, validates structure
- **WebView** (`src/webview/`) - Renders analysis results in VS Code UI
- **Types** - Shared TypeScript types for type safety

## Extending

To add support for new X12 transaction types:

1. Add definition to `src/parser/ediDictionary.ts`
2. Update classifier rules in `src/analyzer/messageClassifier.ts`
3. Add report detection logic in `src/analyzer/reportDetector.ts`
4. Add validation rules in `src/analyzer/validationService.ts`

## License

MIT
