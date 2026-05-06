# Changelog

All notable changes to this project are documented in this file.

The format is based on Keep a Changelog and uses Semantic Versioning.

## [Unreleased]

### Added
- Release-readiness documentation updates across README, security policy, templates, and maintainer docs.

## [1.0.0] - 2026-05-06

### Added
- Clinical-grade Arden Syntax IDE in browser with Monaco-based editing.
- Arden syntax highlighting, completion, hover docs, formatter, and linter pipeline.
- Workspace browsing with native file and folder integration for `.mlm` workflows.
- Outline, problems, and context panels for analysis and navigation.
- Semantic flow visualization with fullscreen modal, zoom, path highlights, and step navigation.
- PWA support with service worker caching and installable manifest.
- Static deployment configuration for Render.

### Changed
- Header action buttons now use explicit enablement state.
- Save is enabled only when the current model has unsaved changes.
- Undo and redo availability now mirrors editor history state.
- Keyboard shortcuts now match actionable toolbar state.

### Security
- Baseline deployment security headers documented and enforced via `render.yaml`.
