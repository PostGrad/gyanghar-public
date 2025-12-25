# Database Schema

Gyan Ghar uses MySQL as its primary database. The schema is designed to support role-based access control, daily accountability tracking, and hierarchical user management.

---

## Entity Relationship

```
┌─────────────┐     ┌───────────────────┐     ┌────────────────────┐
│   Users     │────<│ Poshak Assignments │>────│      Users         │
│  (All Roles)│     │                   │     │  (Poshak Leaders)  │
└─────────────┘     └───────────────────┘     └────────────────────┘
      │
      │             ┌───────────────────┐
      ├────────────<│Monitor Assignments│
      │             └───────────────────┘
      │
      │             ┌───────────────────────┐
      └────────────<│ Accountability Entries│
                    └───────────────────────┘
```

---

## Tables

### `users`

Unified table for all user roles (admin, poshak_leader, student).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique identifier |
| `first_name` | VARCHAR(100) | NOT NULL | User's first name |
| `last_name` | VARCHAR(100) | NOT NULL | User's last name |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Login email |
| `password_hash` | VARCHAR(255) | NOT NULL | bcrypt hashed password (12 rounds) |
| `phone` | VARCHAR(15) | NOT NULL | Mobile number |
| `whatsapp` | VARCHAR(15) | NOT NULL | WhatsApp number |
| `room_number` | VARCHAR(10) | NULLABLE | Hostel room number (students only) |
| `role` | ENUM | NOT NULL, DEFAULT 'student' | 'admin', 'poshak_leader', 'student' |
| `is_monitor` | BOOLEAN | DEFAULT FALSE | Whether student is a monitor |
| `is_approved` | BOOLEAN | DEFAULT FALSE | Admin approval status |
| `is_active` | BOOLEAN | DEFAULT TRUE | Soft delete flag |
| `user_settings` | JSON | NULLABLE | Dashboard preferences |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Registration timestamp |

**Indexes:**
- `UNIQUE (email)` - Fast email lookup for authentication

---

### `student_profiles`

Extended profile information for students.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique identifier |
| `user_id` | INT | FOREIGN KEY → users(id) | Reference to user |
| `father_first_name` | VARCHAR(100) | | Father's first name |
| `father_middle_name` | VARCHAR(100) | | Father's middle name |
| `father_last_name` | VARCHAR(100) | | Father's last name |
| `mother_first_name` | VARCHAR(100) | | Mother's first name |
| `mother_middle_name` | VARCHAR(100) | | Mother's middle name |
| `mother_last_name` | VARCHAR(100) | | Mother's last name |
| `father_mobile` | VARCHAR(15) | | Father's mobile number |
| `mother_mobile` | VARCHAR(15) | | Mother's mobile number |
| `present_village_city` | VARCHAR(255) | | Current location |
| `native_village_city` | VARCHAR(255) | | Native place |
| `complete_present_address` | TEXT | | Full address |
| `father_occupation` | VARCHAR(255) | | Father's occupation |
| `expense_bearer` | ENUM | DEFAULT 'self' | 'self' or 'mandir' |
| `co_sant_name` | VARCHAR(255) | | C/O Sant name |
| `co_haribhakt_first_name` | VARCHAR(100) | | C/O Haribhakt details |
| `co_haribhakt_middle_name` | VARCHAR(100) | | |
| `co_haribhakt_last_name` | VARCHAR(100) | | |
| `co_haribhakt_mobile` | VARCHAR(15) | | |
| `sakshi_sant_name` | VARCHAR(255) | | Witness Sant name |
| `smk_number` | VARCHAR(10) | | SMK identifier |
| `satsang_day` | DATE | | Satsang joining date |
| `date_of_birth` | DATE | | Student's DOB |
| `aadhar_card_number` | VARCHAR(12) | | Aadhar card number |
| `driving_license` | ENUM | DEFAULT 'no' | 'no', 'MCWOG', 'MCWG', '4_wheeler' |
| `driving_license_number` | VARCHAR(50) | | License number |
| `blood_group` | ENUM | | Blood group |
| `health_insurance` | BOOLEAN | DEFAULT FALSE | Has health insurance |

---

### `poshak_assignments`

Maps students to their Poshak Leaders (guardians).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique identifier |
| `poshak_id` | INT | FOREIGN KEY → users(id) ON DELETE CASCADE | Poshak leader |
| `assigned_student_id` | INT | FOREIGN KEY → users(id) ON DELETE CASCADE | Assigned student |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Assignment timestamp |

**Indexes:**
- Composite index on `(poshak_id, assigned_student_id)`

---

### `monitor_assignments`

Maps monitor students to their assigned students.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique identifier |
| `monitor_student_id` | INT | FOREIGN KEY → users(id) ON DELETE CASCADE | Monitor student |
| `assigned_student_id` | INT | FOREIGN KEY → users(id) ON DELETE CASCADE | Assigned student |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Assignment timestamp |

**Indexes:**
- Composite index on `(monitor_student_id, assigned_student_id)`

---

### `accountability_entries`

Daily spiritual practice entries submitted by students.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique identifier |
| `user_id` | INT | FOREIGN KEY → users(id) ON DELETE CASCADE | Student who owns entry |
| `entry_date` | DATE | NOT NULL | Date of entry |
| `wakeup_time` | TIME | NULLABLE | Wake up time |
| `mangala_aarti` | BOOLEAN | DEFAULT FALSE | Attended Mangala Aarti |
| `morning_katha` | ENUM | DEFAULT 'no' | 'no', 'youtube', 'zoom' |
| `morning_puja_time` | TIME | NULLABLE | Duration of morning puja |
| `meditation_watch_time` | INT | NULLABLE | Minutes of meditation |
| `vachanamrut_read` | BOOLEAN | DEFAULT FALSE | Read Vachanamrut |
| `mast_meditation` | BOOLEAN | DEFAULT FALSE | Watched meditation video |
| `cheshta` | BOOLEAN | DEFAULT FALSE | Watched Cheshta video |
| `mansi_puja_count` | INT | DEFAULT 0, CHECK (0-5) | Mansi Puja count |
| `reading_time` | TIME | NULLABLE | Total reading duration |
| `wasted_time` | TIME | NULLABLE | Time wasted on social media |
| `mantra_jap` | INT | DEFAULT 0 | Mantra count |
| `notes` | VARCHAR(500) | NULLABLE | Additional notes |
| `filled_by_user_id` | INT | FOREIGN KEY → users(id) | Who filled the entry |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Entry creation time |
| `updated_at` | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | Last update time |

**Constraints:**
- `UNIQUE (user_id, entry_date)` - One entry per student per day

---

### `password_reset_tokens`

Stores password reset tokens with expiry.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique identifier |
| `user_id` | INT | FOREIGN KEY → users(id) ON DELETE CASCADE | User requesting reset |
| `token` | VARCHAR(255) | UNIQUE, NOT NULL | Reset token |
| `expires_at` | TIMESTAMP | NOT NULL | Token expiry time |
| `used` | BOOLEAN | DEFAULT FALSE | Whether token was used |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Token creation time |

**Indexes:**
- `INDEX idx_token (token)` - Fast token lookup
- `INDEX idx_expires (expires_at)` - Cleanup of expired tokens

---

## Data Integrity

### Foreign Key Relationships

All foreign keys use `ON DELETE CASCADE` to ensure referential integrity:

- Deleting a user removes their assignments, entries, and profile
- Deleting a poshak leader removes their student assignments
- Deleting a monitor removes their student assignments

### Soft Delete Pattern

The `is_active` flag in the users table implements soft delete:

- Active students (`is_active = TRUE`) appear in dashboards
- Inactive students are hidden by default
- Admin can toggle visibility of inactive students
- Data is preserved for historical reporting

---

## Query Patterns

### Daily Dashboard Query

```sql
SELECT ae.*, u.first_name, u.last_name, u.room_number,
       p.first_name as poshak_first_name, p.last_name as poshak_last_name
FROM accountability_entries ae
JOIN users u ON ae.user_id = u.id
LEFT JOIN poshak_assignments pa ON u.id = pa.assigned_student_id
LEFT JOIN users p ON pa.poshak_id = p.id
WHERE ae.entry_date = ? AND u.is_active = TRUE
ORDER BY u.first_name;
```

### Student Report Query

```sql
SELECT ae.*
FROM accountability_entries ae
WHERE ae.user_id = ? 
  AND ae.entry_date BETWEEN ? AND ?
ORDER BY ae.entry_date DESC;
```

### Missing Entries Query

```sql
SELECT u.id, u.first_name, u.last_name
FROM users u
WHERE u.role = 'student' 
  AND u.is_approved = TRUE 
  AND u.is_active = TRUE
  AND u.id NOT IN (
    SELECT user_id FROM accountability_entries WHERE entry_date = ?
  );
```

