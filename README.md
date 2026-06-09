<p align="center">
  <img src="icon.png" width="128" height="128" alt="EDI Insight Logo">
</p>

<h1 align="center">EDI Insight</h1>

<p align="center">
  <strong>Analyze and visualize EDI payment/remittance messages with business-friendly explanations.</strong>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=fattahpour.edi-insight">
    <img src="https://img.shields.io/visual-studio-marketplace/v/fattahpour.edi-insight?label=marketplace&color=0b5cad" alt="Marketplace Version">
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=fattahpour.edi-insight">
    <img src="https://img.shields.io/visual-studio-marketplace/i/fattahpour.edi-insight?color=0b5cad" alt="Installs">
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License">
  </a>
</p>

---

**EDI Insight** is a specialized VS Code extension designed to decode the complexity of X12 EDI messages. It transforms raw, cryptic EDI segments into clear, business-oriented insights and interactive visual diagrams — all while keeping your sensitive data completely secure.

## 🔒 Privacy & Security First

**100% Offline. No network requests. Local analysis only.**

Sensitive payment and healthcare data (PHI/PII) should never leave your environment. EDI Insight is built with a zero-trust architecture regarding your data:
- **Local Parsing:** All analysis is performed entirely within your VS Code instance.
- **No Telemetry:** We do not track your usage or collect data from your EDI files.
- **Strict CSP:** The analysis webview runs under a restricted Content-Security-Policy that blocks all inbound and outbound network traffic.
- **Bundled Dependencies:** Visualization tools like Mermaid.js are bundled locally.

---

## ⚡ Features at a Glance

| Feature | Description |
| :--- | :--- |
| 🔍 **Automatic Analysis** | Instant parsing of X12 EDI messages with key info extraction. |
| 🧪 **Env Detection** | Automatic identification of **Test** vs. **Production** messages. |
| 💳 **Payment Channels** | Detection of **ACH, Wire, BillPay, C2C**, and more. |
| 📊 **Business Reports** | Highlights exactly which downstream reports the message triggers. |
| 🕸️ **Structure Graph** | Interactive **Mermaid** diagrams showing the message hierarchy. |
| ⚠️ **Validation** | Real-time warnings for missing segments or invalid structures. |
| 📝 **Smart Explainer** | Segment-by-segment breakdown grouped by business function. |
| 🔄 **Handoff Insights** | Detection of downstream reports and anticipated output cadence. |
| ✍️ **Edit & Sync** | Inline source editing with instant re-analysis or file saving. |
| 📥 **Export Report** | Export analysis to **HTML, JSON, Markdown, or CSV**. |
| 📋 **JSON Output** | Access raw analysis data for custom processing or automation. |

---

## 🏗️ Supported Formats

| Format | Transaction Type | Use Case |
| :--- | :--- | :--- |
| **X12 820** | Payment Order / Remittance Advice | Payroll, vendor payments, insurance premiums. |
| **X12 835** | Health Care Claim Payment/Advice | Insurance claim adjudications and payments. |
| **X12 997** | Functional Acknowledgment | Confirmation of message receipt and syntax. |
| **X12 824** | Application Advice | Detailed acceptance or rejection of business apps. |
| **X12 Generic** | Any X12 Transaction | Best-effort parsing and structural visualization. |

---

## 🚀 Getting Started

### Installation
Search for **"EDI Insight"** in the VS Code Marketplace, or press `Ctrl+P` and run:
```
ext install fattahpour.edi-insight
```

### Usage
1. **Open** any `.edi`, `.x12`, or `.txt` file containing X12 data.
2. **Right-click** anywhere in the editor.
3. Select **"EDI Insight: Analyze Current File"**.
4. The analysis panel opens on the side with a comprehensive breakdown.

---

## 🛠️ Development

Build and contribute from source:

| Command | Description |
| :--- | :--- |
| `npm install` | Install dependencies. |
| `npm run compile` | Build the TypeScript source. |
| `npm run watch` | Incremental build (development mode). |
| `npm test` | Execute the test suite. |
| `npm run package` | Generate a `.vsix` bundle for installation. |

### Architecture

| Directory | Responsibility |
| :--- | :--- |
| `src/parser/` | Tokenizer and EDI dictionary definitions. |
| `src/analyzer/` | Business logic, classifiers, and validation rules. |
| `src/webview/` | UI components and Mermaid integration. |
| `src/exporter/` | HTML, JSON, Markdown, and CSV report generation. |
| `src/types/` | Shared domain models and type definitions. |

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

<p align="right">(<a href="#top">back to top</a>)</p>
