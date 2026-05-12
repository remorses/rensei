---
'rensei': patch
---

Fix `rensei screenshot` and other async CLI commands so they finish writing output before the WebGPU force-exit timer starts.

The CLI now parses arguments first, awaits the matched command, and only then arms the short shutdown timer used to clean up lingering Dawn/WebGPU threads. Slow renders no longer exit successfully with an empty or missing output file.

Fixes #1
