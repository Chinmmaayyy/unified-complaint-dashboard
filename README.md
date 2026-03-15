# Unified Complaint Dashboard

A full-stack complaint management and analytics platform with:

- React frontend dashboard for visualization and operations
- Node.js + TypeScript backend API
- PostgreSQL data storage
- AI-assisted complaint workflows (Groq primary, Gemini fallback)

## Project Structure

```text
my-app/
|-- src/                    # React frontend source
|-- public/                 # Static frontend assets
|-- backend/
|   |-- src/                # Express + TypeScript backend source
|   |-- tsconfig.json
|   `-- package.json
|-- package.json            # Frontend package manifest
`-- README.md
```

## Prerequisites

- Node.js 18+
- npm 9+
- PostgreSQL 14+ (or compatible hosted Postgres)

## Installation

1. Install frontend dependencies:

	```bash
	npm install
	```

2. Install backend dependencies:

	```bash
	cd backend
	npm install
	cd ..
	```

## Environment Setup

Create `backend/.env` with the following variables:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://username:password@localhost:5432/complaintiq
DB_SSL=false
JWT_SECRET=replace_with_secure_value

GROQ_API_KEY=your_groq_api_key
GOOGLE_GEMINI_API_KEY=your_gemini_api_key

GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_REDIRECT_URI=your_gmail_redirect_uri
GMAIL_REFRESH_TOKEN=your_gmail_refresh_token
GMAIL_FROM_EMAIL=complaints@yourdomain.com
```

## Run in Development

Open two terminals.

1. Start backend API:

	```bash
	cd backend
	npm run dev
	```

2. Start frontend app:

	```bash
	npm start
	```

Frontend: http://localhost:3000
Backend API base: http://localhost:5000/api
Health check: http://localhost:5000/api/health

## Build and Run Production

Frontend build:

```bash
npm run build
```

Backend build and start:

```bash
cd backend
npm run build
npm start
```

## Backend Scripts

From `backend/`:

- `npm run dev` - run backend in development mode with hot reload
- `npm run build` - compile TypeScript to `dist/`
- `npm start` - start compiled backend from `dist/server.js`
- `npm run migrate` - run database migration script
- `npm run seed` - seed database with sample data

## Frontend Scripts

From project root:

- `npm start` - run frontend in development mode
- `npm run build` - create production frontend build
- `npm test` - run frontend tests

## API Modules

Available route groups under `/api`:

- `/auth`
- `/accounts`
- `/complaints`
- `/incidents`
- `/ai`
- `/chatbot`
- `/email`
- `/analytics`

## Tech Stack

- Frontend: React, Recharts, react-simple-maps
- Backend: Express, TypeScript, Zod, JWT, bcrypt
- Database: PostgreSQL
- AI: Groq SDK, Google Generative AI SDK

## Repository

GitHub: https://github.com/Chinmmaayyy/unified-complaint-dashboard
