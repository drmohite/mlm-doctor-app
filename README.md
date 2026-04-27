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

## 🚀 Getting Started Locally

To use MLM Doctor locally with full PWA support (Service Workers and Manifests), you **must run it via a local HTTP server**. Do not just double-click `index.html`.

We have provided a robust launcher script that works on any Windows machine:

1. Double-click **`Start-Server.bat`**
2. The script will automatically find the best available server (Node.js, Python 3, Python 2, or native PowerShell) and launch the app.
3. Your browser will open to `http://localhost:3000` (or `8000`).

*(Running via `localhost` ensures the browser grants the secure context required for native File System API access and PWA installation).*

## ☁️ Deployment

MLM Doctor is configured to be deployed as a static site.

*   **Render.com:** A `render.yaml` configuration file is included, which sets up enterprise-safe security headers (`X-Frame-Options`, `X-Content-Type-Options`) and routing.
*   **GitHub Actions / Auto Deploy:** Just push to your connected repository to trigger an automatic redeployment.

## 🔮 Future Roadmap

See `ROADMAP.md` for planned features including:
- Go-to-Definition across multiple files.
- Visual Diff viewer for clinical auditing.
- Scaffolding wizard for new MLMs.
- PDF/HTML export reporting.

---
*Note: This tool operates completely locally within your browser. Code and clinical logic are never transmitted to external servers.*
