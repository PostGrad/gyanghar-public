const express = require("express");
const { body, validationResult } = require("express-validator");
const pool = require("../config/database");
const { logger } = require("../config/logger");
const { authenticateToken } = require("../middleware/auth");
const router = express.Router();

// Validation rules for profile details
const profileValidation = [
  // Family Details
  body("middleName").optional().trim().isLength({ max: 100 }).escape(),
  body("fatherFirstName").trim().isLength({ min: 1, max: 100 }).escape(),
  body("fatherMiddleName").optional().trim().isLength({ max: 100 }).escape(),
  body("fatherLastName").trim().isLength({ min: 1, max: 100 }).escape(),
  body("motherFirstName").trim().isLength({ min: 1, max: 100 }).escape(),
  body("motherMiddleName").optional().trim().isLength({ max: 100 }).escape(),
  body("motherLastName").trim().isLength({ min: 1, max: 100 }).escape(),
  body("fatherMobile").isMobilePhone("en-IN"),
  body("motherMobile").isMobilePhone("en-IN"),
  body("presentVillageCity").trim().isLength({ min: 1, max: 200 }).escape(),
  body("nativeVillageCity").trim().isLength({ min: 1, max: 200 }).escape(),
  body("completePresentAddress").trim().isLength({ min: 1, max: 1000 }),
  body("fatherOccupation").trim().isLength({ min: 1, max: 200 }).escape(),
  body("expenseBearer").isIn(["self", "mandir"]),
  
  // C/O Details
  body("coSantName").optional().trim().isLength({ max: 200 }).escape(),
  body("coHaribhaktFirstName").optional().trim().isLength({ max: 100 }).escape(),
  body("coHaribhaktMiddleName").optional().trim().isLength({ max: 100 }).escape(),
  body("coHaribhaktLastName").optional().trim().isLength({ max: 100 }).escape(),
  body("coHaribhaktMobile")
    .optional({ checkFalsy: true }) // Allow empty strings
    .isMobilePhone("en-IN"),
  body("sakshiSantName").optional().trim().isLength({ max: 200 }).escape(),
  
  // Other Details
  body("smkNumber")
    .optional()
    .custom((value) => {
      if (value === "NA" || value === "") return true;
      // Must be 3 letters followed by 3 digits
      if (!/^[A-Z]{3}[0-9]{3}$/.test(value)) {
        throw new Error("SMK number must be 3 uppercase letters followed by 3 digits (e.g., ABC123)");
      }
      return true;
    }),
  body("satsangDay").optional().isDate(),
  body("dateOfBirth").isDate(),
  body("aadharCardNumber").matches(/^[0-9]{12}$/),
  body("drivingLicense").isIn(["no", "MCWOG", "MCWG", "4_wheeler"]),
  body("drivingLicenseNumber")
    .optional()
    .custom((value, { req }) => {
      if (req.body.drivingLicense !== "no" && !value) {
        throw new Error("Driving license number is required when driving license type is selected");
      }
      return true;
    }),
  body("bloodGroup").isIn(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]),
  body("healthInsurance").isBoolean(),
];

// Get profile details for a user
router.get("/:userId", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user has permission
    if (req.user.id !== parseInt(userId) && req.user.role !== "admin" && !req.user.is_monitor) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const [profile] = await pool.execute(
      `SELECT * FROM user_profile_details WHERE user_id = ?`,
      [userId]
    );

    if (profile.length === 0) {
      return res.json({ profile: null });
    }

    logger.info("Profile details retrieved", {
      userId: userId,
      requestedBy: req.user.id,
    });

    res.json({ profile: profile[0] });
  } catch (error) {
    logger.error("Error fetching profile details", {
      error: error.message,
      userId: req.params.userId,
    });
    res.status(500).json({ error: "Failed to fetch profile details" });
  }
});

// Create or update profile details
router.post("/", authenticateToken, profileValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn("Profile validation failed", {
        errors: errors.array(),
        userId: req.user.id,
      });
      return res.status(400).json({ 
        error: "Validation failed", 
        details: errors.array() 
      });
    }

    const {
      middleName, fatherFirstName, fatherMiddleName, fatherLastName,
      motherFirstName, motherMiddleName, motherLastName,
      fatherMobile, motherMobile, presentVillageCity, nativeVillageCity,
      completePresentAddress, fatherOccupation, expenseBearer,
      coSantName, coHaribhaktFirstName, coHaribhaktMiddleName, coHaribhaktLastName,
      coHaribhaktMobile, sakshiSantName,
      smkNumber, satsangDay, dateOfBirth, aadharCardNumber,
      drivingLicense, drivingLicenseNumber, bloodGroup, healthInsurance
    } = req.body;

    const userId = req.user.id;

    // Check if profile already exists
    const [existing] = await pool.execute(
      "SELECT id FROM user_profile_details WHERE user_id = ?",
      [userId]
    );

    const smkValue = smkNumber === "NA" || smkNumber === "" ? null : smkNumber;

    if (existing.length > 0) {
      // Update existing profile
      await pool.execute(
        `UPDATE user_profile_details SET
          middle_name = ?, father_first_name = ?, father_middle_name = ?, father_last_name = ?,
          mother_first_name = ?, mother_middle_name = ?, mother_last_name = ?,
          father_mobile = ?, mother_mobile = ?, present_village_city = ?, native_village_city = ?,
          complete_present_address = ?, father_occupation = ?, expense_bearer = ?,
          co_sant_name = ?, co_haribhakt_first_name = ?, co_haribhakt_middle_name = ?, 
          co_haribhakt_last_name = ?, co_haribhakt_mobile = ?, sakshi_sant_name = ?,
          smk_number = ?, satsang_day = ?, date_of_birth = ?, aadhar_card_number = ?,
          driving_license = ?, driving_license_number = ?, blood_group = ?, health_insurance = ?
        WHERE user_id = ?`,
        [
          middleName || null, fatherFirstName, fatherMiddleName || null, fatherLastName,
          motherFirstName, motherMiddleName || null, motherLastName,
          fatherMobile, motherMobile, presentVillageCity, nativeVillageCity,
          completePresentAddress, fatherOccupation, expenseBearer,
          coSantName || null, coHaribhaktFirstName || null, coHaribhaktMiddleName || null,
          coHaribhaktLastName || null, coHaribhaktMobile || null, sakshiSantName || null,
          smkValue, satsangDay || null, dateOfBirth, aadharCardNumber,
          drivingLicense, drivingLicenseNumber || null, bloodGroup, healthInsurance,
          userId
        ]
      );

      logger.info("Profile details updated", { userId });
      res.json({ message: "Profile updated successfully" });
    } else {
      // Insert new profile
      await pool.execute(
        `INSERT INTO user_profile_details (
          user_id, middle_name, father_first_name, father_middle_name, father_last_name,
          mother_first_name, mother_middle_name, mother_last_name,
          father_mobile, mother_mobile, present_village_city, native_village_city,
          complete_present_address, father_occupation, expense_bearer,
          co_sant_name, co_haribhakt_first_name, co_haribhakt_middle_name, 
          co_haribhakt_last_name, co_haribhakt_mobile, sakshi_sant_name,
          smk_number, satsang_day, date_of_birth, aadhar_card_number,
          driving_license, driving_license_number, blood_group, health_insurance
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId, middleName || null, fatherFirstName, fatherMiddleName || null, fatherLastName,
          motherFirstName, motherMiddleName || null, motherLastName,
          fatherMobile, motherMobile, presentVillageCity, nativeVillageCity,
          completePresentAddress, fatherOccupation, expenseBearer,
          coSantName || null, coHaribhaktFirstName || null, coHaribhaktMiddleName || null,
          coHaribhaktLastName || null, coHaribhaktMobile || null, sakshiSantName || null,
          smkValue, satsangDay || null, dateOfBirth, aadharCardNumber,
          drivingLicense, drivingLicenseNumber || null, bloodGroup, healthInsurance
        ]
      );

      logger.info("Profile details created", { userId });
      res.status(201).json({ message: "Profile created successfully" });
    }
  } catch (error) {
    logger.error("Error saving profile details", {
      error: error.message,
      userId: req.user.id,
    });
    res.status(500).json({ error: "Failed to save profile details" });
  }
});

module.exports = router;

