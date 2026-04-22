# Plan: Mathe-Quiz Webanwendung - Responsive + Hetzner Deployment

## TL;DR

Responsive Webanwendung (React + Node.js TypeScript) für adaptives Mathe-Training mit SymPy-Integration. Deployment auf bestehendem Hetzner-Server mit Multi-App-Setup. 8+ Wochen mit perfektionistischem Ansatz.

**Tech-Stack**: React 18 (Frontend) | Node.js + TypeScript (Backend) | PostgreSQL + Redis | Docker | Hetzner VPS

---

## Projektparameter

- **Frontend-Domain**: `mathe-quiz.elmarhepp.de`
- **API-Domain**: `mathe-quiz-api.elmarhepp.de`
- **WEB_PORT**: 3031
- **API_PORT**: 3032
- **DEPLOY_PATH**: `/var/www/mathe-quiz`
- **Backend**: Node.js + Express/Fastify + TypeScript
- **Auth**: Email/Passwort + Profil + Statistiken + Fortschritts-Export
- **Timeline**: 8+ Wochen

---

# Phase-Übersicht

## 1. Tech-Stack (Detailliert)

### Frontend

- **Framework**: React 18 + TypeScript
  - Warum: Responsive UX, große Community, beste DevTools, Performance
  - State Management: Zustand (klein, schnell, für diese Komplexität ausreichend)
  - UI Components: Shadcn/ui (unstyled, schnell customisierbar)
  - Styling: Tailwind CSS (responsive by default)
  - Build: Vite (schneller als Create React App)

### Backend

- **Framework**: Python FastAPI
  - Warum: Schnell, async-native, SymPy Integration einfach, moderne Type Hints
  - Async Engine: Uvicorn (ASGI Server)
  - ORM: SQLAlchemy 2.0 (async support)
  - Parser & Math: SymPy (Anforderung erfüllt)

  Alternative: Node.js + Express + TS (wenn du TypeScript-Only bevorzugst)

### Datenbank

- **Primary**: PostgreSQL (relational, zuverlässig)
- **Cache**: Redis (optional, für Session Tracking & Spaced Repetition)

### DevOps / Deployment

- **Containerisierung**: Docker + Docker Compose
- **Hosting**: Hetzner Cloud (VPS oder App Platform)
- **Reverse Proxy**: Nginx
- **CI/CD**: GitHub Actions (free, Hetzner-Deployment)
- **Monitoring**: Sentry (Fehlertracking)

---

## 2. Projektstruktur

```
mathe-quiz/
├── frontend/                    # React + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── QuestionView.tsx       # Aufgabe anzeigen
│   │   │   ├── AnswerInput.tsx        # Input-Feld
│   │   │   ├── FeedbackDisplay.tsx    # Feedback nach Antwort
│   │   │   └── SessionSummary.tsx     # Session-Zusammenfassung
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx          # Übersicht + Module wählen
│   │   │   ├── Training.tsx           # Haupttraining
│   │   │   ├── Statistics.tsx         # Metriken & Fortschritt
│   │   │   └── Settings.tsx           # Benutzer-Einstellungen
│   │   ├── hooks/
│   │   │   ├── useTraining.ts         # Training-Logik
│   │   │   └── useAuth.ts             # Auth-Management
│   │   ├── services/
│   │   │   └── api.ts                 # API-Calls
│   │   ├── store/
│   │   │   └── trainingStore.ts       # Zustand State
│   │   └── App.tsx
│   ├── public/
│   └── vite.config.ts
│
├── backend/                     # Python FastAPI
│   ├── app/
│   │   ├── main.py                    # FastAPI App Entry
│   │   ├── config.py                  # Config (DB, SymPy)
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── task.py
│   │   │   └── session.py
│   │   ├── schemas/
│   │   │   ├── request.py             # Pydantic Request Models
│   │   │   └── response.py            # Response Models
│   │   ├── routers/
│   │   │   ├── auth.py                # Login/Register
│   │   │   ├── tasks.py               # GET Task
│   │   │   ├── submit.py              # POST Answer + Validation
│   │   │   ├── stats.py               # GET Statistics
│   │   │   └── modules.py             # Module Config
│   │   ├── services/
│   │   │   ├── task_generator.py      # Task Generation
│   │   │   ├── equation_validator.py  # SymPy Validation
│   │   │   ├── difficulty_adapter.py  # Level Anpassung
│   │   │   └── spaced_repetition.py   # Repetitions-Logik
│   │   ├── db/
│   │   │   ├── database.py            # SQLAlchemy Setup
│   │   │   └── crud.py                # DB Operations
│   │   └── utils/
│   │       └── error_classifier.py    # Fehlertypen
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── docker-compose.yml          # Local Development
├── docker-compose.prod.yml     # Production
├── nginx.conf                  # Reverse Proxy Config
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD Pipeline
└── README.md
```

---

## 3. Architektur-Übersicht

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                         │
│  React App → Responsive UI, Real-time Feedback              │
└──────────────┬──────────────────────────────────────────────┘
               │ HTTPS
┌──────────────▼──────────────────────────────────────────────┐
│              NGINX (Reverse Proxy)                          │
│  - SSL/TLS Termination                                      │
│  - Load Balancing (optional)                                │
│  - Static Files Serving                                     │
└──────────────┬──────────────────────────────────────────────┘
               │
        ┌──────┴──────┐
        │             │
┌───────▼───┐  ┌──────▼────────────────────────────────┐
│ React App │  │  FastAPI Backend (Uvicorn)           │
│ Static    │  │  - GET /task/next                    │
│ (dist/)   │  │  - POST /submit + Validation         │
│           │  │  - GET /stats                        │
└───────────┘  │  - Websocket (optional for realtime) │
               └──────┬──────────────────────────────────┘
                      │
        ┌─────────────┼──────────────┐
        │             │              │
   ┌────▼──────┐ ┌────▼────┐  ┌─────▼──────┐
   │ PostgreSQL│ │  Redis  │  │   SymPy    │
   │ (User DB) │ │ (Cache) │  │  (Parser)  │
   │ (Tasks)   │ │ (Replay)│  │ (Validator)│
   │ (Sessions)│ └─────────┘  └────────────┘
   └───────────┘
```

---

## 4. API-Endpoints (Backend)

### Authentication

- `POST /auth/register` → User erstellen
- `POST /auth/login` → JWT Token
- `POST /auth/refresh` → Token erneuern

### Training

- `GET /api/task/next?module=algebra&level=2` → Nächste Aufgabe
- `POST /api/task/submit` → Antwort validieren
  ```json
  {
    "task_id": "uuid",
    "user_answer": "2x = 8",
    "time_ms": 2300
  }
  ```
- `GET /api/session/summary` → Session-Zusammenfassung

### Statistiken

- `GET /api/stats/dashboard` → Übersicht (Genauigkeit, Zeit, Level)
- `GET /api/stats/detail?module=algebra` → Detaillierte Metriken

### Verwaltung

- `GET /api/modules` → Verfügbare Module + Current Level
- `PATCH /api/settings` → Benutzer-Einstellungen

---

## 5. Response-Beispiele

### GET /api/task/next

```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "module": "algebra",
  "type": "step_by_step",
  "equation": "2x + 3 = 11",
  "level": 2,
  "current_step": 0,
  "total_steps": 2,
  "instruction": "Subtrahiere 3 von beiden Seiten"
}
```

### POST /api/task/submit (Response)

```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "correct": true,
  "time_ms": 2300,
  "feedback": {
    "status": "correct",
    "message": "Richtig! ✓",
    "solution": "2x = 11 - 3 = 8",
    "next_level": 2
  }
}
```

---

## 6. Deployment auf Hetzner

### Option A: Docker on Hetzner Cloud VPS (Empfohlen für mehrere Apps)

**Setup:**

1. VPS mieten (Ubuntu 22.04, 2-4 GB RAM)
2. Docker + Docker Compose installieren
3. Git Repo clonen
4. Docker Compose hochfahren
5. Nginx als Reverse Proxy vor mehreren Apps

**Dateistruktur auf Server:**

```
/home/ubuntu/
├── mathe-quiz/
│   ├── docker-compose.prod.yml
│   ├── .env (geheim!)
│   └── nginx/
│       └── mathe-quiz.conf
├── andere-app-1/
├── andere-app-2/
└── nginx.conf (zentral für alle Apps)
```

**docker-compose.prod.yml:**

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: mathe_quiz
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/mathe_quiz
      REDIS_URL: redis://redis:6379/0
      ENVIRONMENT: production
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    expose:
      - "8000"

  frontend:
    build: ./frontend
    expose:
      - "3000"
    restart: unless-stopped

volumes:
  postgres_data:
```

### Option B: Hetzner App Platform (Managed)

**Vorteile:**

- Auto-Scaling
- SSL automatisch
- Keine Server-Verwaltung

**Nachteile:**

- Teurer
- Weniger Kontrolle

Empfehlung: **Option A** (VPS), da du bereits mehrere Apps hast → Kosteneffizienter

---

## 7. CI/CD (GitHub Actions → Hetzner Deployment)

**.github/workflows/deploy.yml:**

```yaml
name: Deploy to Hetzner

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: SSH Deploy
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HETZNER_HOST }}
          username: ${{ secrets.HETZNER_USER }}
          key: ${{ secrets.HETZNER_SSH_KEY }}
          script: |
            cd ~/mathe-quiz
            git pull origin main
            docker-compose -f docker-compose.prod.yml down
            docker-compose -f docker-compose.prod.yml up -d --build
            docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

---

## 8. Lokale Entwicklung

**Setup (First Time):**

```bash
# Clone
git clone ...
cd mathe-quiz

# Frontend
cd frontend
npm install
npm run dev  # http://localhost:5173

# Backend (neues Terminal)
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload  # http://localhost:8000

# Docker (optional)
docker-compose up -d  # PostgreSQL + Redis lokal
```

---

## 9. Performance & Security Checklist

### Performance

- [ ] Frontend: Gzip Compression (Nginx)
- [ ] Backend: Response Caching (Redis)
- [ ] Database: Indexing auf häufig abgefragten Spalten
- [ ] SymPy: Caching von Parse-Ergebnissen
- [ ] Lazy Loading: Statistiken nur bei Bedarf laden

### Security

- [ ] HTTPS/SSL (Let's Encrypt automatisch bei Hetzner)
- [ ] JWT Auth (Tokens mit Expiration)
- [ ] CORS Config (nur Frontend-Domain erlauben)
- [ ] Rate Limiting (max 10 requests/min per IP)
- [ ] SQL Injection Prevention (SQLAlchemy parametrized queries)
- [ ] Input Validation (Pydantic Schemas)
- [ ] Secrets in .env (nie in Git)

---

## 10. Kosten-Schätzung (Hetzner)

| Item           | Preis/Monat | Notizen                   |
| -------------- | ----------- | ------------------------- |
| VPS (2 GB RAM) | €4-5        | Teilst mit anderen Apps   |
| Domain         | €0-1        | Je nach Registry          |
| SSL            | €0          | Let's Encrypt (kostenlos) |
| **Total**      | **€5-6**    | Sehr günstig!             |

---

## 11. Nächste Schritte (Roadmap)

### Phase 1: MVP (Woche 1-2)

- [ ] Backend: Task Generator + SymPy Validator
- [ ] Frontend: QuestionView + AnswerInput
- [ ] Database: User + Task Models
- [ ] Login/Register (simpel)

### Phase 2: Features (Woche 2-3)

- [ ] Difficulty Adaptation
- [ ] Spaced Repetition
- [ ] Statistics Dashboard
- [ ] Session Summary

### Phase 3: Polish (Woche 3-4)

- [ ] Responsive Design (Mobile/Tablet)
- [ ] Performance Optimization
- [ ] Error Handling & Logging
- [ ] Deployment & Monitoring

### Phase 4: Extensions

- [ ] Websocket für Real-time Leaderboards (optional)
- [ ] Weitere Module (Geometry, etc.)
- [ ] Mobile App (React Native)

---

## 12. Ressourcen & Tools

- **React Docs**: https://react.dev
- **FastAPI Docs**: https://fastapi.tiangolo.com
- **SQLAlchemy Async**: https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html
- **SymPy**: https://www.sympy.org/en/index.html
- **Tailwind CSS**: https://tailwindcss.com
- **Docker**: https://docs.docker.com
- **Hetzner Docs**: https://docs.hetzner.cloud

---

**Fragen?** Was möchtest du als erstes implementieren?
