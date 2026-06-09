import * as path from 'path';
import * as vscode from 'vscode';
import { X12Parser, MessageExtractor } from './parser/x12Parser';
import { MessageClassifier } from './analyzer/messageClassifier';
import { ReportDetector } from './analyzer/reportDetector';
import { SegmentGrouper } from './analyzer/segmentGrouper';
import { OutputProfiler } from './analyzer/outputProfiler';
import { ValidationService } from './analyzer/validationService';
import { HtmlRenderer } from './webview/renderHtml';
import { AnalysisResult } from './types';
import { ExportService, ExportFormat } from './exporter/exportService';

let currentPanel: vscode.WebviewPanel | undefined;
let currentSourceUri: vscode.Uri | undefined;
let currentResult: AnalysisResult | undefined;
let currentRawContent: string = '';

export function analyze(content: string): AnalysisResult {
  const parsed = new X12Parser().parse(content);
  const extracted = new MessageExtractor().extract(parsed);
  const classification = new MessageClassifier().classify(extracted);
  const reports = new ReportDetector().detect(extracted, classification);
  const segmentGroups = new SegmentGrouper().group(extracted.allSegments);
  const outputProfile = new OutputProfiler().profile(extracted, classification, reports);
  const warnings = new ValidationService().validate(extracted);
  return { classification, extracted, reports, warnings, segmentGroups, outputProfile };
}

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('ediInsight.analyze', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No file is currently open');
      return;
    }

    const fileExt = editor.document.fileName.split('.').pop()?.toLowerCase();
    if (!['edi', 'x12', 'txt'].includes(fileExt || '')) {
      vscode.window.showWarningMessage('File must have .edi, .x12, or .txt extension');
      return;
    }

    const content = editor.document.getText();
    if (!content.trim()) {
      vscode.window.showErrorMessage('File is empty');
      return;
    }

    try {
      currentSourceUri = editor.document.uri;
      currentResult = analyze(content);
      currentRawContent = content;
      const panel = ensurePanel(context, editor.document.fileName);
      panel.webview.html = new HtmlRenderer().render(currentResult, content, buildAssets(context, panel.webview));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to analyze EDI file: ${errorMsg}`);
      console.error('EDI Analysis Error:', error);
    }
  });

  context.subscriptions.push(disposable);
}

function nonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 32; i++) { out += chars.charAt(Math.floor(Math.random() * chars.length)); }
  return out;
}

function buildAssets(context: vscode.ExtensionContext, webview: vscode.Webview) {
  const mermaidUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'mermaid.min.js')
  ).toString();
  return { mermaidUri, cspSource: webview.cspSource, nonce: nonce() };
}

function ensurePanel(context: vscode.ExtensionContext, fileName: string): vscode.WebviewPanel {
  const column = vscode.ViewColumn.Beside;

  if (!currentPanel) {
    currentPanel = vscode.window.createWebviewPanel(
      'ediInsight',
      `EDI Insight - ${fileName.split('/').pop()}`,
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')]
      }
    );

    currentPanel.webview.onDidReceiveMessage(
      (msg) => handleMessage(msg),
      undefined,
      context.subscriptions
    );

    currentPanel.onDidDispose(() => { currentPanel = undefined; }, undefined, context.subscriptions);
  } else {
    currentPanel.reveal(column);
  }

  return currentPanel;
}

async function handleMessage(msg: { type?: string; content?: string }) {
  if (!currentPanel) { return; }
  const content = msg.content ?? '';

  if (msg.type === 'export') {
    await handleExport();
    return;
  }

  if (msg.type === 'reanalyze') {
    try {
      if (!content.trim()) { throw new Error('Source is empty.'); }
      const fragment = new HtmlRenderer().fragment(analyze(content));
      currentPanel.webview.postMessage({ type: 'rendered', chips: fragment.chips, sections: fragment.sections });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      currentPanel.webview.postMessage({ type: 'error', message });
    }
    return;
  }

  if (msg.type === 'save') {
    if (!currentSourceUri) {
      currentPanel.webview.postMessage({ type: 'error', message: 'No source file to save to.' });
      return;
    }
    try {
      const doc = await vscode.workspace.openTextDocument(currentSourceUri);
      const edit = new vscode.WorkspaceEdit();
      const fullRange = new vscode.Range(
        doc.positionAt(0),
        doc.positionAt(doc.getText().length)
      );
      edit.replace(currentSourceUri, fullRange, content);
      const applied = await vscode.workspace.applyEdit(edit);
      if (!applied) { throw new Error('Edit could not be applied.'); }
      await doc.save();
      currentPanel.webview.postMessage({ type: 'saved' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      currentPanel.webview.postMessage({ type: 'error', message });
    }
  }
}

async function handleExport(): Promise<void> {
  if (!currentPanel || !currentResult) { return; }

  const formatItems: Array<{ label: string; description: string; format: ExportFormat }> = [
    { label: 'HTML', description: 'Standalone HTML file with embedded styles', format: 'html' },
    { label: 'JSON', description: 'Full analysis result as structured JSON', format: 'json' },
    { label: 'Markdown', description: 'Structured markdown summary with tables', format: 'md' },
    { label: 'CSV', description: 'Tabular data (parties, remittance, segments)', format: 'csv' },
  ];

  const picked = await vscode.window.showQuickPick(formatItems, { placeHolder: 'Choose export format' });
  if (!picked) { return; }

  const baseName = currentSourceUri
    ? path.basename(currentSourceUri.fsPath).replace(/\.[^.]+$/, '')
    : 'edi-analysis';

  const filterMap: Record<ExportFormat, Record<string, string[]>> = {
    html: { 'HTML Files': ['html'] },
    json: { 'JSON Files': ['json'] },
    md:   { 'Markdown Files': ['md'] },
    csv:  { 'CSV Files': ['csv'] },
  };

  const defaultUri = currentSourceUri
    ? vscode.Uri.file(path.join(path.dirname(currentSourceUri.fsPath), `${baseName}.analysis.${picked.format}`))
    : undefined;

  const saveUri = await vscode.window.showSaveDialog({ defaultUri, filters: filterMap[picked.format] });
  if (!saveUri) { return; }

  try {
    const output = new ExportService().export(picked.format, currentResult, currentRawContent, baseName);
    await vscode.workspace.fs.writeFile(saveUri, Buffer.from(output, 'utf8'));
    currentPanel.webview.postMessage({ type: 'exported', path: saveUri.fsPath });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    currentPanel.webview.postMessage({ type: 'error', message });
  }
}

export function deactivate() {}
