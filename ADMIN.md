# Admin

`/admin/` edits the site content (business details, models, services, locations, projects, pricing,
FAQ, guides, reviews, legal pages, form options, integrations) and manages who can sign in.
Saves go live within about 30 seconds, no rebuild or redeploy.

## Signing in

Admins sign in with an email and password.

- **First run:** a default account is created the first time anyone tries to sign in:
  login `admin`, password `admin`. It is forced to choose a new password immediately and can't do
  anything else until it does. **Deploy, then sign in right away.** Until you change that password,
  anyone who finds `/admin/` could do the same.
- **Adding admins:** *Admin users → Add an admin*. Enter their email. The page shows a one-time
  temporary password to pass on; they must set their own at first sign-in.
- **Resetting / disabling / deleting** other admins is on the same page. Resetting signs them out and
  issues a new temporary password. You can't delete or disable yourself, and at least one admin must
  stay enabled.
- **My account** changes your own password. Passwords need 10+ characters and can't be common ones.
- Sessions last 8 hours. After 5 failed sign-ins an account is locked for 15 minutes.
- Passwords are stored as salted PBKDF2-SHA256 hashes in KV. Sessions are server-side and are cut
  when a password is changed, reset, or the account is disabled.

The default `admin` account is created once. If you later delete it, it does not come back.

## Locked out?

Set a recovery secret, then call the API with it (it has no password and can manage users):

```
npx wrangler secret put ADMIN_TOKEN
curl -X POST https://adu-america.com/api/admin/users/<email>/reset-password \
  -H "Authorization: Bearer <token>" -H "X-Admin-Request: 1"
```

That prints a new temporary password. Remove the secret afterwards if you don't want it around.
Cloudflare Access is also supported as an extra layer (`ACCESS_TEAM_DOMAIN` + `ACCESS_AUD`); an
Access-authenticated request is treated like the recovery token.

For stronger protection, put Cloudflare Access or a rate-limiting rule in front of
`/admin*` and `/api/admin/*`.

## How content editing works

- Defaults live in `site.config.mjs` and `scripts/content.mjs` and are built into the static pages.
- Saving writes the full content to Cloudflare KV (`CONTENT`, key `content`); every save also keeps a
  `history:<time>` copy for 120 days. Users, sessions and login counters live in the same namespace.
- When KV has saved content, the Worker (`worker/site.js`) renders pages from it with the same code
  as the build (`scripts/render.mjs`). Nothing saved means the static pages are served as built.
- "Reset to defaults" deletes the saved content. A save is rejected if the site can't render from it.

## Not editable in the admin

The home page copy (`index.html`) and the interactive scripts are still edited in code (its header,
footer and form do follow the admin). New photos go in `public/images/` and are referenced by path,
for example `/images/my-photo.jpg`. Form submissions aren't shown in the admin.

## Setup

1. `wrangler.jsonc` declares the `CONTENT` KV binding. If `wrangler deploy` doesn't create it, run
   `npx wrangler kv namespace create CONTENT` and add the returned `"id"` to that entry.
2. Deploy, open `/admin/`, sign in as `admin` / `admin`, and set your password.
3. Add your teammates under *Admin users*.

## Local testing

```
npm run cf:dev        # builds, then runs the Worker + local KV on http://localhost:8787
```

`npm run dev` (Vite only) has no Worker, so the admin shows an "API unavailable" message there.
Local KV lives in `.wrangler/state`; delete that folder to reset the local admin accounts.
