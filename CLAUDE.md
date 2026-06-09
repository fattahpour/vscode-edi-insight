# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VS Code extension for EDI insight plugin. [Add specific purpose and key features]

## Quick Start Commands

### Setup
```bash
npm install
```

### Development
```bash
npm run dev          # Start extension in watch mode
npm run build        # Build extension
npm run watch        # Watch for changes
```

### Testing
```bash
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm test -- <file>   # Run single test file
```

### Quality
```bash
npm run lint         # Run linter
npm run format       # Format code
```

### Extension
```bash
npm run package      # Package .vsix file for distribution
```

## Architecture

### Core Structure
```
src/
├── extension.ts      # Entry point, VS Code activation
├── commands/         # VS Code command handlers
├── views/            # WebView panels/tree views
├── services/         # Business logic (EDI parsing, analysis)
├── utils/            # Helper utilities
└── types/            # TypeScript type definitions
```

### Key Concepts

**Extension Activation**: VS Code loads extension on specific events (command invocation, file open, etc). Define in `package.json` `activationEvents`.

**WebViews**: Use for UI panels. Communicate with extension via message API (`postMessage`/`onDidReceiveMessage`).

**EDI Processing**: [Add details on how EDI files are parsed/analyzed]

**State Management**: [Add how plugin state is managed - in-memory, workspace storage, etc]

## Configuration

### package.json
- `main`: Entry point (compiled `dist/extension.js` or `out/extension.js`)
- `activationEvents`: When plugin loads
- `contributes`: Commands, menus, views, keybindings
- `devDependencies`: Build tools, testing

### tsconfig.json
- Target: ES2020+ (VS Code supports modern JS)
- Module: commonjs (standard for VS Code)
- Strict mode enabled

## Testing Strategy

[Add testing approach: unit tests for services, integration tests for commands, WebView tests, etc]

## Common Tasks

**Add new command**: 
1. Define in `package.json` `contributes.commands`
2. Implement handler in `src/commands/`
3. Register in extension activation
4. Add tests

**Add new view/panel**:
1. Create WebView in `src/views/`
2. Register in extension
3. Add message handlers for communication
4. Style with CSS

**Debug extension**: Run debug config from VS Code (`F5`), opens new window with extension loaded.

## Notes

- Extension runs in Node.js (main thread) + WebView isolated context
- No access to Node APIs from WebView (security sandbox)
- Reload VS Code to test changes (or use watch + restart)
- [Add any custom build steps, special dependencies, or quirks]
