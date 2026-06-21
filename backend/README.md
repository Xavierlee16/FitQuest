# FitQuest Backend

This is the backend foundation for FitQuest.

It currently includes:

- FastAPI application setup
- SQLite database setup
- SQLAlchemy models for users and workouts
- Workout API endpoints
- Automatic XP and level calculation
- Rule-based training recommendations
- Achievements, badges, and daily quests
- Tests for gamification calculations
- A basic health check endpoint

## Run locally

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the API:

```bash
uvicorn app.main:app --reload
```

Open the health check:

```text
http://127.0.0.1:8000/health
```

## Production configuration

FitQuest reads deployment settings from environment variables:

```text
APP_NAME=FitQuest API
APP_ENV=production
DATABASE_URL=sqlite:///./fitquest.db
CORS_ORIGINS=https://your-frontend-domain.com
ENABLE_DOCS=false
```

Copy `.env.example` when setting up a host, then set the real values in that host's environment.

For production, start the API without `--reload`:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Workout endpoints

Create a workout:

```http
POST /workouts
```

```json
{
  "exercise_type": "pushup",
  "amount": 50,
  "unit": "reps"
}
```

View workout history:

```http
GET /workouts
```

View workout statistics:

```http
GET /workouts/stats
```

Get a training recommendation:

```http
POST /recommendations
```

```json
{
  "goal": "strength"
}
```

## Game endpoints

View achievements:

```http
GET /game/achievements
```

View badges:

```http
GET /game/badges
```

View daily quests:

```http
GET /game/daily-quests
```

View all game progress together:

```http
GET /game/summary
```

## Run tests

From the `backend` folder:

```bash
python -m unittest discover tests
```
