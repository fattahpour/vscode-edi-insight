"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const x12Parser_1 = require("./parser/x12Parser");
const messageClassifier_1 = require("./analyzer/messageClassifier");
const reportDetector_1 = require("./analyzer/reportDetector");
const validationService_1 = require("./analyzer/validationService");
const renderHtml_1 = require("./webview/renderHtml");
let currentPanel;
function activate(context) {
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
            const parser = new x12Parser_1.X12Parser();
            const parsed = parser.parse(content);
            const extractor = new x12Parser_1.MessageExtractor();
            const extracted = extractor.extract(parsed);
            const classifier = new messageClassifier_1.MessageClassifier();
            const classification = classifier.classify(extracted);
            const reportDetector = new reportDetector_1.ReportDetector();
            const reports = reportDetector.detect(extracted, classification);
            const validator = new validationService_1.ValidationService();
            const warnings = validator.validate(extracted);
            const result = {
                classification,
                extracted,
                reports,
                warnings
            };
            const renderer = new renderHtml_1.HtmlRenderer();
            const html = renderer.render(result);
            showWebView(context, html, editor.document.fileName);
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to analyze EDI file: ${errorMsg}`);
            console.error('EDI Analysis Error:', error);
        }
    });
    context.subscriptions.push(disposable);
}
function showWebView(context, html, fileName) {
    const column = vscode.ViewColumn.Beside;
    if (currentPanel) {
        currentPanel.reveal(column);
        currentPanel.webview.html = html;
    }
    else {
        currentPanel = vscode.window.createWebviewPanel('ediInsight', `EDI Insight - ${fileName.split('/').pop()}`, column, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        currentPanel.webview.html = html;
        currentPanel.onDidDispose(() => {
            currentPanel = undefined;
        }, undefined, context.subscriptions);
    }
}
function deactivate() { }
