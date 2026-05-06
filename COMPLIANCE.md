# Compliance and Regulatory Scope

## Purpose

This document explains the compliance posture of MLM Doctor for organizations
assessing healthcare and privacy requirements (including HIPAA and GDPR).

## Important Statement

MLM Doctor is an open-source software product. It is not marketed as formally
HIPAA-certified or GDPR-certified by default.

Regulatory compliance is context-dependent and must be validated by each
deploying organization against its own legal, technical, and operational
controls.

## Product Scope (Current Architecture)

- Client-side static web application
- No built-in backend API, database, or account system
- Data is handled in the browser and user-selected local files/folders
- Static hosting serves application assets and headers only

Reference: `docs/architecture.md`

## HIPAA Considerations

### What MLM Doctor does by default

- Enables local editing and analysis of Arden MLM content in-browser
- Avoids mandatory server-side data processing in the default architecture

### What organizations must implement

- Access controls and endpoint hardening on user devices
- Organizational policies for PHI handling and retention
- Audit logging and monitoring strategy (if required by policy)
- Vendor and hosting reviews, including BAAs where applicable
- Legal/compliance review before processing PHI in production workflows

## GDPR Considerations

### What MLM Doctor does by default

- Does not include built-in telemetry, user profiling, or centralized
  personal-data storage in the default static deployment

### What organizations must implement

- Lawful basis and processing records where personal data is involved
- Data subject rights workflows (access, rectification, deletion, etc.)
- Security controls and incident response procedures
- DPIA and jurisdiction-specific legal review when required

## Shared Responsibility Model

- Project maintainers provide secure-by-design application behavior and
  transparent documentation.
- Deploying organizations are responsible for operational compliance, policy
  controls, and legal validation in their own environment.

## Recommendation

Before clinical production use, perform a formal internal risk and compliance
assessment with legal, security, and governance stakeholders.
