# Security and data handling

Report vulnerabilities privately to the repository owner; never include a live token or personal conversation in a public issue.

This is a local prototype. Keep the backend on loopback by default. Hotel device state is simulated; production guest isolation, authentication, authorization, deployment and real device control require additional work.

Runtime credentials, databases, recordings, generated avatars, signing materials and build outputs are excluded from this repository. Configure your own provider credentials locally; they can incur provider usage charges. Do not embed operator keys into an APK or commit a local .env file. If an actual secret has already been exposed, revoke or rotate it.
