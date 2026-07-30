<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Run `npm run verify` before every push

```bash
npm run verify     # preflight (~1s) + all three test suites
```

`npm run preflight` is a regression suite for **build breakage and secret
leakage**, not a style linter. Every rule in `scripts/preflight.mjs` maps to
something that actually broke or actually leaked. It catches, in about a second:

- null bytes / truncated writes
- a stray leading character from heredoc escaping (broke two deployments)
- `.ts`/`.tsx` extensions in import specifiers (broke one deployment)
- route segment config (`dynamic`, `revalidate`, …) re-exported instead of
  declared literally — Next reads it by static analysis (broke one deployment)
- one `route.ts` importing another (share via `lib/`)
- **a credential behind `NEXT_PUBLIC_`** — these are inlined into the client
  bundle, and this rule exists because a live Groq API key was extractable from
  production JavaScript
- **`dangerouslyAllowBrowser`** — no legitimate use in this codebase

## Why this matters more than it looks

`tsc --noEmit` takes 10+ minutes against a network-mounted working copy, so it
tends to get skipped, and then Vercel becomes the typechecker — which means a
failed deployment and an email to the owner every time. Four deployments failed
across two days that way. Preflight is the fast gate that catches the classes of
error that actually recur. It is **not** a substitute for `tsc --noEmit` when you
can afford to run it.

## Secrets

Never put a credential behind `NEXT_PUBLIC_`. The only public-by-design value is
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, which RLS policies are written against. All
model/API calls belong in a server route, and the client should name a **task**
rather than send a prompt — see `app/api/ai/generate/route.ts`.

Do not commit real secrets, and do not paste keys into files or fields; env vars
are set by the owner in Vercel.

# Git

Commits must use Python git plumbing over the GitHub API (blob → tree → commit →
PATCH ref). There is a permanent `.git/refs/remotes/origin/main.lock` left by
GitHub Desktop that blocks normal `git commit`.
