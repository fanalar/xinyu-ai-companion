# Release validation

2026-10-09: fresh dependency install from the official npm registry and frontend production build passed. Backend isolated no-key startup, synthetic state/knowledge, export or checkout, static UI, and SQLite integrity passed.

Android Java sources compiled against API 35 and the declared speech interfaces. Full Gradle APK assembly and physical-device behavior were not revalidated. Speech models/media are excluded; model setup scripts are provided. No real provider key, conversation or guest database was used.

The reviewed fresh commit was scanned with Gitleaks v8.30.1, with no leaks detected. This does not constitute a complete production security audit.
