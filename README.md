# Consistent Trading Web

Next.js + shadcn (Base UI) + Auth.js (Google).

## Setup

1. Google Cloud Console → OAuth client (Web):
   - Redirect: `http://localhost:3000/api/auth/callback/google`
2. Copy `.env.example` → `.env.local` and fill:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_SECRET=...   # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:55558
```

```bash
npm install
npm run dev
```

## Flow

1. `/login` — Google only (login-05, no email/password)
2. `/onboarding` — firstName, lastName, passport front/back photos
3. `/dashboard` — session home

Passport photos are uploaded to Nest API → MinIO (`/api/users/passport`).
