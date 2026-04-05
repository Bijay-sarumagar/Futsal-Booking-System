# FutsalHub - Database Schema (3NF)

## Normalized Database Structure

### 1. **User Table**
```sql
User (
  user_id INT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password VARCHAR(255) NOT NULL,
  role ENUM('player', 'owner', 'admin') NOT NULL,
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
```

### 2. **Futsal Table**
```sql
Futsal (
  futsal_id INT PRIMARY KEY AUTO_INCREMENT,
  owner_id INT NOT NULL,
  futsal_name VARCHAR(255) NOT NULL,
  location VARCHAR(500) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  description TEXT,
  approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES User(user_id) ON DELETE CASCADE
)
```

### 3. **TimeSlot Table**
```sql
TimeSlot (
  slot_id INT PRIMARY KEY AUTO_INCREMENT,
  futsal_id INT NOT NULL,
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  availability_status ENUM('available', 'booked', 'maintenance') DEFAULT 'available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (futsal_id) REFERENCES Futsal(futsal_id) ON DELETE CASCADE,
  UNIQUE KEY unique_slot (futsal_id, slot_date, start_time)
)
```

### 4. **Booking Table**
```sql
Booking (
  booking_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  slot_id INT NOT NULL,
  booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  booking_status ENUM('confirmed', 'cancelled', 'completed', 'no_show') DEFAULT 'confirmed',
  payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE CASCADE,
  FOREIGN KEY (slot_id) REFERENCES TimeSlot(slot_id) ON DELETE CASCADE
)
```

### 5. **Payment Table**
```sql
Payment (
  payment_id INT PRIMARY KEY AUTO_INCREMENT,
  booking_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method ENUM('credit_card', 'debit_card', 'net_banking', 'cash', 'e_wallet') NOT NULL,
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  transaction_id VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES Booking(booking_id) ON DELETE CASCADE
)
```

### 6. **Review Table**
```sql
Review (
  review_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  futsal_id INT NOT NULL,
  booking_id INT,
  rating INT CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT,
  review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE CASCADE,
  FOREIGN KEY (futsal_id) REFERENCES Futsal(futsal_id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES Booking(booking_id) ON DELETE SET NULL,
  UNIQUE KEY unique_review (user_id, futsal_id)
)
```

### 7. **Notification Table**
```sql
Notification (
  notification_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  message VARCHAR(500) NOT NULL,
  notification_type ENUM('booking', 'payment', 'alert', 'review', 'system') NOT NULL,
  related_booking_id INT,
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE CASCADE,
  FOREIGN KEY (related_booking_id) REFERENCES Booking(booking_id) ON DELETE SET NULL
)
```

## Relationships Summary
- **User → Futsal**: One-to-Many (owner has multiple futsals)
- **Futsal → TimeSlot**: One-to-Many (futsal has multiple slots)
- **User → Booking**: One-to-Many (player makes multiple bookings)
- **TimeSlot → Booking**: One-to-Many (slot has multiple bookings)
- **Booking → Payment**: One-to-One (one booking has one payment record)
- **User → Review**: One-to-Many (player leaves multiple reviews)
- **Futsal → Review**: One-to-Many (futsal receives multiple reviews)
- **User → Notification**: One-to-Many (user receives multiple notifications)
