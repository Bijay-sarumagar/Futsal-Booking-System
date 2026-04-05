# 🚀 GETTING STARTED - FutsalHub

## Your Project is Ready! 🎉

Everything has been created in this folder:
```
📁 c:\Users\bijay\OneDrive\Documents\FYP Project\new\FutsalHub\
```

---

## ⚡ QUICK START (5 Minutes to Running Backend)

### Step 1: Open PowerShell/CMD
Navigate to backend directory:
```powershell
cd "c:\Users\bijay\OneDrive\Documents\FYP Project\new\FutsalHub\BACKEND"
```

### Step 2: Create Virtual Environment
```powershell
python -m venv venv
venv\Scripts\activate
```

You should see `(venv)` in your terminal.

### Step 3: Install Dependencies
```powershell
pip install -r requirements.txt
```

This will install:
- Django 4.2.10
- Django REST Framework 3.14.0
- PostgreSQL driver (psycopg2)
- JWT authentication
- CORS support
- API documentation (drf-spectacular)
- And more...

### Step 4: Create PostgreSQL Database
**If you have PostgreSQL installed:**
```powershell
createdb futsalhub
```

**If you don't have PostgreSQL:**
1. Download: https://www.postgresql.org/download/windows/
2. Install with default settings
3. Run above command

### Step 5: Configure Environment
```powershell
# Copy example to .env
cp .env.example .env

# Edit .env with your settings (or keep defaults for development)
# Default in .env.example should work for local development
```

### Step 6: Run Migrations
```powershell
python manage.py migrate
```

This creates all database tables.

### Step 7: Create Admin User
```powershell
python manage.py createsuperuser
```

Follow prompts:
```
Username: admin
Email: admin@example.com
Password: your_password
```

### Step 8: Start Server
```powershell
python manage.py runserver
```

**Success! Server running at:** http://localhost:8000

---

## 🧭 What's Available Now

### 📚 API Documentation
Open in browser: **http://localhost:8000/api/docs/**

You can test ALL API endpoints in the browser! ✅

### 👤 Admin Panel
Open in browser: **http://localhost:8000/admin/**

Login with admin credentials from Step 7

### 🔌 Live API Endpoint
All APIs ready at: **http://localhost:8000/api/**

---

## 📋 Project Structure Overview

```
FutsalHub/
├── BACKEND/              ← Django backend ✅ READY
│   └── apps/
│       ├── users/        ← Authentication
│       ├── futsals/      ← Venues & slots
│       ├── bookings/     ← Reservations
│       ├── payments/     ← Payments
│       ├── reviews/      ← Ratings
│       └── notifications/← Alerts
│
├── FRONTEND/             ← React app 🔜 NEXT
│
└── DOCS/                 ← Documentation
    ├── BACKEND_SETUP.md           ← Detailed backend guide
    ├── DATABASE_SCHEMA.md         ← Database design
    ├── PROJECT_NOTES.md           ← Requirements
    ├── COMPLETION_SUMMARY.md      ← What was built
    ├── ARCHITECTURE.md            ← System design
    └── GETTING_STARTED.md         ← This file!
```

---

## 🧪 Test the Backend

### Using Swagger UI (Easiest)
1. Go to: http://localhost:8000/api/docs/
2. Click "Try it out" on any endpoint
3. Fill in parameters
4. Click "Execute"

### Example: Register a User

**1. In Swagger UI, find:** `POST /api/auth/register/`

**2. Click "Try it out"**

**3. Enter this JSON:**
```json
{
  "username": "testplayer",
  "email": "player@test.com",
  "first_name": "Test",
  "last_name": "Player",
  "phone": "9841234567",
  "password": "TestPass123!",
  "password2": "TestPass123!",
  "role": "player"
}
```

**4. Click Execute** → You'll get a response!

### Example: Login

**1. Find:** `POST /api/auth/token/`

**2. Enter:**
```json
{
  "username": "testplayer",
  "password": "TestPass123!"
}
```

**3. Click Execute** → Get back access token!

```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### Example: Use Token to Call Authenticated Endpoint

**1. Copy the access token**

**2. Find:** `GET /api/users/me/`

**3. In top right, click Authorize**

**4. Paste token like:** `Bearer <your_token>`

**5. Try the endpoint** → Get your user profile!

---

## 📊 Database Tables Created

After migration, these tables exist in PostgreSQL:

```
✅ users_user              - User accounts
✅ futsals_futsal          - Futsal venues
✅ futsals_timeslot        - Available slots
✅ bookings_booking        - Reservations
✅ payments_payment        - Payments
✅ reviews_review          - Reviews & ratings
✅ notifications_notification - User alerts
```

View them in admin panel: http://localhost:8000/admin/

---

## 🔑 Key API Endpoints to Try

### Authentication
```
POST   /api/auth/register/      - Create account
POST   /api/auth/token/         - Login
POST   /api/auth/token/refresh/ - Refresh token
```

### Browse Data
```
GET    /api/users/me/           - Your profile
GET    /api/futsals/            - All futsals
GET    /api/reviews/            - All reviews
GET    /api/notifications/      - Your notifications
```

### Create Data
```
POST   /api/bookings/           - Make a booking
POST   /api/reviews/            - Leave a review
POST   /api/slots/              - Create time slot (owner)
```

---

## 🛠️ Common Tasks

### Restart Server
```powershell
# Ctrl+C to stop
# Then run again:
python manage.py runserver
```

### Create More Test Data
```powershell
# Use Swagger UI or admin panel at:
http://localhost:8000/admin/
```

### Check Logs
```powershell
# Run in different terminal:
# Logs will appear in server terminal
```

### Add More Users
```powershell
# Create superuser (admin):
python manage.py createsuperuser

# Or use Swagger to register regular users
```

### Database Reset (WARNING: Deletes all data!)
```powershell
# Only do this for development!
python manage.py migrate zero
python manage.py migrate
```

---

## ✅ Checklist - Backend Ready?

- [ ] PostgreSQL installed & running
- [ ] Virtual environment created & activated
- [ ] Dependencies installed (`pip install -r requirements.txt`)
- [ ] Database created (`createdb futsalhub`)
- [ ] Migrations run (`python manage.py migrate`)
- [ ] Admin user created (`python manage.py createsuperuser`)
- [ ] Server running (`python manage.py runserver`)
- [ ] Can access http://localhost:8000/api/docs/ ✅
- [ ] Can login in admin panel

If all checked ✅ → **Backend is ready!**

---

## 🎯 Next Phase: Frontend Integration

When backend is stable:

1. **Migrate React code** from `sample/` to `FRONTEND/`
2. **Setup API calls** to connect to backend
3. **Test all flows** (register, login, booking, etc.)
4. **Deploy** both backend and frontend

---

## 📱 API Request Examples

### Using cURL (Command Line)

```bash
# Register
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"user1\",\"email\":\"user1@test.com\",\"password\":\"Pass123!\",\"password2\":\"Pass123!\",\"role\":\"player\"}"

# Login
curl -X POST http://localhost:8000/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"user1\",\"password\":\"Pass123!\"}"

# List futsals
curl http://localhost:8000/api/futsals/
```

### Using Postman (GUI)

1. Download: https://www.postman.com/downloads/
2. Create new request
3. Set method to POST
4. Set URL to: `http://localhost:8000/api/auth/token/`
5. Body → JSON → Enter credentials
6. Send

---

## 🚨 Troubleshooting

### "createdb: command not found"
→ PostgreSQL not in PATH. Reinstall or add to PATH.

### "connection refused"
→ PostgreSQL not running. Start PostgreSQL service.

### "ModuleNotFoundError: No module named 'django'"
→ Virtual environment not activated. Run: `venv\Scripts\activate`

### "python: command not found"
→ Python not installed. Download from: https://www.python.org/downloads/

### Port 8000 already in use
→ Run on different port: `python manage.py runserver 8001`

---

## 📞 Help & Resources

**Documentation in this folder:**
- `BACKEND_SETUP.md` - Full setup guide
- `DATABASE_SCHEMA.md` - Database design
- `PROJECT_NOTES.md` - Features & requirements
- `ARCHITECTURE.md` - System architecture

**Online Resources:**
- Django Docs: https://docs.djangoproject.com/
- DRF Docs: https://www.django-rest-framework.org/
- JWT Docs: https://django-rest-framework-simplejwt.readthedocs.io/

---

## 🎊 You're Ready!

**Your FYP backend is complete and ready to use!**

### Right Now You Have:
✅ Running Django API server
✅ Database with 7 tables
✅ 40+ API endpoints
✅ JWT authentication
✅ Admin dashboard
✅ API documentation
✅ User, Futsal, Booking, Payment, Review, Notification systems

### Next Steps:
1. Keep backend running
2. Test APIs in Swagger UI
3. Integrate with React frontend
4. Test end-to-end flows
5. Deploy to production

---

## 💬 Questions?

Refer to the documentation files created in the DOCS folder, or check the official Django/DRF documentation linked above.

**Happy coding! 🚀**

