---
name: Mobile SF Symbols
description: Not all intuitive SF Symbol names are valid in expo-symbols SFSymbols7_0 type — always verify with TS before assuming .fill variants exist
---

The `expo-symbols` package types SF symbols strictly against `SFSymbols7_0`. Not every icon has a `.fill` variant under its base name.

**Known invalid symbols:**
- `"calendar.fill"` — does NOT exist

**Known working alternatives:**
- `"calendar.circle"` / `"calendar.circle.fill"` — valid pair for calendar tab icon

**Why:** Apple's SF Symbol set has irregular naming; some icons use `.circle.fill` pattern rather than just `.fill`.

**How to apply:** When adding new tab icons or SF symbol pairs, if the TS compiler reports TS2820, check whether a `.circle.fill` or `.badge.fill` variant exists instead of the plain `.fill`.
