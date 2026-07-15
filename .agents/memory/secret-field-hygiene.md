---
name: Secret field hygiene
description: Users sometimes paste a whole descriptive sentence into a single secret field instead of just the value; catch and correct this before trusting the secret.
---

When a secret is meant to be a single atomic value (an IP, a username, a password), a user filling out the request form may instead paste a whole explanatory sentence (e.g. "Le host principal : 192.168.1.25 Utilisateur : X Mot de passe : Y") into one field, or annotate a correct value with extra text in parentheses (e.g. "192.168.1.25 (Principal) / 192.168.1.3 (2ndaire)").

**Why:** This breaks anything that consumes the value literally (DNS/SSH host lookup, API auth) with a confusing low-level error (e.g. `getaddrinfo ENOTFOUND <whole sentence>`), which is easy to mis-diagnose as a network/connectivity bug instead of a data-entry problem.

**How to apply:** After a secret is (re)submitted, do a live smoke test that surfaces the raw value's effect (e.g. call the API/service and read the error message) rather than assuming it's correct. If the resulting error string contains spaces, punctuation, or clearly more content than the field's purpose (host/user/password), ask the user to resubmit with just the literal value, showing the exact expected format.
