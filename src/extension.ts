import * as vscode from 'vscode';
import { X12Parser, MessageExtractor } from './parser/x12Parser';
import { MessageClassifier } from './analyzer/messageClassifier';
import { ReportDetector } from './analyzer/reportDetector';
import { SegmentGrouper } from './analyzer/segmentGrouper';
import { OutputProfiler } from './analyzer/outputProfiler';
import { ValidationService } from './analyzer/validationService';
import { HtmlRenderer } from './webview/renderHtml';
import { AnalysisResult } from './types';

let currentPanel: vscode.WebviewPanel | undefined;
let currentSourceUri: vscode.Uri | undefined;

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
      const html = new HtmlRenderer().render(analyze(content), content);
      currentSourceUri = editor.document.uri;
      showWebView(context, html, editor.document.fileName);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to analyze EDI file: ${errorMsg}`);
      console.error('EDI Analysis Error:', error);
    }
  });

  context.subscriptions.push(disposable);
}

function showWebView(context: vscode.ExtensionContext, html: string, fileName: string) {
  const column = vscode.ViewColumn.Beside;

  if (!currentPanel) {
    currentPanel = vscode.window.createWebviewPanel(
      'ediInsight',
      `EDI Insight - ${fileName.split('/').pop()}`,
      column,
      { enableScripts: true, retainContextWhenHidden: true }
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

  currentPanel.webview.html = html;
}

async function handleMessage(msg: { type?: string; content?: string }) {
  if (!currentPanel) { return; }
  const content = msg.content ?? '';

  if (msg.type === 'reanalyze') {
    try {
      if (!content.trim()) { throw new Error('Source is empty.'); }
      currentPanel.webview.html = new HtmlRenderer().render(analyze(content), content);
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

export function deactivate() {}
