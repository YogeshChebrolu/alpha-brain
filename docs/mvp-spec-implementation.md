
---

# `spec-implementation.md`

## 1. Project Identity & Aesthetic
* **Theme:** Light Mode, Minimalist, High-Whitespace.
* **Color Palette:** Background `#F8FAFC`, Borders `#E2E8F0`, Text `#1E293B`, Accent `#6366F1`.
* **UI Filler (Form):** A static, simple gradient flow (e.g., `#EEF2FF` to `#FFFFFF`) on the right side of the form UI to provide visual depth without distraction.
* **Branding (Footer):** A persistent Brain ASCII animation in the footer, acting as a signature of the "Second Brain" concept.

## 2. Technical Stack
* **Frontend:** React (Vite), TypeScript, Tailwind CSS, Framer Motion.
* **Backend:** Supabase (Auth, PostgreSQL, Edge Functions, Storage).
* **Data Source:** Yahoo Finance API (via Edge Function).

## 3. Database Schema (Final MVP)
```sql
-- Core Tables
CREATE TABLE ideas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    category_id UUID REFERENCES categories(id),
    title TEXT NOT NULL,
    content_json JSONB, -- Dynamic form values
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE daily_stock_prices (
    ticker TEXT PRIMARY KEY,
    close_price DECIMAL,
    change_pct DECIMAL,
    last_synced_at TIMESTAMPTZ
);

-- Separate tables for Option C compliance
CREATE TABLE actions ( ... ); 
CREATE TABLE action_updates ( ... );
CREATE TABLE idea_attachments ( ... );
```


## 4. Modular Form System & Component Registry
Build a `registry.ts` that maps template `type` strings to React components. Every component must support:
1.  **Edit Mode:** Standard input (e.g., text field, search ticker).
2.  **View Mode:** Aesthetic widget (e.g., Markdown renderer, Stock Chart).

### The Stock Ticker Element
* **Edit:** User inputs a ticker symbol (e.g., `AAPL`).
* **View:** Displays the current `close_price` and a sparkline.
* **Logic:** Calculates return percentage since idea creation:
    $$\text{Return \%} = \left( \frac{\text{Current Price} - \text{Price at Creation}}{\text{Price at Creation}} \right) \times 100$$
   

## 5. Daily Market Sync Logic (Backend)
### 5.1 Supabase Edge Function (`sync-prices`)
* **Frequency:** Every Monday–Friday at 4:00 PM.
* **Process:**
    1.  Scan `ideas.content_json` for unique `ticker` keys.
    2.  Fetch current closing price from Yahoo Finance.
    3.  Upsert values into `daily_stock_prices`.
* **Frontend Interaction:** The frontend fetches cached data from `daily_stock_prices` to ensure high performance and zero lag during idea swipes.

## 6. Frontend Core Features

### 6.1 Home Page
* **Hero Carousel:** A Framer Motion carousel of "Inspiration" cards (AlphaFold, etc.).
* **Action Sidebar:** A vertical list showing top pending actions with time-remaining indicators.

### 6.2 Idea Creation & Transition
* **Step 1:** Category Selection.
* **Step 2 (Transition):** Smooth morphing animation where the selection list slides out and the dynamic form template slides in.
* **Step 3:** While the user fills the form on the left, the right side displays the **Static Gradient Flow**.

### 6.3 Mobile Swipe Feed
* Vertical snapping scroll for ideas.
* Minimalist card design showing the title, one key metric (like stock return), and the latest action update.

## 7. Implementation Roadmap for Coding Agent
1.  **Setup:** Initialize Vite + Tailwind + Supabase. Apply the soft-light background theme.
2.  **Registry:** Create the `FormElement` interface and the initial `StockTicker` component.
3.  **DB Triggers:** Implement the `updated_at` triggers and the `daily_stock_prices` cache table.
4.  **Edge Function:** Write the Deno function for Yahoo Finance syncing and schedule it via `pg_cron`.
5.  **Motion:** Implement the morphing form transitions and the horizontal carousel using Framer Motion.
6.  **Footer:** Add the **Brain ASCII** animation component to the global Layout footer.
