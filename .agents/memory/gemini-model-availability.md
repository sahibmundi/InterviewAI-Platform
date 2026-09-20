---
name: Gemini model availability
description: Provider model names can change availability by project or account.
---

Keep the Gemini model configurable through an environment override and verify the exact upstream response when an AI request returns a generic provider error. A model can return 404 as unavailable to new users even when the API key and network are valid; the provider may recommend a newer model such as Gemini 3.6 Flash.

**Why:** The project’s initial model was retired for new users; the provider explicitly recommended a newer Flash model, while the UI incorrectly described the failure as an internet problem.

**How to apply:** When Gemini returns 404 or a model-not-found response, test the configured model directly, switch to the provider-recommended supported model, and preserve a user-facing error that distinguishes provider failures from connectivity failures.