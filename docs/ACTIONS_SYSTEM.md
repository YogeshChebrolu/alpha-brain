# Actions System Documentation

## Overview

Actions are now properly stored in the dedicated `actions` table instead of just being saved as JSON in the idea's `content_json` field. This enables better management, querying, filtering, and future enhancements like notifications and due date reminders.

---

## Database Structure

### Actions Table
```sql
CREATE TABLE actions (
    id UUID PRIMARY KEY,
    idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    due_time TIMESTAMPTZ,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT status_check CHECK (status IN ('pending', 'inprogress', 'done', 'skipped'))
);
```

### Key Features
- **Linked to Ideas**: Each action belongs to an idea via `idea_id`
- **Status Tracking**: pending → inprogress → done/skipped
- **Due Dates**: Optional `due_time` for deadlines
- **Cascade Delete**: Actions are automatically deleted when their parent idea is deleted

---

## How It Works

### 1. Creating Ideas with Actions

When you create a new idea with actions:

```typescript
// User fills out form with actions
const formValues = {
  title: 'My Investment Thesis',
  explanation: '...',
  actions: [
    { text: 'Research competitor financials', status: 'pending', due_time: '2026-05-01' },
    { text: 'Analyze market trends', status: 'pending' }
  ]
};

// System extracts actions and syncs to database
await syncActionsToIdea(ideaId, formValues.actions);
```

**Flow:**
1. User adds actions in the ActionsElement form field
2. Actions are temporarily stored in form state
3. When idea is saved, `syncActionsToIdea()` creates records in `actions` table
4. Actions are linked to the idea via `idea_id`

### 2. Viewing Ideas with Actions

When you view an idea:

```typescript
// System fetches actions from database
const actions = await getIdeaActions(ideaId);

// Actions are merged into content_json for display
const ideaWithActions = {
  ...idea,
  content_json: {
    ...idea.content_json,
    actions, // Loaded from database, not JSON
  }
};
```

**Flow:**
1. Idea is loaded from `ideas` table
2. Actions are fetched from `actions` table using `idea_id`
3. Actions are merged into form data for display
4. ActionsElement renders the actions in view mode

### 3. Updating Ideas and Actions

When you edit an idea:

```typescript
// User modifies actions (add, edit, delete)
const updatedActions = [
  { id: 'existing-id', text: 'Updated text', status: 'done' },
  { text: 'New action', status: 'pending' }
];

// System syncs changes to database
await syncActionsToIdea(ideaId, updatedActions);
```

**Sync Logic:**
- **Existing actions with ID**: Updated in database
- **New actions without ID**: Inserted into database
- **Missing actions**: Deleted from database
- Maintains consistency between form state and database

---

## Helper Functions

### `syncActionsToIdea(ideaId, actions)`
Syncs form actions to the database table.

**Parameters:**
- `ideaId`: UUID of the parent idea
- `actions`: Array of action objects from form

**Behavior:**
- Creates new actions (no ID)
- Updates existing actions (has ID)
- Deletes removed actions (not in array)

**Example:**
```typescript
await syncActionsToIdea('idea-uuid', [
  { id: 'action-1', text: 'Review quarterly report', status: 'inprogress' },
  { text: 'Schedule meeting', status: 'pending', due_time: '2026-05-15' }
]);
```

### `getIdeaActions(ideaId)`
Fetches all actions for an idea from the database.

**Returns:** Array of action objects with `id`, `text`, `status`, `due_time`

**Example:**
```typescript
const actions = await getIdeaActions('idea-uuid');
// [
//   { id: '...', text: 'Research', status: 'pending', due_time: '...' },
//   { id: '...', text: 'Analysis', status: 'done' }
// ]
```

### `updateActionStatus(actionId, status)`
Updates the status of a single action.

**Example:**
```typescript
await updateActionStatus('action-uuid', 'done');
```

### `deleteAction(actionId)`
Deletes a single action from the database.

**Example:**
```typescript
await deleteAction('action-uuid');
```

---

## Dashboard Integration

The dashboard displays pending actions from across all ideas:

```typescript
// In app/(dashboard)/page.tsx
const { data: actions } = await supabase
  .from('actions')
  .select('*, ideas(title)')
  .eq('status', 'pending')
  .order('due_time', { ascending: true })
  .limit(5);
```

**ActionSidebar Component** displays:
- Action text
- Parent idea title (linked)
- Due date (if set)
- Status indicator

---

## Benefits of Database Storage

### 1. **Queryable**
```sql
-- Find all overdue actions
SELECT * FROM actions
WHERE due_time < NOW() AND status = 'pending';

-- Get action count by status
SELECT status, COUNT(*) FROM actions GROUP BY status;
```

### 2. **Relational**
- Link actions to ideas
- Future: Link actions to resources, categories, tags
- Enable action-specific comments/updates via `action_updates` table

### 3. **Scalable**
- Independent CRUD operations
- Efficient filtering and sorting
- Support for pagination

### 4. **Future Features**
- Email reminders for due actions
- Action analytics and insights
- Recurring actions
- Action templates
- Collaboration (assign actions to team members)
- Action history and audit log

---

## File Locations

### Helper Functions
- `lib/helpers/actions.ts` - All action database operations

### Components
- `components/form-elements/ActionsElement.tsx` - Form field for actions
- `components/layout/ActionSidebar.tsx` - Dashboard sidebar display

### Pages
- `app/(dashboard)/ideas/new/page.tsx` - Create ideas with actions
- `app/(dashboard)/ideas/[id]/page.tsx` - View/edit ideas with actions
- `app/(dashboard)/page.tsx` - Dashboard with actions overview

---

## Migration from JSON Storage

**Before:** Actions stored as JSON in `ideas.content_json.actions`

**After:** Actions stored in dedicated `actions` table

**Backwards Compatibility:**
The system still stores actions in `content_json` for backwards compatibility, but the source of truth is now the `actions` table.

**Migration Path:**
If you have existing ideas with actions in JSON:
1. Run a migration script to extract actions from `content_json`
2. Insert them into the `actions` table
3. Link them to their parent ideas

---

## Best Practices

### 1. Always Use Helper Functions
❌ Don't query the actions table directly in components
✅ Use `getIdeaActions()`, `syncActionsToIdea()`, etc.

### 2. Sync After Idea Operations
When creating/updating ideas, always sync actions:
```typescript
const idea = await createIdea(values);
await syncActionsToIdea(idea.id, values.actions);
```

### 3. Handle Missing Actions Gracefully
```typescript
const actions = values.actions || [];
if (actions.length > 0) {
  await syncActionsToIdea(ideaId, actions);
}
```

### 4. Keep Form State and DB in Sync
When loading an idea, merge database actions into form data:
```typescript
const actions = await getIdeaActions(ideaId);
const formData = {
  ...idea.content_json,
  actions, // From database, not JSON
};
```

---

## Example Workflows

### Create Idea with Actions
1. User fills out idea form
2. User adds 3 actions in ActionsElement
3. User clicks "Save"
4. System creates idea record
5. System calls `syncActionsToIdea()` to create 3 action records
6. User redirected to idea detail page

### Edit Actions in Existing Idea
1. User clicks "Edit" on idea detail page
2. System loads actions from database via `getIdeaActions()`
3. ActionsElement displays actions with edit controls
4. User modifies actions (add, delete, update status)
5. User clicks "Save"
6. System calls `syncActionsToIdea()` to sync changes
7. System updates existing actions, creates new ones, deletes removed ones

### View Actions in Dashboard
1. Dashboard queries `actions` table for pending actions
2. Filters by `status = 'pending'`
3. Orders by `due_time` (soonest first)
4. Limits to 5 most urgent
5. Displays in ActionSidebar with idea links

---

## Testing Checklist

- [ ] Create idea with actions → verify records in `actions` table
- [ ] Create idea without actions → no action records created
- [ ] Edit idea and add actions → new records inserted
- [ ] Edit idea and remove actions → records deleted
- [ ] Edit idea and modify action text → records updated
- [ ] Change action status → `updated_at` timestamp changes
- [ ] Set due date on action → appears in dashboard sorted by urgency
- [ ] Delete idea → cascade deletes all related actions
- [ ] Dashboard shows pending actions from multiple ideas
- [ ] Clicking action in sidebar navigates to parent idea

---

## Future Enhancements

### Phase 2
- [ ] Action notifications (email/push when due)
- [ ] Recurring actions (weekly reviews, monthly reports)
- [ ] Action templates (pre-filled action lists)
- [ ] Bulk action operations (mark all as done)

### Phase 3
- [ ] Action dependencies (action B blocked by action A)
- [ ] Action assignments (multi-user support)
- [ ] Action comments/updates feed
- [ ] Action time tracking (how long did it take?)

### Phase 4
- [ ] Action analytics dashboard
- [ ] Action completion rate metrics
- [ ] Predictive due dates based on historical data
- [ ] AI-suggested actions based on idea content

---

All done! Your actions are now properly managed in the database. 🎉
