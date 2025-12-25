# ADR 004: Soft Delete Pattern for Users

## Status

Accepted

## Context

When students leave the hostel or are temporarily inactive:

- Their historical data should be preserved for reporting
- They shouldn't appear in daily dashboards
- They might return and need reactivation
- Accidental deletions should be recoverable

## Decision

We implemented a soft delete pattern using an `is_active` boolean flag.

### Schema Addition

```sql
ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
```

### Query Modifications

```javascript
// Default behavior - hide inactive students
const [students] = await pool.execute(
  'SELECT * FROM users WHERE role = ? AND is_active = TRUE',
  ['student']
);

// Admin toggle - show all students
const [allStudents] = await pool.execute(
  'SELECT * FROM users WHERE role = ?',
  ['student']
);
```

### UI Implementation

- Global toggle in User Management page
- Toggle affects all pages (Dashboard, Student Profiles, Reports)
- Inactive students highlighted with red background
- State persisted in React context

### API Endpoints

```javascript
// Toggle active status
PUT /api/users/:id/toggle-active

// Permanent delete (separate from deactivation)
DELETE /api/users/:id
```

## Consequences

### Positive

- Data preservation for historical analysis
- Easy reactivation of returning students
- Protection against accidental deletions
- Audit trail maintained

### Negative

- Queries must filter by `is_active`
- Storage not reclaimed until hard delete
- UI complexity for showing/hiding inactive users

## Alternatives Considered

1. **Archive table** - More complex, harder to reactivate
2. **Hard delete only** - Data loss, no recovery
3. **Deleted_at timestamp** - Similar outcome, chose simpler boolean

