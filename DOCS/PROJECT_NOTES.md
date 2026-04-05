# FutsalHub - Project Requirements & Notes

## Project Overview
**Location-Based Online Futsal Booking & Management System** (Airbnb-style for futsals)

## Tech Stack
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Radix UI
- **Backend**: Django, Django REST Framework
- **Database**: PostgreSQL
- **Version Control**: Git & GitHub
- **Design**: Figma
- **Development Tools**: VS Code

## Core Features

### Phase 1 - MVP (Essential)
- [ ] User authentication (Players & Owners)
- [ ] Basic futsal listing & search by location
- [ ] Time slot management
- [ ] Simple booking system
- [ ] Basic payment integration
- [ ] User profiles (Player & Owner)
- [ ] Admin approval system for owners

### Phase 2 - Core Features
- [ ] Location maps & distance-based search
- [ ] Ratings & Reviews system
- [ ] Owner dashboard (manage futsals, slots, bookings)
- [ ] Player dashboard (view bookings, manage reservations)
- [ ] Admin dashboard (approve owners, monitor platform)
- [ ] Cancellation policies
- [ ] Notifications system

### Phase 3 - Advanced Features
- [ ] Analytics dashboard for owners
- [ ] AI-powered slot suggestions
- [ ] Dynamic pricing
- [ ] Chatbot support
- [ ] No-show prediction
- [ ] Tournament & match recommendations
- [ ] Finding opponents feature
- [ ] Personalized alerts

## User Roles

### 1. **Player**
- Search futsals by location
- View available time slots
- Book slots (online/offline payment)
- Cancel bookings
- Write reviews & ratings
- View booking history
- Receive notifications

### 2. **Owner**
- Register futsal on platform
- Manage only their futsal
- Set pricing for slots
- Create & update time slots
- View booking requests
- Track payments
- View analytics
- Update futsal details

### 3. **Admin/SuperAdmin**
- Approve/reject futsal owners
- Monitor platform activity
- View all bookings
- Handle disputes
- Analytics across platform

## API Endpoints Structure

### Authentication
- POST `/api/auth/register/` - User registration
- POST `/api/auth/login/` - User login
- POST `/api/auth/logout/` - User logout
- POST `/api/auth/refresh-token/` - Refresh JWT token

### Users
- GET/PUT `/api/users/<id>/` - User profile
- GET `/api/users/me/` - Current user profile
- PUT `/api/users/me/password/` - Change password

### Futsals
- GET `/api/futsals/` - List futsals (with search/filter)
- POST `/api/futsals/` - Create futsal (owner only)
- GET `/api/futsals/<id>/` - Futsal details
- PUT `/api/futsals/<id>/` - Update futsal (owner only)
- DELETE `/api/futsals/<id>/` - Delete futsal (owner only)

### Time Slots
- GET `/api/slots/` - List available slots
- POST `/api/slots/` - Create slot (owner only)
- PUT `/api/slots/<id>/` - Update slot (owner only)
- DELETE `/api/slots/<id>/` - Delete slot (owner only)

### Bookings
- POST `/api/bookings/` - Create booking
- GET `/api/bookings/` - List user bookings
- GET `/api/bookings/<id>/` - Booking details
- PUT `/api/bookings/<id>/` - Update booking status
- POST `/api/bookings/<id>/cancel/` - Cancel booking

### Payments
- GET `/api/payments/` - List payments
- POST `/api/payments/` - Create payment
- GET `/api/payments/<id>/` - Payment details

### Reviews
- GET `/api/reviews/` - List reviews
- POST `/api/reviews/` - Create review
- PUT `/api/reviews/<id>/` - Update review
- DELETE `/api/reviews/<id>/` - Delete review

### Notifications
- GET `/api/notifications/` - List notifications
- POST `/api/notifications/<id>/mark-read/` - Mark as read
- DELETE `/api/notifications/<id>/` - Delete notification

### Admin
- GET `/api/admin/owners/pending/` - Pending owner approvals
- POST `/api/admin/owners/<id>/approve/` - Approve owner
- POST `/api/admin/owners/<id>/reject/` - Reject owner

## Database Relationships
See `DATABASE_SCHEMA.md` for complete 3NF schema

## Payment Methods Supported
- Credit/Debit Card
- Net Banking
- Cash (on-site)
- E-wallet

## Booking Status Workflow
- `confirmed` → `cancelled` OR `completed` OR `no_show`

## Futsal Approval Workflow
- `pending` → `approved` OR `rejected`

## Future Enhancements
- Email & SMS notifications
- Push notifications
- Real-time slot availability updates
- Advanced analytics
- Multi-language support
- Mobile app
- Operator Dashboard
- Queue management
