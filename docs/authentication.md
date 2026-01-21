# Authentication (oauth2-proxy)

This repo expects authentication to be handled by oauth2-proxy in front of the backend.
In production, the public Render web service runs oauth2-proxy and forwards requests to the private Render service.

## Request flow
1) User visits the public web service.
2) oauth2-proxy redirects to the identity provider for OAuth2/OIDC login.
3) After login, oauth2-proxy sets a session cookie and proxies the request upstream.
4) oauth2-proxy injects identity headers.
5) The backend reads those headers, upserts a user, and attaches `req.auth`.

## Headers the backend accepts
From `backend/src/middleware/auth.ts`:
- Email: `x-auth-request-email`, `x-email`, `x-user-email`, `x-auth-email`, `x-forwarded-email`
- User: `x-auth-request-user`, `x-user`, `x-user-id`, `x-auth-user`
- Groups (optional): `x-auth-request-groups`, `x-groups`

Note: oauth2-proxy must be configured to pass these headers (for example `set_xauthrequest=true`).

## Authorization rules
- Allowed email domains come from `AUTH_EMAIL_DOMAIN` or `OAUTH2_PROXY_EMAIL_DOMAINS` (defaults to `ssaandco.com`).
- Admins are defined by `ADMIN_EMAILS`.
- Admins can access all jobs; non-admins are limited by visibility rules and group memberships.

## Dev behavior
- In non-production, missing headers fall back to `DEV_ADMIN_EMAIL` or the first `ADMIN_EMAILS` entry.
- `DEV_IMPERSONATE_EMAIL` can force a specific user in non-prod.
- `GET /api/debug/auth` (non-prod only) returns auth header diagnostics.

## Render deployment notes
- Public web service: oauth2-proxy + routing for the public URL.
- Private service: backend API. Only oauth2-proxy should reach it.
- oauth2-proxy upstream should point to the private service URL.

## What is not in this repo
The oauth2-proxy configuration (provider settings, client secrets, redirect URLs) lives in Render or deployment config, not in this repo.

## References
- `backend/src/middleware/auth.ts`
- `backend/src/index.ts`
- `docs/RESEARCH-BRIEF-GUARDRAILS.md`