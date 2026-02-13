# FutsalHub - Location-Based Futsal Booking System

A comprehensive web platform for booking futsal courts online, similar to Airbnb but for futsals in Nepal and beyond.

## Quick Setup

### Prerequisites
- Python 3.9+
- Node.js 18+
- PostgreSQL 12+
- Git

### Project Structure
```
FutsalHub/
├── BACKEND/              # Django REST API
├── FRONTEND/             # React application
├── DOCS/                 # Documentation
│   ├── DATABASE_SCHEMA.md
│   └── PROJECT_NOTES.md
└── README.md
```

## Backend Setup (Django)

### 1. Navigate to backend directory
```bash
cd BACKEND
```

### 2. Create virtual environment
```bash
python -m venv venv

# On Windows
venv\Scripts\activate

# On macOS/Linux
source venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Setup PostgreSQL
```bash
# Create database
createdb futsalhub

# Create .env file with database credentials
cp .env.example .env
```

### 5. Run migrations
```bash
python manage.py migrate
```

### 6. Create superuser
```bash
python manage.py createsuperuser
```

### 7. Run development server
```bash
python manage.py runserver
```

Backend will be available at: `http://localhost:8000`

---

## Frontend Setup (React)

### 1. Navigate to frontend directory
```bash
cd FRONTEND
```

### 2. Install dependencies
```bash
npm install
# or
yarn install
```

### 3. Create environment file
```bash
cp .env.example .env
```

### 4. Configure API endpoint
```
VITE_API_URL=http://localhost:8000/api
```

### 5. Run development server
```bash
npm run dev
# or
yarn dev
```

Frontend will be available at: `http://localhost:5173`

---

## API Documentation

See [DOCS/API.md](DOCS/API.md) for complete API documentation.

### Main API Endpoints
- **Auth**: `/api/auth/`
- **Users**: `/api/users/`
- **Futsals**: `/api/futsals/`
- **Slots**: `/api/slots/`
- **Bookings**: `/api/bookings/`
- **Payments**: `/api/payments/`
- **Reviews**: `/api/reviews/`
- **Notifications**: `/api/notifications/`
- **Admin**: `/api/admin/`

---

## Database Schema

The project uses a fully normalized (3NF) PostgreSQL database with the following main tables:
- `User` - User accounts (players, owners, admins)
- `Futsal` - Futsal court venues
- `TimeSlot` - Available booking slots
- `Booking` - Reservations
- `Payment` - Payment transactions
- `Review` - User ratings & comments
- `Notification` - User notifications

See [DOCS/DATABASE_SCHEMA.md](DOCS/DATABASE_SCHEMA.md) for detailed schema.

---

## User Roles

### Player
- Search & book futsal courts
- View available slots
- Make payments
- Leave reviews

### Owner
- Register futsal venue
- Manage time slots & pricing
- Track bookings & payments
- View analytics

### Admin
- Approve owner registrations
- Monitor platform activity
- Handle disputes
- View platform analytics

---

## Authentication

The application uses JWT (JSON Web Tokens) for authentication.

**Login Flow:**
1. User submits credentials
2. Backend validates and returns access/refresh tokens
3. Frontend stores tokens in local storage
4. Tokens are sent with API requests in Authorization header

---

## Features

### Current Phase (MVP)
- [x] User authentication
- [x] Futsal listing
- [x] Basic search
- [x] Booking system
- [x] Payment integration
- [x] Admin approval

### Planned Features
- [ ] Location-based search with maps
- [ ] Advanced filtering
- [ ] Ratings & reviews
- [ ] Analytics dashboard
- [ ] Notifications system
- [ ] Tournament matching
- [ ] AI recommendations

---

## Development

### Running Tests
```bash
# Backend tests
cd BACKEND
python manage.py test

# Frontend tests
cd FRONTEND
npm test
```

### Building for Production
```bash
# Backend
cd BACKEND
python manage.py collectstatic

# Frontend
cd FRONTEND
npm run build
```

---

## License

This project is for educational purposes (FYP).

---

## Developer

**Bijay** - FYP Project

---

## Support

For issues or questions, please refer to the documentation or create an issue on GitHub.
