# ADR 005: Security Measures

## Status

Accepted

## Context

Gyan Ghar Accountability App handles sensitive personal data including:

- Contact information (phone, address)
- Daily spiritual practice records

We needed comprehensive security measures to protect this data.

## Decision

We implemented multiple layers of security:

### 1. Password Security

```javascript
// bcrypt with 12 rounds (industry standard)
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;
const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

// Password requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
```

### 2. Rate Limiting

```javascript
// General API rate limit
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
});

// Strict auth rate limit
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 attempts per window
});
```

### 3. Input Validation

```javascript
// express-validator on all inputs
body("email").isEmail().normalizeEmail(),
  body("phone").matches(/^\d{10}$/),
  body("notes").trim().isLength({ max: 500 }).escape();
```

### 4. Security Headers

```javascript
// Helmet.js middleware
app.use(helmet());

// Headers set:
// - X-Content-Type-Options: nosniff
// - X-Frame-Options: DENY
// - X-XSS-Protection: 1; mode=block
// - Strict-Transport-Security
```

### 5. SQL Injection Prevention

```javascript
// Parameterized queries only
const [users] = await pool.execute(
  "SELECT * FROM users WHERE email = ?",
  [email] // Never string concatenation
);
```

### 6. CORS Configuration

```javascript
const corsOptions = {
  origin:
    process.env.NODE_ENV === "production"
      ? ["https://your-domain.com"]
      : ["http://localhost:3000"],
  credentials: true,
};
```

### 7. Request Logging

```javascript
// Winston logger for security events
logger.warn("Failed login attempt", {
  email,
  ip: req.ip,
  userAgent: req.get("User-Agent"),
});
```

### 8. Payload Size Limits

```javascript
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ limit: "10kb" }));
```

## Consequences

### Positive

- Defense in depth approach
- Industry-standard security practices
- Audit trail for security events
- Protection against common attacks (XSS, CSRF, injection)

### Negative

- Rate limiting may affect legitimate users
- Security headers may break some integrations
- Logging increases storage requirements

## Compliance Notes

While not formally certified, the security measures align with:

- OWASP Top 10 mitigations
- GDPR data protection principles
- Industry best practices for Node.js applications
