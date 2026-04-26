# Setup Guide for New Supabase Project

## Summary of Changes

### ✅ Fixed Issues
1. **Removed custom users table** - Now using Supabase's built-in `auth.users`
2. **Removed icon selector** from category creation page
3. **Added background** to element library sidebar
4. **Simplified signup** - No longer creates default templates (users start fresh)
5. **Added Row Level Security (RLS)** policies to all tables

### 📝 Database Changes
- All `user_id` foreign keys now reference `auth.users(id)` instead of custom `users` table
- Added `due_date` column to `ideas` table
- Added comprehensive RLS policies for data security
- Added performance indexes

---

## Steps to Setup New Supabase Project

### 1. Create New Supabase Project
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose organization and enter:
   - **Project Name**: alpha-brain (or your choice)
   - **Database Password**: (save this securely)
   - **Region**: Choose closest to you
4. Wait for project to provision (~2 minutes)

### 2. Run the Database Schema
1. In Supabase Dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `docs/dump/database/mvp_idea_action_layer.sql`
4. Paste into SQL Editor
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. Verify tables were created: Go to **Table Editor** and check for:
   - templates
   - categories
   - ideas
   - actions
   - resources
   - daily_stock_prices
   - etc.

### 3. Configure Authentication
1. Go to **Authentication** > **Providers**
2. Make sure **Email** provider is enabled
3. **IMPORTANT**: Under **Authentication** > **Email Templates**:
   - For development: Disable email confirmation (or set up SMTP)
   - For production: Set up proper email confirmation

To disable email confirmation for development:
1. Go to **Authentication** > **Settings**
2. Scroll to **Email Auth**
3. **Uncheck** "Enable email confirmations"

### 4. Update Environment Variables
1. In Supabase Dashboard, go to **Settings** > **API**
2. Copy these values:
   - **Project URL** (e.g., `https://xxx.supabase.co`)
   - **anon public** key

3. Update your `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Test the Setup
1. Start your dev server: `npm run dev`
2. Go to `http://localhost:3000/signup`
3. Create a test account
4. Login with that account
5. Try creating a category at `/categories/new`
6. Create an idea with the new category

---

## Verification Checklist

- [ ] New Supabase project created
- [ ] Database schema executed successfully
- [ ] All tables visible in Table Editor
- [ ] RLS policies are enabled (check each table's Policies tab)
- [ ] Email confirmation disabled (for development)
- [ ] Environment variables updated in `.env.local`
- [ ] Can sign up new account
- [ ] Can login with created account
- [ ] Can create new category
- [ ] Can create new idea

---

## Key Schema Changes

### Tables Using `auth.users`
All tables now reference Supabase's built-in auth:
```sql
user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
```

### New Fields
- `ideas.due_date` - Deadline for ideas
- All tables have RLS enabled with user-scoped policies

### Row Level Security
Every table now has RLS policies that ensure:
- Users can only see/modify their own data
- `auth.uid()` function gets current logged-in user
- Stock prices table is publicly readable (no user_id)

---

## Troubleshooting

### "Cannot find project ref" Error
- Run `npx supabase link` and select your new project
- Or run SQL directly in Supabase Dashboard SQL Editor

### Cannot Login After Signup
- Check if email confirmation is enabled (disable for dev)
- Check browser console for errors
- Verify environment variables are correct

### RLS Policy Errors
- Make sure all policies were created in SQL execution
- Check Supabase Dashboard > Authentication > Policies
- Verify user is authenticated: `auth.uid()` should return UUID

### Missing Tables
- Re-run the entire `mvp_idea_action_layer.sql` script
- Check for errors in SQL Editor output

---

## Next Steps After Setup

1. **Create Your First Category**
   - Go to `/categories/new`
   - Enter category name
   - Drag elements from library to canvas
   - Save

2. **Create Your First Idea**
   - Go to `/ideas/new`
   - Select the category you created
   - Fill in the dynamic form
   - Save

3. **Explore New Elements**
   - Try the **Actions** element (inline to-do list with status tracking)
   - Try the **Due Date** element (deadline picker)
   - Try the **Stock Graph** element (for stock-related ideas)

---

## Files Changed

### Database
- `docs/dump/database/mvp_idea_action_layer.sql` - Complete rewrite using `auth.users`

### Authentication
- `app/(auth)/signup/page.tsx` - Simplified, no default templates
- Now properly handles email confirmation

### UI Components
- `app/(dashboard)/categories/new/page.tsx` - Removed icon selector, added background to library
- `components/template-builder/ElementLibraryV2.tsx` - Categorized elements with drag-drop
- `components/template-builder/TemplateCanvasV2.tsx` - Sortable canvas with inline editing

### New Form Elements
- `components/form-elements/DueDateElement.tsx` - Date picker for deadlines
- `components/form-elements/ActionsElement.tsx` - Inline action items with status
- `components/form-elements/StockGraphElement.tsx` - Visual stock performance chart

---

**Ready to go!** Follow the steps above and you'll have a fresh, working Alpha Brain instance.
