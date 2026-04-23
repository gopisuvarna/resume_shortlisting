# HR Portal

Full-stack recruitment platform with role-based access, AI-powered shortlisting, and day-wise resume storage.

## Tech Stack

| Layer       | Technology                                                |
| ----------- | --------------------------------------------------------- |
| Frontend    | Next.js 14 (App Router), React 18, Tailwind CSS           |
| Backend     | Django 5, Django REST Framework, SimpleJWT                |
| Database    | PostgreSQL 16                                             |
| Cache       | Redis 7                                                  |
| ML/Scoring  | sentence-transformers, FAISS, BM25, scikit-learn, PyMuPDF |
| Server      | Gunicorn                                                  |

## Core Features

- Role-based flows for HR and Applicants
- JWT authentication with refresh/verify support
- HR job management and analytics
- Application pipeline with status updates
- AI-assisted ranking and bulk shortlist by score threshold
- Resume upload with day-wise storage layout

## Project Structure

```text
hr-portal/
  backend/        # Django API
  frontend/       # Next.js web app
  docker-compose.yml
  sonar-project.properties
```

## Quick Start (Docker)

1. Clone the repo and move into project folder.
2. Ensure backend env file exists.

```bash
git clone <your-repo-url>
cd hr-portal
```

This project currently uses `env_file: ./backend/.env.example` in `docker-compose.yml`, but the repository contains `backend/.env`.

Use one of these options before starting containers:

- Create `backend/.env.example` with your values.
- Or update `docker-compose.yml` to point to `./backend/.env`.

Then run:

```bash
docker compose up --build
```

Services:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
- Django Admin: http://localhost:8000/admin

## Local Development

### Backend

```bash
cd backend
python -m venv venv
```

Windows PowerShell:

```powershell
venv\Scripts\Activate.ps1
```

macOS/Linux:

```bash
source venv/bin/activate
```

Install and run:

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

### Backend (`backend/.env`)

```env
SECRET_KEY=change-me
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,*

DB_NAME=hr_portal
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432

REDIS_URL=redis://localhost:6379/0

COMPANY_NAME=Nueve IT Solutions
HR_INVITE_CODE=

GROQ_API_KEY=
OPENROUTER_API_KEY=
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free

AUTO_SHORTLIST_ENABLED=True
AUTO_SHORTLIST_THRESHOLD=60
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_COMPANY_NAME=Nueve IT Solutions
```

## API Overview

Base URL: `/api`

### Auth

- `POST /auth/register/applicant/`
- `POST /auth/register/hr/`
- `POST /auth/login/`
- `POST /auth/logout/`
- `GET /auth/profile/`
- `PATCH /auth/profile/`
- `POST /auth/change-password/`
- `POST /token/refresh/`
- `POST /token/verify/`

### Jobs

- `GET /jobs/`
- `POST /jobs/` (HR)
- `GET /jobs/{id}/`
- `PATCH /jobs/{id}/` (HR)
- `DELETE /jobs/{id}/` (HR)
- `GET /jobs/{id}/stats/` (HR)
- `GET /jobs/my_jobs/` (HR)

### Applications

- `GET /applications/`
- `POST /applications/` (Applicant)
- `GET /applications/{id}/`
- `DELETE /applications/{id}/`
- `GET /applications/by_job/?job_id=<id>&date=<YYYY-MM-DD>` (HR)
- `GET /applications/daily_summary/?job_id=<id>` (HR)
- `PATCH /applications/{id}/update_status/` (HR)
- `POST /applications/{id}/withdraw/` (Applicant)

### Shortlist

- `GET /shortlist/?job_id=<id>&min_score=<n>&recommendation=<tag>` (HR)
- `POST /shortlist/` (HR bulk shortlist)
- `POST /shortlist/rescore/` (HR rescore)

## Resume Storage

Resumes are stored by upload function as:

```text
media/resumes/<job_id>/<YYYY-MM-DD>/<user_id>_<filename>
```

This enables HR date-based filtering through `daily_summary` and `by_job` APIs.

## Admin Commands

Create admin HR user quickly:

```bash
python manage.py createadmin
```

Create superuser (forced HR role):

```bash
python manage.py createsuperuser
```

## Notes

- Applicants and HR have separate permissions throughout API and UI.
- HR users are staff-enabled by model rules.
- Static files are collected in Docker startup via `collectstatic`.
