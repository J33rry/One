<div align="center">

# 💬 One

### A secure, real-time messaging platform

Direct & group chat · audio/video calls · presence · typing indicators · media sharing

<br />

![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)

![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Drizzle-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-Sessions-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![LiveKit](https://img.shields.io/badge/LiveKit-Calls-FF6352?style=for-the-badge&logo=livekit&logoColor=white)

</div>

---

## 📑 Table of Contents

- [✨ Features](#-features)
- [🧱 Tech Stack](#-tech-stack)
- [🗂️ Project Structure](#️-project-structure)
- [✅ Prerequisites](#-prerequisites)
- [🚀 Quick Start](#-quick-start)
- [🔐 Environment Variables](#-environment-variables)
- [📜 Scripts](#-scripts)
- [☁️ Deployment](#️-deployment)
- [📄 License](#-license)

---

## ✨ Features

| | |
|---|---|
| 💬 **Messaging** | 1:1 and group chats — edit, delete, replies, reactions, read/delivery status |
| ⚡ **Real-time** | WebSocket gateway for live messages, presence (online / last-seen) & typing indicators |
| 📞 **Calls** | Audio & video powered by [LiveKit](https://livekit.io) |
| 🖼️ **Media** | Image / video / file sharing via [Cloudinary](https://cloudinary.com), with an in-app lightbox |
| 👥 **Contacts** | Send / accept / reject requests, block & unblock users |
| 🔐 **Auth** | Redis-backed sessions with password (Argon2) **and** Google OAuth sign-in |
| 🎨 **Theming** | Warm "editorial" design system — full light/dark (system preference + in-app toggle) |

---

## 🧱 Tech Stack

**🖥️ Frontend**

`Next.js 16 (App Router)` · `React 19` · `Tailwind CSS v4` · `TanStack Query` · `Zustand` · `react-hook-form + Zod` · `LiveKit client` · `lucide-react`

**⚙️ Backend**

`Node.js` · `Express 5` · `Drizzle ORM` · `PostgreSQL` · `Redis` (`express-session` + `connect-redis`) · `ws` gateway · `LiveKit server SDK` · `Cloudinary` · `Argon2` · `Zod`

---

## 🗂️ Project Structure

```
.
├── 📁 server/                 # Express API + WebSocket gateway
│   ├── index.js               # Entry: middleware, session, routes, WS server
│   ├── docker-compose.yml     # Local Postgres + Redis + LiveKit
│   └── src/
│       ├── config/            # ⚙️  Env schema & validation
│       ├── db/                # 🗄️  Drizzle schema + migrations
│       ├── middleware/        # 🛡️  requireAuth, access control, errors
│       ├── modules/           # 🧩  auth · users · contacts · blocked · chats · messages · media · calls
│       └── ws/                # 🔌  WebSocket handlers (message · call · presence · typing)
│
└── 📁 web/                    # Next.js frontend
    └── src/
        ├── app/               # 🧭  Routes: (auth) + (app) route groups
        ├── components/        # 🎨  UI primitives, chats, calls, layout
        ├── hooks/             # 🪝  useAuth · useSocket · useCall · useTyping · usePresence
        └── lib/               # 📡  API clients + WS client
```

---

## ✅ Prerequisites

- 🟢 **Node.js 20+**
- 🐳 **Docker** — recommended for local Postgres + Redis + LiveKit (or bring your own)

---

## 🚀 Quick Start

**1️⃣ — Start infrastructure** (Postgres · Redis · LiveKit)

```bash
cd server
docker compose up -d
```

**2️⃣ — Server**

```bash
cd server
cp .env.example .env      # fill in the values (see 🔐 Environment Variables)
npm install
npm run db:push           # apply the Drizzle schema
npm run dev               # ▶ http://localhost:3002
```

**3️⃣ — Web**

```bash
cd web
# create web/.env.local (see 🔐 Environment Variables)
npm install
npm run dev               # ▶ http://localhost:3000
```

> 🎉 Open **http://localhost:3000** and sign up.

---

## 🔐 Environment Variables

### ⚙️ Server — `server/.env`

| Key | Req | Description |
|---|:---:|---|
| `NODE_ENV` | ➖ | `development` \| `production` (default `development`) |
| `PORT` | ➖ | API port (default `5000`; local dev commonly `3002`) |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string (session store) |
| `SESSION_SECRET` | ✅ | 32+ char random string |
| `JWT_SECRET` | ✅ | 32+ char random string (password-reset tokens) |
| `CORS_ORIGIN` | ✅ | Exact frontend origin, e.g. `http://localhost:3000` |
| `GOOGLE_CLIENT_ID` | ➖ | Google OAuth client ID |
| `LIVEKIT_URL` · `LIVEKIT_API_KEY` · `LIVEKIT_API_SECRET` | ➖ | LiveKit config (required for 📞 calls) |
| `CLOUDINARY_CLOUD_NAME` · `CLOUDINARY_API_KEY` · `CLOUDINARY_API_SECRET` | ➖ | Cloudinary config (required for 🖼️ media) |

> 🔑 Generate secrets with: `openssl rand -base64 48`

### 🖥️ Web — `web/.env.local`

| Key | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | API base URL **including** `/api/v1` — e.g. `http://localhost:3002/api/v1` |
| `NEXT_PUBLIC_WEBSOCKET_URL` | WS base URL **without** a path — e.g. `http://localhost:3002` <br/>_(the client converts `http→ws` and appends `/ws`)_ |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID |

> ⚠️ `NEXT_PUBLIC_*` values are inlined at build time — **rebuild/redeploy** after changing them.

---

## 📜 Scripts

<table>
<tr><th>⚙️ Server <code>(cd server)</code></th><th>🖥️ Web <code>(cd web)</code></th></tr>
<tr valign="top"><td>

| Command | Does |
|---|---|
| `npm run dev` | Start (nodemon watch) |
| `npm start` | Start the server |
| `npm run db:generate` | Generate migrations |
| `npm run db:push` | Push schema to DB |

</td><td>

| Command | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm start` | Serve prod build |
| `npm run lint` | Run ESLint |

</td></tr>
</table>

---

## ☁️ Deployment

> Frontend → **Vercel** · Server → **Render**

> [!IMPORTANT]
> `*.vercel.app` and `*.onrender.com` are **different sites**, so the session cookie is **cross-site**. For login to persist, configure the cookie for cross-site use in `server/index.js`:
> ```js
> app.set("trust proxy", 1); // Render terminates TLS at a proxy
>
> cookie: {
>   secure: env.NODE_ENV === "production",
>   httpOnly: true,
>   sameSite: env.NODE_ENV === "production" ? "none" : "lax",
>   maxAge: 7 * 24 * 60 * 60 * 1000,
> }
> ```

**🟣 Render (server)** — Root `server`, Build `npm install`, Start `npm start`. Provision Postgres + Redis, set the server env vars with `NODE_ENV=production` and `CORS_ORIGIN` = your exact Vercel URL, then run `npm run db:push` once.

**▲ Vercel (frontend)** — Root `web`. Set `NEXT_PUBLIC_API_URL` → `https://<your-server>.onrender.com/api/v1` and `NEXT_PUBLIC_WEBSOCKET_URL` → `https://<your-server>.onrender.com`.

**🔵 Google OAuth** — add your Vercel URL to the OAuth client's *Authorized JavaScript origins* in the Google Cloud Console.

---

## 📄 License

Released under the **ISC License**.

<div align="center">
<br />
<sub>Built with ⚡ real-time infrastructure and a ☕ lot of care.</sub>
</div>
