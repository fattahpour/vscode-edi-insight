import { AnalysisResult } from '../types';
import { HtmlRenderer } from '../webview/renderHtml';
import { MermaidGraphGenerator } from '../webview/mermaidGraph';

export type ExportFormat = 'html' | 'json' | 'md' | 'csv';

export class ExportService {
  export(format: ExportFormat, result: AnalysisResult, rawContent: string, sourceName: string): string {
    switch (format) {
      case 'json': return this.toJson(result);
      case 'csv':  return this.toCsv(result);
      case 'md':   return this.toMarkdown(result, sourceName);
      case 'html': return this.toHtml(result, rawContent);
    }
  }

  private toJson(result: AnalysisResult): string {
    return JSON.stringify(result, null, 2);
  }

  private toCsv(_result: AnalysisResult): string { return ''; }

  private toMarkdown(_result: AnalysisResult, _sourceName: string): string { return ''; }

  private toHtml(_result: AnalysisResult, _rawContent: string): string { return ''; }
}
