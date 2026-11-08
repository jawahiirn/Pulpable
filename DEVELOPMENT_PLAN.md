# Pulpable Development Plan

Pulpable is a prompt-to-app builder that generates Next.js projects in isolated E2B sandboxes. This plan prioritizes a reliable generation loop, safe execution, and a workspace that users can return to and extend.

## Product goals

1. Make the value proposition obvious within seconds.
2. Make generation observable, recoverable, and cost-transparent.
3. Treat model output and generated code as untrusted.
4. Make every generated project exportable and extensible.
5. Establish production-quality testing, monitoring, and release practices.

## Phase 01 — Stabilize the foundation

- Fix visible UI defects and inconsistent error handling.
- Correct usage-window accounting.
- Add environment validation and safer defaults.
- Add baseline HTTP security headers.
- Re-enable build-time quality gates.
- Add typecheck and test script conventions.
- Document the current architecture and development workflow.

## Phase 02 — Make the generation loop reliable

- Add explicit job states: queued, running, succeeded, failed, cancelled.
- Add idempotency and retry-safe project creation.
- Stream generation progress and tool activity.
- Add cancel, retry, and actionable failure states.
- Add sandbox cleanup, timeouts, resource limits, and audit events.
- Add generation-cost and usage transparency.

## Phase 03 — Upgrade the workspace UX

- Add project search, sorting, rename, archive, delete, and pinning.
- Add conversation history, file search, diffs, copy actions, and version restore.
- Improve responsive layouts for tablet and mobile.
- Add keyboard navigation and accessibility coverage.
- Add preview diagnostics, restart controls, and better empty states.

## Phase 04 — Modernize the platform

- Upgrade to the current supported Next.js and React releases.
- Migrate `middleware.ts` to `proxy.ts` when upgrading to Next.js 16.
- Add typed environment configuration, structured logging, tracing, and error monitoring.
- Add dependency auditing, CI, unit tests, and end-to-end tests.
- Review caching, route handlers, database access, and deployment configuration.

## Phase 05 — Extend the product

- Export projects as ZIP files.
- Export to GitHub.
- Deploy to Vercel.
- Add environment-variable management.
- Add shareable read-only previews and project permissions.
- Add generated-app testing, accessibility checks, and security scans.
- Add screenshot-to-app and guided refinement workflows.

## Phase 06 — Monetization and teams

- Add clear free, Pro, and Team plans.
- Add usage-based credits and billing transparency.
- Add team workspaces, roles, shared projects, and audit logs.
- Add usage analytics, cost analytics, abuse detection, and support tooling.

## Release gates

Every production release should pass:

- Typecheck
- Lint
- Unit tests
- End-to-end smoke tests
- Production build
- Dependency vulnerability scan
- Security-header verification
- Database migration review
- Agent abuse-case regression tests
