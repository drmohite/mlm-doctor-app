# Privacy Summary

## Plain-Language Overview

MLM Doctor is a client-side web application. By default, it runs in the user's
browser and edits files selected by the user on their own device.

## What data MLM Doctor processes

- Arden MLM source content opened by the user
- Metadata derived from that content (symbols, diagnostics, flow structure)
- Local workspace handle metadata for convenience features (browser-managed)

## What MLM Doctor does not include by default

- No built-in user account system
- No built-in backend database
- No mandatory remote telemetry pipeline
- No default server-side storage of MLM content

## Browser and hosting behavior

- Static hosting serves application assets (HTML/CSS/JS/icons/service worker)
- Service worker caches assets for offline use
- CDN assets (for Monaco/font dependencies) may be cached after first load

## User and organization responsibilities

Deploying organizations are responsible for:

- Endpoint security and device access controls
- Operational policies for sensitive clinical data
- Legal/regulatory assessments for HIPAA/GDPR or other frameworks
- Incident response and governance controls in their environment

## Related documents

- `COMPLIANCE.md` for regulatory scope boundaries
- `SECURITY.md` for vulnerability disclosure process
- `docs/architecture.md` for data flow and runtime architecture
