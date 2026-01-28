# E-TIKET - Event Registration System

Sistem pendaftaran event dengan QR code check-in untuk masjid dan komunitas.

## Features

- 📝 Event management (create, edit, delete events)
- 👥 Participant registration (public registration form)
- 📱 QR Code check-in (web-based scanner)
- 🎴 ID Card generator (PDF download/print)
- 📊 Dashboard statistics
- 💳 Payment integration ready (Midtrans)

## Tech Stack

- **Frontend**: React + Vite + TypeScript + TailwindCSS
- **Backend**: Cloudflare Workers + Hono + D1 (SQLite)
- **Icons**: Material Symbols
- **QR**: html5-qrcode

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm
- Wrangler CLI (for Cloudflare Workers)

### Development

1. Clone repository:
```bash
git clone https://github.com/add146/pendaftaran.git
cd pendaftaran
```

2. Install dependencies:
```bash
# Frontend
cd frontend
npm install

# Backend
cd ../api
npm install
```

3. Setup database (local):
```bash
cd api
npx wrangler d1 execute pendaftaran-qr-db --file=src/db/schema.sql --local
npx wrangler d1 execute pendaftaran-qr-db --file=src/db/seed.sql --local
```

4. Run development servers:
```bash
# Terminal 1 - Frontend (http://localhost:5173)
cd frontend && npm run dev

# Terminal 2 - API (http://127.0.0.1:8787)
cd api && npx wrangler dev
```

## Deployment

### Deploy API to Cloudflare Workers

1. Create D1 database:
```bash
npx wrangler d1 create pendaftaran-qr-db
```

2. Update `wrangler.jsonc` with the database ID

3. Apply schema:
```bash
npx wrangler d1 execute pendaftaran-qr-db --file=src/db/schema.sql --remote
```

4. Deploy:
```bash
npx wrangler deploy
```

### Deploy Frontend to Cloudflare Pages

Connect GitHub repository to Cloudflare Pages:
- Build command: `npm run build`
- Build output directory: `dist`
- Environment variable: `VITE_API_URL=https://your-api.workers.dev`

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Admin login |
| `/api/auth/register` | POST | Admin registration |
| `/api/events` | GET/POST | List/Create events |
| `/api/events/:id` | GET/PUT/DELETE | CRUD event |
| `/api/participants/event/:id` | GET | List participants |
| `/api/participants/register` | POST | Public registration |
| `/api/participants/:id/check-in` | POST | Check-in |
| `/api/public/events` | GET | Public events |
| `/api/public/dashboard/stats` | GET | Dashboard stats |

## License

MIT
