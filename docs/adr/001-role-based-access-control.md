# ADR 001: Role-Based Access Control

## Status

Accepted

## Context

Gyan Ghar Accountability App serves multiple user types with different responsibilities and access needs:

- **Students** need to submit their own daily accountability entries
- **Monitor Students** need to fill entries on behalf of other students
- **Poshak Leaders** need to view and oversee assigned students
- **Admins** need complete system access for user management

We needed a flexible yet simple authorization system that could handle these hierarchical relationships.

## Decision

We implemented a role-based access control (RBAC) system with the following structure:

### Roles

1. **admin** - Full system access
2. **poshak_leader** - View-only access to dashboards and student profiles
3. **student** - Self-service entry submission

### Additional Flags

- **is_monitor** - Boolean flag on students allowing them to fill entries for assigned students
- **is_approved** - Boolean flag requiring admin approval before login

### Assignment Tables

- **poshak_assignments** - Links students to poshak leaders
- **monitor_assignments** - Links monitor students to their assigned students

### Implementation

```javascript
// Middleware checks role and permissions
const authenticateToken = (req, res, next) => {
  // JWT verification
  // Role attached to req.user
};

// Route-level authorization
router.get("/admin-only", authenticateToken, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Access denied" });
  }
  // Handle request
});
```

## Consequences

### Positive

- Simple to understand and maintain
- Easy to add new roles if needed
- Flexible monitor system allows students to help each other
- Poshak leaders can oversee without modifying data

### Negative

- No fine-grained permissions (e.g., per-field access)
- Role changes require admin intervention
- Monitor assignments require manual setup

## Alternatives Considered

1. **Permission-based system** - Too complex for current needs
2. **Hierarchical inheritance** - Would complicate the simple role structure
3. **Group-based access** - Not needed given the clear role boundaries
