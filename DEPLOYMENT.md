# FitQuest Deployment Guide

FitQuest has two deployable pieces:

- Backend: FastAPI API
- Frontend: static React build from Vite

## Backend

Set environment variables on your backend host:

```text
APP_NAME=FitQuest API
APP_ENV=production
DATABASE_URL=sqlite:///./fitquest.db
CORS_ORIGINS=https://your-frontend-domain.com
ENABLE_DOCS=false
```

Install and run:

```bash
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

SQLite works for a small demo. For a real multi-user deployment, move `DATABASE_URL` to a managed database such as PostgreSQL later.

## Frontend

Set the backend URL before building:

```text
VITE_API_URL=https://your-backend-domain.com
```

Build:

```bash
npm install
npm run build
```

Deploy the generated `frontend/dist` folder to a static host.

## What Changes From Development

Development:

- Backend runs with `--reload`
- Frontend runs with the Vite dev server
- API URL defaults to `http://127.0.0.1:8000`
- CORS allows local frontend ports

Production:

- Backend runs without `--reload`
- Frontend is prebuilt into static files
- API URL is fixed at build time with `VITE_API_URL`
- CORS must allow the real frontend domain
- Docs can be disabled with `ENABLE_DOCS=false`
