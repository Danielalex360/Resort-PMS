# Role-Based Access Control (RBAC) Documentation

## Overview

The Resort Dynamic Pricing System implements a comprehensive 4-tier role-based access control system to manage user permissions across all modules.

---

## 4 User Roles

### 1. Admin (Administrator)
**Icon:** Shield
**Color:** Purple
**Access Level:** Full System Access

#### Permissions:
- **Full CRUD** (Create, Read, Update, Delete) on ALL modules
- Can manage user accounts and assign roles
- Can configure pricing, packages, and system settings
- Complete financial and operational access

#### Use Case:
- Resort owners
- System administrators
- C-level executives

---

### 2. Manager
**Icon:** Briefcase
**Color:** Blue
**Access Level:** Full Operations Access (Except User Management)

#### Permissions:
- **Full CRUD** on all operational modules
- **Read Only** on User Management (can see users but cannot modify)
- Can configure pricing, packages, seasons, promos
- Can manage bookings, guests, expenses
- Can view and manage notifications

#### Restrictions:
- Cannot add/remove users
- Cannot change user roles

#### Use Case:
- Resort managers
- Operations managers
- Department heads

---

### 3. Accounts
**Icon:** Dollar Sign
**Color:** Emerald Green
**Access Level:** Financial & Reporting

#### Permissions:
- **Full CRUD** on Expenses module
- **Read Only** on:
  - Dashboard (analytics)
  - Overhead
  - Cost & Price (view pricing)
  - Seasons
  - Rates Calendar
  - Promos & Surcharges
  - Package Config
  - Packages (pricing matrix)
  - Bookings (for auditing)
  - Guests
  - Notifications
- **No Access** to:
  - User Management

#### Use Case:
- Accountants
- Financial controllers
- Bookkeepers
- Auditors

---

### 4. Front Desk
**Icon:** User Circle
**Color:** Orange
**Access Level:** Guest Operations

#### Permissions:
- **Full CRUD** on:
  - Bookings (create/edit bookings, but cannot hard delete - only cancel)
  - Guests (add/update guest information)
- **Create/Update** on:
  - Notifications (log WhatsApp/call notes)
- **Read Only** on:
  - Dashboard
  - Cost & Price (view prices for booking)
  - Rates Calendar (check daily rates)
  - Packages (view package prices)
- **No Access** to:
  - Overhead
  - Expenses
  - Seasons
  - Promos & Surcharges
  - Package Setup
  - User Management

#### Use Case:
- Front desk staff
- Reservation agents
- Guest relations

---

## Permission Matrix

| Module | Admin | Manager | Accounts | Front Desk |
|--------|-------|---------|----------|------------|
| **Dashboard** | R | R | R | R |
| **Overhead** | CRUD | CRUD | R | - |
| **Expenses** | CRUD | CRUD | CRUD | - |
| **Cost & Price** | CRUD | CRUD | R | R |
| **Seasons** | CRUD | CRUD | R | - |
| **Rates Calendar** | R | R | R | R |
| **Promos & Surcharges** | CRUD | CRUD | R | - |
| **Package Setup** | CRUD | CRUD | R | - |
| **Packages** | R | R | R | R |
| **Bookings** | CRUD | CRUD | R | CRU* |
| **Guests** | CRUD | CRUD | R | CRU |
| **Notifications** | CRUD | CRUD | R | CRU |
| **User Management** | CRUD | R | - | - |

**Legend:**
- `C` = Create
- `R` = Read
- `U` = Update
- `D` = Delete
- `-` = No Access
- `*` = Special: Front Desk can create/update bookings but not delete (only cancel)

---

## Technical Implementation

### Database Schema

```sql
-- user_roles table
CREATE TABLE user_roles (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  resort_id text NOT NULL,
  role text CHECK (role IN ('admin', 'manager', 'accounts', 'frontdesk')),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, resort_id)
);
```

### Helper Functions

```sql
-- Check if user has specific role(s)
user_has_role(user_id, resort_id, allowed_roles[])

-- Get user's role for a resort
get_user_role(user_id, resort_id)

-- Check if user can manage users (admin only)
can_manage_users(user_id, resort_id)

-- Check if user can modify setup (admin, manager)
can_modify_setup(user_id, resort_id)

-- Check if user can manage expenses (admin, manager, accounts)
can_manage_expenses(user_id, resort_id)

-- Check if user can manage bookings (admin, manager, frontdesk)
can_manage_bookings(user_id, resort_id)
```

### Frontend Implementation

#### 1. Permissions Utility (`src/utils/permissions.ts`)
```typescript
// Check if user has specific permission
hasPermission(role, module, permission)

// Check if user can access module
canAccessModule(role, module)

// Convenience functions
canRead(role, module)
canCreate(role, module)
canUpdate(role, module)
canDelete(role, module)
canModify(role, module)
```

#### 2. Permissions Hook (`src/hooks/usePermissions.ts`)
```typescript
const permissions = usePermissions(resortId);

// Usage
permissions.canAccess('bookings')
permissions.canCreate('expenses')
permissions.canDelete('promos')
permissions.isAdmin
permissions.isFrontdesk
```

#### 3. Permission Gate Component (`src/components/PermissionGate.tsx`)
```typescript
// Wrap entire pages
<PermissionGate resortId={resortId} module="expenses">
  <ExpensesPage resortId={resortId} />
</PermissionGate>

// Conditional rendering for actions
<ReadOnlyWrapper resortId={resortId} module="bookings">
  {(canModify, canDelete) => (
    <>
      {canModify && <button>Edit</button>}
      {canDelete && <button>Delete</button>}
    </>
  )}
</ReadOnlyWrapper>
```

---

## Navigation Filtering

The navigation menu automatically filters based on user permissions:

```typescript
// In ResortApp.tsx
const permissions = usePermissions(selectedResort?.id);
const menuItems = allMenuItems.filter((item) =>
  permissions.canAccess(item.module)
);
```

Users only see menu items they have access to.

---

## Row Level Security (RLS)

All database tables have RLS policies that enforce permissions at the database level:

- **Admin**: Full access to resort data
- **Manager**: Full access except user_roles table modifications
- **Accounts**: Can read all, write only to expenses
- **Frontdesk**: Can read/write bookings and guests only

---

## User Management

### Adding Users

1. Only **Admin** can add users
2. User must be registered in the system first
3. Admin assigns role per resort
4. One user can have different roles in different resorts

### Changing Roles

1. Only **Admin** can change roles
2. Users cannot change their own role (self-protection)
3. Users cannot remove themselves

### Role Assignment Flow

```
1. User registers in system (creates auth.users record)
2. Admin searches by email
3. Admin assigns role for specific resort
4. User gains access to resort with assigned permissions
5. User can have different roles in different resorts
```

---

## Security Features

### 1. Multi-Layer Security
- **Frontend**: UI elements hidden/disabled based on permissions
- **Database**: RLS policies enforce permissions at data layer
- **Business Logic**: Functions check permissions before operations

### 2. Principle of Least Privilege
- Users only see and access what they need
- No access to sensitive operations by default
- Explicit permission grants only

### 3. Audit Trail
- `created_by` field tracks who created user roles
- `updated_at` timestamp tracks role changes
- All modifications logged at database level

### 4. Self-Protection
- Users cannot modify their own roles
- Users cannot remove themselves
- Prevents accidental lockouts

---

## Common Use Cases

### Use Case 1: Resort Owner
**Role:** Admin

- Full control of system
- Manages all staff accounts
- Sets pricing and configurations
- Reviews all reports and analytics

### Use Case 2: Resort Manager
**Role:** Manager

- Manages daily operations
- Updates prices and packages
- Handles bookings and guests
- Cannot modify user accounts

### Use Case 3: Accountant
**Role:** Accounts

- Enters expenses and bills
- Views financial reports
- Audits bookings and revenue
- Cannot modify bookings or prices

### Use Case 4: Reception Staff
**Role:** Front Desk

- Creates and updates bookings
- Manages guest information
- Checks rates and availability
- Cannot access financial or setup modules

---

## Best Practices

### For Admins:
1. Assign minimal necessary permissions
2. Use Manager role for trusted staff instead of Admin
3. Regularly review user access
4. Remove users who leave the organization

### For Developers:
1. Always check permissions before showing UI elements
2. Use PermissionGate for page-level protection
3. Check `canModify` and `canDelete` for individual actions
4. Test with all 4 roles before deployment

### For Users:
1. Only request roles you need
2. Report suspicious access attempts
3. Don't share login credentials
4. Log out when done

---

## Migration Path

### From Old System (Admin/Account only):
1. Existing `admin` roles remain unchanged
2. Existing `account` roles renamed to `accounts` (auto-handled)
3. New users can be assigned `manager` or `frontdesk` roles
4. No data migration needed - backwards compatible

---

## Troubleshooting

### User cannot access module:
1. Check user's role assignment in User Management
2. Verify user has role for correct resort
3. Check if user logged out and back in

### Permission denied errors:
1. Verify RLS policies are enabled
2. Check user_roles table for user record
3. Ensure resort_id matches

### Cannot see menu items:
1. Check permissions hook is loading correctly
2. Verify user has role assigned
3. Check browser console for errors

---

## Future Enhancements

Potential additions to the RBAC system:

1. **Custom Roles**: Allow admins to create custom roles
2. **Module-Level Permissions**: Granular permissions per feature
3. **Time-Based Access**: Temporary access grants
4. **Permission Groups**: Group permissions for easier management
5. **Audit Logs**: Detailed logging of all permission checks
6. **Multi-Resort Roles**: Assign one role across all resorts

---

## Summary

The RBAC system provides:
- ✅ 4 clearly defined roles
- ✅ Module-level permission control
- ✅ Database-enforced security
- ✅ Easy-to-use permissions API
- ✅ Self-protection mechanisms
- ✅ Backwards compatibility
- ✅ Scalable architecture

This ensures secure, appropriate access for all users while maintaining system integrity and data security.
