import * as vscode from 'vscode';
import { X12Parser, MessageExtractor } from './parser/x12Parser';
import { MessageClassifier } from './analyzer/messageClassifier';
import { ReportDetector } from './analyzer/reportDetector';
import { ValidationService } from './analyzer/validationService';
import { HtmlRenderer } from './webview/renderHtml';
import { AnalysisResult } from './types';

let currentPanel: vscode.WebviewPanel | undefined;

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

    try {
      const content = editor.document.getText();
      if (!content.trim()) {
        vscode.window.showErrorMessage('File is empty');
        return;
      }

      const parser = new X12Parser();
      const parsed = parser.parse(content);

      const extractor = new MessageExtractor();
      const extracted = extractor.extract(parsed);

      const classifier = new MessageClassifier();
      const classification = classifier.classify(extracted);

      const reportDetector = new ReportDetector();
      const reports = reportDetector.detect(extracted, classification);

      const validator = new ValidationService();
      const warnings = validator.validate(extracted);

      const result: AnalysisResult = {
        classification,
        extracted,
        reports,
        warnings
      };

      const renderer = new HtmlRenderer();
      const html = renderer.render(result);

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

  if (currentPanel) {
    currentPanel.reveal(column);
    currentPanel.webview.html = html;
  } else {
    currentPanel = vscode.window.createWebviewPanel(
      'ediInsight',
      `EDI Insight - ${fileName.split('/').pop()}`,
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    currentPanel.webview.html = html;

    currentPanel.onDidDispose(
      () => {
        currentPanel = undefined;
      },
      undefined,
      context.subscriptions
    );
  }
}

export function deactivate() {}
