---
name: Supabase PromiseLike pattern
description: Supabase query builder returns PromiseLike, not a real Promise — .catch() doesn't exist on it in TypeScript strict mode
---

Supabase query builder chains (`.from().select()…`) return a `PromiseLike<T>`, not a native `Promise`. This means `.catch()` does not exist on the result type, causing TS2339 errors.

**Rule:** Never chain `.catch(() => {})` on a Supabase query. Use `.then(handler, () => {})` instead.

```ts
// ❌ Wrong — TS2339: Property 'catch' does not exist on type 'PromiseLike<void>'
supabase.from("profiles").select("*").then(handle).catch(() => {});

// ✅ Correct
supabase.from("profiles").select("*").then(handle, () => {});
```

**Why:** The Supabase JS client returns a custom `PromiseLike` that only implements `.then()`, not the full Promise API.

**How to apply:** Any time you write Supabase query error handling, use the two-argument `.then()` form. Applies to both web (planner) and mobile (day-planner-mobile) hooks.
