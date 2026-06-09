# Change Log

All notable changes to the **EDI Insight** extension are documented here.

## [0.1.4] - 2026-06-09

### Changed
- **100% offline / zero network.** Mermaid is now bundled in the extension
  (`media/mermaid.min.js`) instead of loaded from a CDN. No data is ever sent
  or received by the extension.
- Webview locked down with a strict Content-Security-Policy
  (`default-src 'none'`) plus a per-render nonce — scripts run only from the
  extension bundle, and all outbound network is blocked.

### Fixed
- **Re-analyze no longer hangs.** The results panel now updates in place via
  message passing instead of reloading the whole webview, so Re-analyze is
  instant and never gets stuck on "Re-analyzing…".
- Mermaid graph loads non-blocking (`defer`) with retry and a graceful
  fallback if rendering is unavailable.

## [0.1.3] - 2026-06-09

### Added
- Theme-native UI overhaul (uses VS Code theme variables).
- **Edit Source** mode: edit the EDI inline, then Re-analyze or Save to file.

## [0.1.2] - 2026-06-09

### Added
- Segment grouping, downstream handoff-report detection, and output cadence
  inference (one-time / daily / weekly / ...).

## [0.1.1] - 2026-06-09

### Fixed
- Valid Mermaid 11 graph syntax and pretty JSON rendering.

## [0.1.0] - 2026-06-09

### Added
- Initial release: ANSI X12 820 / 835 / 997 / 824 analysis, environment
  (Test/Production) detection, payment-channel classification, business report
  detection, payment summary, flow graph, segment-by-segment explanation,
  validation warnings, and JSON output. EDI syntax highlighting.
