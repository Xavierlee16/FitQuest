# FitQuest Frontend

This is the React, TypeScript, and Vite frontend for FitQuest.

## Run locally

Install dependencies:

```bash
npm install
```

Start the frontend:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview:local
```

The frontend expects the FastAPI backend to run at:

```text
http://127.0.0.1:8000
```

You can change the API URL by setting:

```text
VITE_API_URL
```

The dashboard includes a basic training recommendation card powered by:

```text
POST /recommendations
```
