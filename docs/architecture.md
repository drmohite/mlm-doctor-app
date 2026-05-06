# MLM Doctor Architecture

## Overview

MLM Doctor is a static, client-side web IDE for Arden Syntax authoring and review.
It has no backend service and runs entirely in the browser.

## Runtime Components

- `index.html`: Application shell, panel layout, Monaco bootstrapping, and script wiring.
- `app.js`: Main orchestration layer (editor lifecycle, file operations, shortcuts, panel updates).
- `language/*`: Arden language features (tokenizer, symbols, completion, hover, formatter, linter).
- `panels/*`: UI panel rendering and interactions (outline, problems, context, flow).
- `sw.js`: Service worker for offline-first asset caching.
- `manifest.json`: PWA install metadata and app shortcuts.

## Data Flow

1. Monaco editor initializes and loads the default welcome model.
2. User opens a file/folder through the File System Access API.
3. Active model content is analysed and propagated to panels:
   - Outline panel for symbol navigation
   - Problems panel for lint diagnostics and references
   - Context panel for structured extraction
   - Flow panel for logic graph visualization
4. Save operations write directly to local file handles when permission is available.

## Offline and Deployment Model

- Local static assets are pre-cached by the service worker.
- External Monaco and font assets are runtime-cached after first successful fetch.
- Production hosting is static (Render) using `render.yaml`.

## Security and Privacy Posture

- No application backend and no database layer.
- Clinical logic remains local to the browser runtime and user-selected files.
- Security headers are configured at the static host level.

