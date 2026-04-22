# TalentBridge — HR Job Portal

Full-stack recruitment platform with role-based access, Aadhaar-verified duplicate prevention, day-wise resume storage, and AI-powered shortlisting.

## Tech Stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Frontend   | Next.js 14 (App Router) · Tailwind CSS          |
| Backend    | Django 5 · Django REST Framework · SimpleJWT   |
| Database   | **PostgreSQL 16** (primary relational store)    |
| Cache/Queue| **Redis 7** (Celery broker + session cache)     |
| PDF Parse  | pdfminer.six · PyPDF2 (fallback)               |
| AI Scoring | OpenAI GPT-4o-mini · Google Gemini 1.5 Flash   |
| Task Queue | Celery 5 (async PDF parse + AI scoring)         |

---

## Security Features

### Aadhaar Duplicate Guard
- Aadhaar is **never stored in plaintext** anywhere in the system
- On registration, a one-way **SHA-256 hash** is stored (`aadhaar_hash` field)
- At application time, the hash is **snapshot-copied** into `Application.aadhaar_hash_snapshot`
- If the **same Aadhaar** tries to apply to the **same job** from a **different account/name**, the system blocks it with:
  > "Our records show that you have already applied for this job using a different account."

### Role Separation
| Feature                  | Applicant | HR  |
|--------------------------|-----------|-----|
| See job listings         | ✅         | ❌  |
| Apply to jobs            | ✅         | ❌  |
| Upload resume            | ✅         | ❌  |
| See HR dashboard         | ❌         | ✅  |
| See AI scores            | ❌         | ✅  |
| See other applicants     | ❌         | ✅  |
| Post jobs                | ❌         | ✅  |
| Change application status| ❌         | ✅  |

### Shortlist Visibility
- Applicants see a **human-readable status message** (e.g. "🎉 Congratulations! You have been shortlisted...")
- Applicants **never see** AI scores, HR notes, or other applicants' data

---

## Day-wise Resume Storage

Resumes are stored locally at:
```
media/resumes/YYYY-MM-DD/job_<id>/<user_id>.pdf
```

HR can filter applications by date in the left sidebar of the applications view. This allows:
- "How many people applied today for Job X?"
- "Show me all resumes from 2024-01-15 for this role"

---

## Quick Start

### 1. With Docker (recommended)
```bash
git clone <repo>
cd hr-portal

# Set your keys
cp .env.example .env
# Edit .env: OPENAI_API_KEY, SECRET_KEY, HR_INVITE_CODE

docker compose up --build
```

Runs at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
- Django Admin: http://localhost:8000/admin

### 2. Manual Setup

**Backend:**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Set up PostgreSQL
createdb hr_portal

# Run migrations
python manage.py migrate
python manage.py createsuperuser

# Start Django
python manage.py runserver

# Start Celery worker (new terminal)
celery -A core worker -l info
```

**Frontend:**
```bash
cd frontend
npm install
# Create .env.local:
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api" > .env.local
npm run dev
```

---

## Environment Variables

```env
# Backend (.env or environment)
SECRET_KEY=your-secret-key-here
DEBUG=False
DB_NAME=hr_portal
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
REDIS_URL=redis://localhost:6379/0

# AI Provider (choose one)
AI_PROVIDER=openai         # or 'gemini'
OPENAI_API_KEY=sk-...      # OpenAI key
GEMINI_API_KEY=...         # Google Gemini key

# Security
HR_INVITE_CODE=secret123   # Leave blank to disable in dev

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

---

## API Reference

### Auth
| Method | Endpoint                        | Description              |
|--------|---------------------------------|--------------------------|
| POST   | /api/auth/register/applicant/   | Applicant sign up        |
| POST   | /api/auth/register/hr/          | HR sign up               |
| POST   | /api/auth/login/                | Login → JWT tokens       |
| GET    | /api/auth/profile/              | My profile               |

### Jobs (all authenticated)
| Method | Endpoint              | Who  | Description              |
|--------|-----------------------|------|--------------------------|
| GET    | /api/jobs/            | All  | List active jobs         |
| POST   | /api/jobs/            | HR   | Create a job             |
| GET    | /api/jobs/{id}/       | All  | Job detail               |
| PATCH  | /api/jobs/{id}/       | HR   | Edit job                 |
| GET    | /api/jobs/{id}/stats/ | HR   | Application stats        |

### Applications
| Method | Endpoint                                          | Who       |
|--------|---------------------------------------------------|-----------|
| POST   | /api/applications/                                | Applicant |
| GET    | /api/applications/                                | Own only  |
| GET    | /api/applications/by_job/?job_id=X&date=YYYY-MM-DD| HR        |
| GET    | /api/applications/daily_summary/?job_id=X         | HR        |
| PATCH  | /api/applications/{id}/update_status/             | HR        |
| POST   | /api/applications/{id}/withdraw/                  | Applicant |

### Resumes
| Method | Endpoint                                  | Who       |
|--------|-------------------------------------------|-----------|
| POST   | /api/resumes/                             | Applicant |
| GET    | /api/resumes/by_date/?job_id=X&date=Y     | HR        |

### Shortlist
| Method | Endpoint           | Description                          |
|--------|--------------------|--------------------------------------|
| GET    | /api/shortlist/    | HR: ranked list by AI score          |
| POST   | /api/shortlist/    | HR: bulk-shortlist above threshold   |

---

## Application Flow

```
Applicant registers (with Aadhaar) → Browses jobs → Fills form →
Uploads PDF → [Celery] PDF parsed → [Celery] AI scored vs JD →
AI score saved → HR filters by date → HR sees ranked list →
HR shortlists → Applicant sees "🎉 Congratulations! You've been shortlisted"
```

## Aadhaar Duplicate Detection Flow

```
Day 1: User "Riya Sharma" applies to Job #5 from account A
       → aadhaar_hash_snapshot = sha256("123456789012") saved

Day 2: Same person creates account "Meera Pillai" from account B
       Tries to apply to Job #5
       → System checks: does any Application for Job #5
         have aadhaar_hash_snapshot = sha256("123456789012")?
       → YES → Blocked with error message
```
