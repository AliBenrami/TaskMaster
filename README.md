This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Better Auth + Drizzle Setup

1. Copy the environment template:

```bash
cp .env.example .env.local
```

2. Generate Better Auth Drizzle schema:

```bash
pnpm auth:generate
```

3. Generate and apply Drizzle migrations:

```bash
pnpm db:generate
pnpm db:migrate
```

4. Start the app:

```bash
pnpm dev
```

### Notes

- Auth API routes are mounted at `/api/auth/*`.
- `DB_DRIVER` supports `neon-http` (default) and `pg`.
- `experimental.joins` is enabled in `lib/auth.ts`.
- Naming scaffolds (`usePlural`, `modelName`, `fields`) are present and commented in the auth config.
- Email/password auth is enabled.
- Google OAuth is enabled when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set.

## Auth Implementation

Authentication is implemented with:

- [Better Auth](https://better-auth.com) for auth flows and session handling
- Drizzle ORM via the Better Auth Drizzle adapter
- PostgreSQL/Neon-compatible database wiring

This repo currently includes the core auth backend integration (config, adapter, schema, migrations, and auth route handlers). UI/auth pages may evolve quickly and are intentionally not treated as stable documentation here.

Core auth route base path:

- `/api/auth/*`

Google OAuth redirect URI to configure in Google Cloud:

- `http://localhost:3000/api/auth/callback/google`
