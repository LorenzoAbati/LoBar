# LoBar

LoBar is a production-ready marketplace for pixel animation packs that sit beside Claude Code in iTerm2. Designers draw four **thinking** and four **typing** frames in the browser, publish them under their GitHub identity, and share a one-command installer.

The installer deliberately does **not** write, replace, or depend on Claude Code configuration. It installs only:

- the selected pack in `~/.local/share/lobar/themes/<slug>`;
- the LoBar launcher at `~/.local/bin/lobar`.

Users launch Claude Code with:

```bash
~/.local/bin/lobar --theme <slug>
```

## Product flow

1. A signed-in creator uses `/create` to draw all eight 32×34 pixel frames.
2. LoBar validates the PNG contract, stores the immutable frames in Vercel Blob, and writes ownership/metadata to Neon Postgres.
3. The public pack page offers a ZIP download and a copyable Claude Code prompt.
4. The prompt runs a small installer that downloads the pack plus LoBar runtime without modifying Claude Code settings.

## Stack

- **Next.js** App Router on Vercel.
- **Vercel Blob** for public, immutable PNG assets.
- **Neon Postgres** connected through Vercel Marketplace for metadata, creator ownership, and install counts.
- **GitHub OAuth via NextAuth** for authenticated publishing.
- A Docker image with Next standalone output for self-hosting.

Vercel’s supported client-upload flow lets the app authorize uploads before the browser sends bytes to Blob, and its Neon integration provisions managed Postgres with project environment variables. See the [Vercel Blob guide](https://vercel.com/docs/vercel-blob/client-upload) and [Neon integration](https://vercel.com/marketplace/neon/).

## Local development

LoBar includes a local-only demo adapter so the full product flow can be tested without cloud credentials. It writes data only below `/tmp/lobar-demo`.

```bash
npm install
LOBAR_DEMO_MODE=1 npm run dev
```

Open `http://localhost:3000`, create a pack, publish it, download it, and copy the install prompt. Delete `/tmp/lobar-demo` to reset the local catalogue.

## Production deployment on Vercel

1. Import this GitHub repository into Vercel.
2. In **Storage**, create a Vercel Blob store and attach it to the project. This injects `BLOB_READ_WRITE_TOKEN`.
3. Add the **Neon** integration in Vercel Marketplace and create a database. Set `DATABASE_URL` from the integration.
4. Create a GitHub OAuth App with callback URL:

   ```text
   https://your-domain.vercel.app/api/auth/callback/github
   ```

5. Set `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GITHUB_ID`, and `GITHUB_SECRET` from `.env.example`.
6. Run the migration against the production database:

   ```bash
   DATABASE_URL='...' npm run db:migrate
   ```

7. Deploy. Keep `LOBAR_DEMO_MODE` unset in Vercel.

For a normal Next.js project, Vercel deployment is zero-config; use `vercel` from the project root once it is linked. [Vercel’s Next.js deployment guide](https://vercel.com/docs/concepts/next.js/overview)

## Container

The image has no database or blob service bundled in it. It expects the same managed-service environment variables as Vercel. For a quick local UI smoke test:

```bash
docker compose up --build
```

`docker-compose.yml` intentionally enables only the local demo adapter. Do not use that environment setting in production.

## Validation

```bash
npm test
npm run lint
npm run build
python3 -m py_compile public/runtime/lobar.py
```

The end-to-end browser flow should cover: design a pack, publish it, inspect the public page, download the ZIP, retrieve the install script, and run the installer into a temporary `LOBAR_HOME` / `LOBAR_BIN_DIR`.
