# ADR 002: JWT-Based Authentication

## Status

Accepted

## Context

We needed a stateless authentication mechanism that:

- Works well with a React SPA frontend
- Doesn't require server-side session storage
- Can be validated without database calls on every request
- Supports token expiration and refresh

## Decision

We chose JSON Web Tokens (JWT) for authentication with the following configuration:

### Token Structure

```javascript
{
  id: user.id,
  email: user.email,
  role: user.role,
  firstName: user.first_name,
  lastName: user.last_name,
  is_monitor: user.is_monitor,
  iat: timestamp,
  exp: timestamp + 8hours
}
```

### Security Measures

1. **bcrypt hashing** - 12 rounds for password storage
2. **8-hour expiration** - Balance between security and UX
3. **Rate limiting** - 5 attempts per 15 minutes on auth endpoints
4. **Issuer validation** - Tokens include issuer claim

### Implementation

```javascript
// Token generation
const token = jwt.sign(payload, process.env.JWT_SECRET, {
  expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  issuer: 'gyan-ghar'
});

// Token verification middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};
```

### Client-Side Storage

Tokens are stored in `localStorage` and sent via `Authorization: Bearer <token>` header.

## Consequences

### Positive

- Stateless - no session storage needed
- Scalable - works across multiple server instances
- Contains user context - reduces database calls
- Standard format - well-supported by libraries

### Negative

- Cannot invalidate tokens server-side without blacklist
- Token size increases with payload
- localStorage vulnerable to XSS (mitigated by CSP)

## Alternatives Considered

1. **Session-based auth** - Requires session storage, complicates scaling
2. **OAuth 2.0** - Overkill for internal app with single auth provider
3. **Cookie-based JWT** - Better XSS protection but CSRF concerns

