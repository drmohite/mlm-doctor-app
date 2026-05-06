# 🩺 MLM Doctor

**MLM Doctor** is a clinical-grade, offline-first Progressive Web App (PWA) designed for editing and auditing Medical Logic Modules (MLMs) written in Arden Syntax. 

It provides a modern, robust IDE experience directly in the browser, featuring native file system access and an intelligent Arden Syntax tokenizer.

---

## ✨ Features

*   **Offline-First PWA:** Built to work entirely offline. It can be installed as a native desktop application directly from your browser.
*   **Native File System Integration:** Open local directories and edit `.mlm` files directly. No need to upload or download files—changes are saved natively to your hard drive. *(Requires a Chromium-based browser like Chrome or Edge).*
*   **Arden Syntax Engine:** Uses a custom Monarch tokenizer built for the Monaco Editor (the same engine behind VS Code) to provide flawless syntax highlighting for Arden Syntax.
*   **Clinical-Grade Linter:** Real-time syntax and logic validation explicitly tuned for Arden. Features smart tracking to prevent false positives inside `library` documentation, `maintenance` text, and block comments (`/* ... */`).
*   **Persistent Workspace:** Automatically remembers your chosen working directory across browser refreshes via IndexedDB.
*   **Semantic Flow Graph:** Flow panel renders control and dependency-aware graphs, including dispatcher-style `ButtonName` branch fan-out, branch merge points, and terminal `CONCLUDE`/`RETURN` paths.
*   **Preview vs Fullscreen Rendering:** Compact fallback is used only for sidebar preview stability; fullscreen flow always attempts full graph rendering.
*   **Path Highlighting:** Clicking a fullscreen flow node shows tooltip details and highlights the execution route from MLM start to the nearest terminal path.
*   **Step Navigation in Tooltip:** Inspector includes `Previous` and `Next`; for branch points, `Next` opens a dropdown to choose the target path.
*   **Context-Aware Header Actions:** Toolbar actions only enable when they have a meaningful effect — `Save` activates only with unsaved changes, `Undo` / `Redo` mirror Monaco's history stack, while `Open File`, `Open Folder`, and panel toggles (`Outline`, `Problems`, `Context`) remain available at all times. Keyboard shortcuts (`Ctrl/Cmd+S`, `Ctrl/Cmd+Z`, `Ctrl/Cmd+Y`) honour the same gating.

## 🚀 Getting Started Locally

To use MLM Doctor locally with full PWA support (Service Workers and Manifests), you **must run it via a local HTTP server**. Do not just double-click `index.html`.

Start a local static server from the project root:

- Python 3:
  - `python3 -m http.server 3000`
- Node.js (if you use `npx`):
  - `npx serve -l 3000 .`

Then open `http://localhost:3000`.

*(Running via `localhost` ensures the browser grants the secure context required for native File System API access and PWA installation).*

## 🧭 Support

- Report a bug: [Open Bug Report](../../issues/new?template=bug_report.md)
- Request a feature: [Open Feature Request](../../issues/new?template=feature_request.md)
- Browse existing issues: [Issues](../../issues)
- For security concerns, follow `SECURITY.md` and use private disclosure first.
- Report a vulnerability privately: [Security Advisory](../../security/advisories/new)
- For usage questions, include browser version, OS, and reproduction steps in your issue.

## 🌐 Browser Compatibility

- Fully supported (recommended):
  - Chromium-based browsers with File System Access API support (for example, Chrome, Edge).
- Partially supported:
  - Browsers without File System Access API can load the UI but cannot provide the full native open/save folder workflow.
- PWA support requirements:
  - HTTPS (or `localhost`) is required for service worker registration.

## ⚠️ Known Limitations

- Native folder/file editing depends on browser support for `showOpenFilePicker` and `showDirectoryPicker`.
- First-run offline support requires one successful online load to cache CDN assets (Monaco editor and fonts).
- Service worker updates may require a refresh cycle to fully activate new cached asset versions.
- This project is a static web app; there is no backend persistence layer.

## ☁️ Deployment

MLM Doctor is configured to be deployed as a static site.

**Live deployment:** [https://mlm-doctor-app.onrender.com/](https://mlm-doctor-app.onrender.com/)

*   **Render.com:** A `render.yaml` configuration file is included, which sets up enterprise-safe security headers (`X-Frame-Options`, `X-Content-Type-Options`) and routing.
*   **GitHub Actions / Auto Deploy:** Just push to your connected repository to trigger an automatic redeployment.

## 🤝 Open Source Governance

- **License:** This project is licensed under the MIT License. See `LICENSE`.
- **Contributing:** Contribution guidelines are documented in `CONTRIBUTING.md`.
- **Code of Conduct:** Community participation expectations are in `CODE_OF_CONDUCT.md`.
- **Security:** Vulnerability reporting process is documented in `SECURITY.md`.

## 🔮 Future Roadmap

See `ROADMAP.md` for planned features including:
- Go-to-Definition across multiple files.
- Visual Diff viewer for clinical auditing.
- Scaffolding wizard for new MLMs.
- PDF/HTML export reporting.

## 🗒️ Release Notes

- See `CHANGELOG.md` for versioned release history and user-visible changes.

---
*Note: This tool operates completely locally within your browser. Code and clinical logic are never transmitted to external servers.*
