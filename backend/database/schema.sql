-- Database schema for Gyan Ghar Accountability (MySQL)

-- Users table (unified for all roles)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    whatsapp VARCHAR(15) NOT NULL,
    room_number VARCHAR(10),
    role ENUM('admin', 'poshak_leader', 'student') NOT NULL DEFAULT 'student',
    is_monitor BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,
    user_settings JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Poshak assignments
CREATE TABLE poshak_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    poshak_id INT,
    assigned_student_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (poshak_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Monitor assignments
CREATE TABLE monitor_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    monitor_student_id INT,
    assigned_student_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (monitor_student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Accountability entries
CREATE TABLE accountability_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    entry_date DATE NOT NULL,
    wakeup_time TIME,
    mangala_aarti BOOLEAN DEFAULT FALSE,
    morning_katha ENUM('no', 'youtube', 'zoom') DEFAULT 'no',
    morning_puja_time TIME,
    vachanamrut_read BOOLEAN DEFAULT FALSE,
    mast_meditation BOOLEAN DEFAULT FALSE,
    cheshta BOOLEAN DEFAULT FALSE,
    mansi_puja_count INT DEFAULT 0 CHECK (mansi_puja_count >= 0 AND mansi_puja_count <= 5),
    reading_time TIME,
    wasted_time TIME,
    mantra_jap INT DEFAULT 0,
    notes VARCHAR(500),
    filled_by_user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (filled_by_user_id) REFERENCES users(id),
    UNIQUE KEY unique_user_date (user_id, entry_date)
);

-- Password reset tokens table
CREATE TABLE password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_expires (expires_at)
);

-- Create default admin user
INSERT INTO users (first_name, last_name, email, password_hash, phone, whatsapp, role, is_approved) 
VALUES ('Pranay', 'Patel', 'pranayshirishpatel@gmail.com', '$2a$12$8dJpWq9FKeP7djoXjU5ynOxDVbKwuvLJsQI3qPEAqlGyDbjY6itY6', '9909229693', '9909229693', 'admin', TRUE);