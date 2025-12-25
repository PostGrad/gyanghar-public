-- Migration: Add user profile details table
-- This table stores extended profile information for students only
-- Admin and poshak leaders do not need to fill these details

CREATE TABLE user_profile_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    
    -- Family Details
    middle_name VARCHAR(100),
    father_first_name VARCHAR(100) NOT NULL,
    father_middle_name VARCHAR(100),
    father_last_name VARCHAR(100) NOT NULL,
    mother_first_name VARCHAR(100) NOT NULL,
    mother_middle_name VARCHAR(100),
    mother_last_name VARCHAR(100) NOT NULL,
    father_mobile VARCHAR(15) NOT NULL,
    mother_mobile VARCHAR(15) NOT NULL,
    present_village_city VARCHAR(200) NOT NULL,
    native_village_city VARCHAR(200) NOT NULL,
    complete_present_address TEXT NOT NULL,
    father_occupation VARCHAR(200) NOT NULL,
    expense_bearer ENUM('self', 'mandir') NOT NULL,
    
    -- C/O Details
    co_sant_name VARCHAR(200),
    co_haribhakt_first_name VARCHAR(100),
    co_haribhakt_middle_name VARCHAR(100),
    co_haribhakt_last_name VARCHAR(100),
    co_haribhakt_mobile VARCHAR(15),
    sakshi_sant_name VARCHAR(200),
    
    -- Other Details
    smk_number VARCHAR(6), -- Format: ABC123 (3 letters + 3 digits)
    satsang_day DATE,
    date_of_birth DATE NOT NULL,
    aadhar_card_number VARCHAR(12) NOT NULL,
    driving_license ENUM('no', 'MCWOG', 'MCWG', '4_wheeler') NOT NULL DEFAULT 'no',
    driving_license_number VARCHAR(50),
    blood_group ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
    health_insurance BOOLEAN NOT NULL DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_smk_number (smk_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

