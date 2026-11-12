# Cloudflare deployment

This runtime is anonymous-only. The Worker creates the session cookie through
`POST /api/session/anonymous`; do not add a token to local storage or logs.

1. Create the production database: `wrangler d1 create tactris`.
2. Put its returned ID in the uncommitted deployment configuration (replace the
   placeholder in `wrangler.jsonc` in the deployment environment only).
3. Run `npm run cf:migrate:remote`.
4. Run `npm run cf:deploy:dry-run`, then `npm run cf:deploy`.

The custom domain is `tactris.brdlb.com`. Keep the previous Node/nginx origin
available until HTTPS, the SPA, anonymous session creation, public leaderboard,
two room WebSocket clients, reconnect, and private-room direct links have been
smoke-tested. D1 data created after cutover is intentionally not synchronized
back to PostgreSQL.
