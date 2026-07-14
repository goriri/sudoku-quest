# Sudoku Quest: Magic Kingdom 🔮✨

A cartoon-styled, adventure-themed Sudoku game designed for children! Players embark on a quest through a magic world, solving puzzles, collecting Mana Coins, purchasing magic power-up items, and tracking their levels on a map.

## 🌟 Features

*   **Adventure Progression Map**: Solve puzzles to advance through three magical zones:
    1.  **Whispering Woods** (Levels 1-5, simple 4x4 grids for beginners)
    2.  **Crystal Caves** (Levels 6-10, intermediate 6x6 grids)
    3.  **Cloud Castle** (Levels 11-15, master 9x9 grids)
*   **Magic Emojis Mode**: Swap standard numbers for fun, colorful icons (🍄, ⭐, 🍀, 🔮, 🦄, 🧪, 👑, 🗝️, 💎) to make gameplay engaging for younger kids.
*   **Mistake Heart System**: Players start with 3 Hearts. Making a mistake costs a heart, encouraging careful logic!
*   **Magic Shop**: Earn coins by completing puzzles and spend them on items:
    *   🪄 **Magic Wand (Hint)**: Fills in a chosen cell.
    *   🛡️ **Crystal Shield**: Protects you from a mistake (prevents losing a heart).
    *   ⏳ **Time Hourglass**: Deducts 60 seconds from your high score timer.
*   **Progress Saving**: Log in with a simple character username and password. Puzzles auto-save mid-game so progress is never lost.

---

## 🛠️ Local Development Setup

The game is built with a **FastAPI** backend (Python) and a **React** frontend (JavaScript/Vite).

### Prerequisites
*   Python 3.11+
*   Node.js v18+ & npm

### 1. Backend Setup (FastAPI)
Navigate to the root directory and create a Python virtual environment:
```bash
# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt
pip install pytest httpx

# Start the development server
PYTHONPATH=. uvicorn backend.main:app --reload --port 8000
```
The API will be available at `http://localhost:8000`. Automatic documentation can be viewed at `http://localhost:8000/docs`.

### 2. Frontend Setup (React + Vite)
Open a new terminal session, navigate to the `frontend` folder:
```bash
cd frontend

# Install package dependencies
npm install

# Start Vite development server
npm run dev
```
Open `http://localhost:5173` in your browser. The Vite configuration contains an automatic API proxy mapping `/api/*` to `http://localhost:8000`.

---

## 🧪 Testing

The codebase includes full unit, integration, and E2E browser tests.

### Running Backend Unit & API Tests
Ensure your python virtual environment is active, then run:
```bash
PYTHONPATH=. pytest backend/tests/
```

### Running Browser E2E Tests (Playwright)
Playwright spins up the FastAPI app, launches a headless Chromium instance, and plays through a full user experience scenario (registration -> shop buying -> board completing -> win progress):
```bash
cd frontend
# Install browsers if running for the first time
npx playwright install chromium

# Execute E2E tests
npx playwright test
```

---

## 🐳 Containerization & Deployment

### Production Docker Build
To compile the React assets and package the FastAPI server into a single production-ready container:
```bash
docker build -t sudoku-quest .
docker run -p 8080:8080 sudoku-quest
```

### Deploying to Google Cloud Run
You can deploy directly to Google Cloud Run using the `gcloud` CLI. The container connects securely to Google Cloud SQL (PostgreSQL) via Unix sockets.

```bash
gcloud run deploy sudoku-quest \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --add-cloudsql-instances [YOUR_CLOUD_SQL_CONNECTION_NAME] \
  --set-env-vars "DATABASE_URL=postgresql+psycopg2://[DB_USER]:[DB_PASSWORD]@/[DB_NAME]?host=/cloudsql/[YOUR_CLOUD_SQL_CONNECTION_NAME]"
```
*(Make sure to replace placeholder values with your GCP database credentials).*
