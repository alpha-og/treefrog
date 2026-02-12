# Phase 6.4: SaaS Dashboard Pages

## Goal

Create UI for build history, subscriptions, and account management.

---

## New Pages

| Page | Purpose |
|------|---------|
| `/dashboard` | Build history + overview |
| `/build/{id}` | Build details & logs |
| `/billing` | Subscription management |
| `/account` | User settings |

---

## Key Files

```
✅ frontend/src/pages/Dashboard.tsx
✅ frontend/src/pages/Build.tsx
✅ frontend/src/pages/Billing.tsx
✅ frontend/src/pages/Account.tsx
✅ frontend/src/components/BuildHistoryTable.tsx
✅ frontend/src/components/StorageUsageWidget.tsx
✅ frontend/src/components/SubscriptionStatusCard.tsx
✅ frontend/src/components/PlanComparisonTable.tsx
✅ frontend/src/components/RazorpayCheckout.tsx
✅ frontend/src/components/UserMenu.tsx
📝 frontend/src/router.tsx (Add routes)
📝 frontend/src/pages/Settings.tsx (Add tabs)
```

---

## Dashboard Page

**File**: `frontend/src/pages/Dashboard.tsx`

Displays:
- Build history (past 30 days)
- Storage usage progress
- Current subscription status
- Quick actions

**Components**:
- BuildHistoryTable: Paginated table with sorting/filtering
- StorageUsageWidget: Visual progress bar
- SubscriptionStatusCard: Current plan info

---

## Build Details Page

**File**: `frontend/src/pages/Build.tsx`

Displays:
- Build metadata (ID, status, engine, time)
- Compilation logs (monospace, colorized)
- Download buttons for artifacts

**Data**:
- GET /api/builds/{buildId}

---

## Billing Page

**File**: `frontend/src/pages/Billing.tsx`

Displays:
- Plan comparison table
- Current subscription
- Upgrade buttons
- Coupon input

**Data**:
- GET /api/subscriptions/plans
- GET /api/user/subscription

---

## Account Settings Page

**File**: `frontend/src/pages/Account.tsx`

Displays:
- User profile info
- Storage usage
- API token
- Logout button

**Data**:
- GET /api/user/stats

---

## Navigation Updates

Add user menu to Toolbar:
```tsx
<DropdownMenu>
  <Avatar>{user.email}</Avatar>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={() => navigate('/dashboard')}>
      Build History
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => navigate('/billing')}>
      Billing
    </DropdownMenuItem>
    <DropdownMenuItem onClick={logout}>
      Logout
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

## Next Step

→ Continue to [06-artifacts.md](06-artifacts.md) (Phase 6.5: Signed URLs & Download)
