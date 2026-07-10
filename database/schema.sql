-- Database schema for LPC Meeting Room Booking System (SQLite)

-- 1. Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    department_name TEXT NOT NULL UNIQUE
);

-- 2. Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_name TEXT NOT NULL UNIQUE
);

-- 3. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    department_id INTEGER,
    role_id INTEGER NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    password_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'inactive'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- 4. Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_name TEXT NOT NULL UNIQUE,
    location TEXT NOT NULL,
    floor TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 0,
    equipment_summary TEXT,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'maintenance', 'inactive'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Room Features Table (Projector, Whiteboard, etc.)
CREATE TABLE IF NOT EXISTS room_features (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feature_name TEXT NOT NULL UNIQUE
);

-- 6. Room Feature Map Table
CREATE TABLE IF NOT EXISTS room_feature_map (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    feature_id INTEGER NOT NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (feature_id) REFERENCES room_features(id) ON DELETE CASCADE,
    UNIQUE(room_id, feature_id)
);

-- 7. Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    booker_name TEXT,
    booker_department TEXT,
    booker_phone TEXT,
    meeting_date TEXT NOT NULL, -- YYYY-MM-DD
    start_time TEXT NOT NULL, -- HH:MM
    end_time TEXT NOT NULL, -- HH:MM
    attendee_count INTEGER DEFAULT 0,
    agenda TEXT,
    approval_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    booking_status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'confirmed', 'cancelled', 'completed'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 8. Booking Attendees Table
CREATE TABLE IF NOT EXISTS booking_attendees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL,
    attendee_name TEXT NOT NULL,
    attendee_email TEXT NOT NULL,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- 9. Booking Approvals Table
CREATE TABLE IF NOT EXISTS booking_approvals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL,
    approver_id INTEGER NOT NULL,
    action TEXT NOT NULL, -- 'approved', 'rejected'
    action_note TEXT,
    action_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (approver_id) REFERENCES users(id)
);

-- 10. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    booking_id INTEGER,
    channel TEXT NOT NULL, -- 'email', 'line', 'in-app'
    message TEXT NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'unread', -- 'unread', 'read'
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
);

-- 11. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    module TEXT NOT NULL, -- 'auth', 'booking', 'room', etc.
    action TEXT NOT NULL, -- 'login', 'create', 'update', 'delete', 'approve', 'reject'
    reference_id TEXT,
    log_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(meeting_date);
CREATE INDEX IF NOT EXISTS idx_bookings_room_date ON bookings(room_id, meeting_date);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
