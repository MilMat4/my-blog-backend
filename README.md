# My Blog API

## Run locally

1. Install dependencies with `npm install`.
2. Install and start MongoDB locally, or create a MongoDB Atlas database.
3. Copy `.env.example` to `.env` and set `MONGODB_URI`, `JWT_SECRET` (a random secret of at least 32 characters), `API_PORT=3000`, and `NODE_ENV=development`. Use `mongodb://127.0.0.1:27017/react_web_blog` for a local MongoDB instance.
4. Start the API with `npm run dev`; it listens on port 3000 by default.
5. Run the frontend separately. Its Vite development server proxies `/api` and `/uploads` to `http://127.0.0.1:3000`.

## Environment variables

Mailtrap SMTP is configured through `MAILTRAP_HOST`, `MAILTRAP_PORT`, `MAILTRAP_USER`, and `MAILTRAP_PASS`. The example uses Mailtrap's sandbox host and port 2525. Keep real credentials in `.env`, which is git-ignored. `MAILTRAP_FROM` optionally overrides the sender address.

For production, provide `MONGODB_URI`, a unique random `JWT_SECRET`, and `NODE_ENV=production`. The server uses the platform-provided `PORT` when `API_PORT` is not set. Serve the frontend and API on the same site so the HTTP-only session cookie is sent securely. Persist and back up `uploads/`, or replace local uploads with object storage when deploying multiple app instances.

## User roles and posts

New accounts have the `user` role and can create, view, edit, and delete their own posts. A `superadmin` can also see the user directory, open a user's profile, and manage that user's posts. The API checks the signed-in user's current database role and post ownership for every protected request.

To promote an existing account, first register it as a normal user, then run `npm run promote:superadmin -- admin@example.com` with the account's email. The command requires `MONGODB_URI` and only promotes an existing account; the public registration endpoint never assigns elevated roles.

Post images are limited to 5 MB and accepted only when both the declared type and file signature match JPEG, PNG, WebP, or GIF. They are stored in `uploads/` and served from `/uploads/`.
