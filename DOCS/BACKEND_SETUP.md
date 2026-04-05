# Django Backend Setup Guide

## Project Structure

```
BACKEND/
├── manage.py                  # Django management script
├── requirements.txt           # Python dependencies
├── .env.example              # Environment variables template
├── config/                   # Django project settings
│   ├── __init__.py
│   ├── settings.py           # Main settings file
│   ├── urls.py               # URL routing
│   └── wsgi.py               # WSGI application
└── apps/                     # Django applications
    ├── users/                # User authentication & profiles
    ├── futsals/              # Futsal venues & time slots
    ├── bookings/             # Booking management
    ├── payments/             # Payment processing
    ├── reviews/              # Reviews & ratings
    └── notifications/        # User notifications
```

## Installation Steps

### 1. Clone and Navigate
```bash
cd FutsalHub/BACKEND
```

### 2. Create Virtual Environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Setup Environment Variables
```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your settings:
# - Database credentials
# - Secret keys
# - API endpoints
```

### 5. Setup PostgreSQL Database
```bash
# Windows (assuming PostgreSQL is installed)
createdb futsalhub

# macOS/Linux
createdb futsalhub
```

### 6. Run Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### 7. Create Superuser (Admin)
```bash
python manage.py createsuperuser
```

### 8. Run Development Server
```bash
python manage.py runserver
```

Server will run at: **http://localhost:8000**

---

## API Documentation

Access interactive API docs at:
- Swagger UI: http://localhost:8000/api/docs/
- Schema: http://localhost:8000/api/schema/

---

## Main API Endpoints

### Authentication
```
POST   /api/auth/register/        - Register new user
POST   /api/auth/login/           - Login user
POST   /api/auth/token/           - Get JWT tokens
POST   /api/auth/token/refresh/   - Refresh JWT token
```

### Users
```
GET    /api/users/me/             - Get current user profile
PUT    /api/users/me/update_profile/ - Update profile
POST   /api/users/me/change_password/ - Change password
```

### Futsals
```
GET    /api/futsals/              - List all approved futsals (search/filter)
POST   /api/futsals/              - Create futsal (owner only)
GET    /api/futsals/{id}/         - Get futsal details with slots
PUT    /api/futsals/{id}/         - Update futsal (owner only)
DELETE /api/futsals/{id}/         - Delete futsal (owner only)
GET    /api/futsals/my_futsals/   - Get owner's futsals
POST   /api/futsals/{id}/approve/ - Approve futsal (admin only)
POST   /api/futsals/{id}/reject/  - Reject futsal (admin only)
```

### Time Slots
```
GET    /api/slots/                - List time slots (filterable by futsal, date)
POST   /api/slots/                - Create time slot (owner only)
PUT    /api/slots/{id}/           - Update time slot (owner only)
DELETE /api/slots/{id}/           - Delete time slot (owner only)
```

### Bookings
```
GET    /api/bookings/             - List bookings (user's own or futsal owner's)
POST   /api/bookings/             - Create booking
GET    /api/bookings/{id}/        - Get booking details
PUT    /api/bookings/{id}/        - Update booking status
POST   /api/bookings/{id}/cancel/ - Cancel booking
POST   /api/bookings/{id}/confirm/ - Confirm booking (owner only)
```

### Payments
```
GET    /api/payments/             - List payments (user's own or futsal owner's)
GET    /api/payments/{id}/        - Get payment details
```

### Reviews
```
GET    /api/reviews/              - List all reviews
POST   /api/reviews/              - Create review
PUT    /api/reviews/{id}/         - Update review (user's own)
DELETE /api/reviews/{id}/         - Delete review (user's own or admin)
```

### Notifications
```
GET    /api/notifications/        - List user notifications
POST   /api/notifications/{id}/mark_as_read/ - Mark as read
POST   /api/notifications/mark_all_as_read/  - Mark all as read
GET    /api/notifications/unread_count/      - Get unread count
DELETE /api/notifications/{id}/   - Delete notification
```

---

## Database Models

### User
- Extends Django's AbstractUser
- Roles: player, owner, admin
- Status: active, inactive, suspended

### Futsal
- Belongs to owner (User)
- Has many TimeSlots
- Approval status: pending, approved, rejected

### TimeSlot
- Belongs to Futsal
- Unique per futsal per date-time
- Availability: available, booked, maintenance

### Booking
- Links User to TimeSlot
- Status: confirmed, cancelled, completed, no_show
- Payment status: pending, completed, failed, refunded

### Payment
- One-to-one with Booking
- Method: credit_card, debit_card, net_banking, cash, e_wallet

### Review
- User reviews Futsal
- Rating: 1-5 stars
- Unique per user-futsal pair

### Notification
- Belongs to User
- Types: booking, payment, alert, review, system

---

## Key Features Implemented

✅ JWT Authentication with custom claims
✅ Role-based access control (Player, Owner, Admin)
✅ Futsal CRUD operations with approval workflow
✅ Time slot management
✅ Booking system with status tracking
✅ Payment tracking
✅ Review & rating system
✅ Notification system
✅ Advanced filtering & search
✅ Pagination support
✅ Admin dashboard ready
✅ API documentation (Swagger)

---

## Testing the API

### Using cURL

```bash
# Register
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "testpass123",
    "password2": "testpass123",
    "role": "player"
  }'

# Login
curl -X POST http://localhost:8000/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpass123"
  }'

# List futsals (with token)
curl -X GET http://localhost:8000/api/futsals/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Using Postman
1. Import API endpoints into Postman
2. Get JWT token from login endpoint
3. Add token to Authorization header: `Bearer <token>`
4. Test endpoints

---

## Admin Dashboard

Access admin panel at: **http://localhost:8000/admin/**

Login with superuser credentials created during setup.

Admin can:
- Manage users
- Approve/reject futsal venues
- View all bookings
- Manage payments
- View analytics
- Handle system issues

---

## Common Issues & Solutions

### Database Connection Error
```bash
# Ensure PostgreSQL is running
psql -U postgres  # Test connection
```

### Migration Errors
```bash
# Fresh migration
python manage.py migrate --fake-initial
python manage.py migrate
```

### Port Already in Use
```bash
# Use different port
python manage.py runserver 8001
```

### Permission Denied on Files
```bash
# Windows
icacls "path/to/folder" /grant Users:F /T

# Linux/Mac
chmod -R 755 path/to/folder
```

---

## Next Steps

1. **Frontend Integration**: Connect React frontend to these API endpoints
2. **Payment Gateway**: Integrate Stripe/payment provider
3. **Email Notifications**: Setup email sending for notifications
4. **Real-time Updates**: Consider WebSockets for live updates
5. **Testing**: Write unit & integration tests
6. **Deployment**: Setup production deployment (Heroku, AWS, etc.)

---

## Support & Documentation

- Django Docs: https://docs.djangoproject.com/
- DRF Docs: https://www.django-rest-framework.org/
- PostgreSQL Docs: https://www.postgresql.org/docs/
- JWT Docs: https://django-rest-framework-simplejwt.readthedocs.io/

