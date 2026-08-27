---
name: Mappls native credentials
description: Native packaging constraint for the Mappls React Native SDK used by this project.
---

The installed Mappls React Native SDK reads credentials through its Android Gradle plugin, not from JavaScript environment variables. The plugin searches generated app locations for a matching `.a.olf` and `.a.conf` pair, then embeds the license and config into Android resources/assets.

**Why:** Credential files exported by the Mappls console may have generated names that end only in `.conf` and `.olf`; copying those names unchanged makes Expo prebuild fail because the SDK specifically searches for the `.a.*` suffixes.

**How to apply:** Keep the source credential files native-only and have the Expo config plugin copy them into the generated Android app directory with a matching basename such as `mappls.a.conf` and `mappls.a.olf`. Never pass these credentials through `EXPO_PUBLIC_*` variables or JavaScript.