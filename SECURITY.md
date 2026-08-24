# Security Policy

## Supported Versions

Zenith Atlas is actively maintained. Security and patch updates are applied to the latest `main` branch.

| Version | Supported          |
| ------- | ------------------ |
| 2.x     | :white_check_mark: |
| < 2.0   | :x:                |

## Architecture & Privacy Model

Zenith Atlas operates under a **Client-Side Memory Architecture**:
* All factor regressions, Black-Litterman allocations, and Monte Carlo simulations execute 100% in local browser memory.
* Zero portfolio telemetry, trade positions, or balances are transmitted to external servers.
* CSV and Excel exports are sanitized (`sanitizeCsvCell`) to defend against Dynamic Data Exchange (DDE) formula injection attacks (`=, +, -, @`).

## Reporting a Vulnerability

If you discover a security vulnerability within Zenith Atlas, please report it responsibly:
1. **GitHub Private Vulnerability Reporting:** Use the [Report a Vulnerability](https://github.com/Cagrik34/zenith-atlas/security/advisories/new) tab.
2. **Direct Contact:** Open a confidential advisory or contact the maintainer directly.

We appreciate responsible disclosure and address verified vulnerabilities with high priority.