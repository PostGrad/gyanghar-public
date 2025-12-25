-- Quick verification queries after migration

-- 1. Check if table was created successfully
SHOW TABLES LIKE 'user_profile_details';

-- 2. Check table structure
DESCRIBE user_profile_details;

-- 3. Check if there are any profile details (should be empty initially)
SELECT COUNT(*) as total_profiles FROM user_profile_details;

-- 4. After a student fills their profile, view the data
SELECT 
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    upd.father_first_name,
    upd.mother_first_name,
    upd.date_of_birth,
    upd.blood_group,
    upd.created_at
FROM users u
LEFT JOIN user_profile_details upd ON u.id = upd.user_id
WHERE u.role = 'student'
ORDER BY u.created_at DESC;

-- 5. Find students who haven't filled their profile details yet
SELECT 
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    u.created_at
FROM users u
LEFT JOIN user_profile_details upd ON u.id = upd.user_id
WHERE u.role = 'student' 
  AND u.is_approved = TRUE
  AND upd.id IS NULL
ORDER BY u.created_at DESC;

