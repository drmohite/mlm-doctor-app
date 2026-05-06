# Troubleshooting Guide

## Browser Compatibility

### Symptom
Open/save folder workflows are unavailable or fail to open picker dialogs.

### Likely Cause
The current browser does not support the File System Access API used by MLM Doctor.

### Resolution
- Use a Chromium-based browser (for example, Chrome or Edge).
- Ensure browser is updated to a recent stable version.
- Run the app over `https://` or `http://localhost`.

## File Picker Permission Issues

### Symptom
Folder restore or save operations fail with permission errors.

### Likely Cause
Browser permission to access the selected file/folder handle is not granted.

### Resolution
- Re-open the folder/file through `Open Folder` or `Open File`.
- Re-grant permission prompt when browser asks.
- If restore fails, forget and reselect workspace.

## Service Worker / Cache Refresh Issues

### Symptom
Latest deployment changes are not visible, or old UI/assets still appear.

### Likely Cause
Browser is serving cached assets from service worker or stale tab state.

### Resolution
- Hard refresh the page (`Cmd+Shift+R` on macOS, `Ctrl+Shift+R` on Windows/Linux).
- Close all app tabs and reopen the URL.
- In browser dev tools, clear site data and reload.

## Render Deployment Mismatch

### Symptom
Live app does not match latest GitHub commit.

### Likely Cause
Render demo environment is configured for manual deploy, so it may intentionally
lag behind latest GitHub commits until a new deploy is triggered.

### Resolution
- Verify Render service source repo and branch.
- Trigger `Manual Deploy` for latest commit.
- Confirm deployed commit hash in Render Events.

## Editor Action Buttons Disabled Unexpectedly

### Symptom
`Save`, `Undo`, or `Redo` appears disabled.

### Likely Cause
Buttons are context-aware by design.

### Resolution
- `Save` enables only after unsaved edits.
- `Undo` enables only when there is undo history.
- `Redo` enables only after undo operations.
