---
name: EAS signing verification
description: Boundary between local Expo native packaging checks and remote EAS signing credential verification.
---

Local Expo prebuild can verify the Android package name, config-plugin execution, and native Mappls credential packaging. It cannot verify that opaque third-party credentials match the EAS-managed signing certificate without authenticated EAS credential access.

**Why:** EAS signing credentials are managed remotely and are not present in the project source; unauthenticated EAS CLI commands cannot inspect their SHA-256 certificate.

**How to apply:** Report native packaging as verified separately from signing-certificate matching, and never infer the EAS certificate fingerprint from the local debug keystore.