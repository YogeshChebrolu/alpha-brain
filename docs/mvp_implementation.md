This PRD is designed to guide you from zero to a functional, aesthetic MVP that captures the "Second Brain" philosophy while maintaining a high standard for financial data integrity.

---

# MVP Product Requirements Document: The Insight Lab

## 1. Product Vision
To create a high-aesthetic, joy-inducing environment for capturing raw intellectual "dumps" and transforming them into actionable financial or personal strategies. It bridges the gap between passive consumption (reading/listening) and active execution (stock positions/hobbies).

## 2. Core User Experience
* **Aesthetic:** Light theme, minimalist, generous whitespace, and smooth transitions.
* **Anti-Pattern:** Strictly no "Excel-like" tables. Data should feel like curated cards or interactive widgets.
* **Platform:** Responsive Web App with a "Native-feel" mobile swipe experience.

---

## 3. Feature Specifications (MVP Scope)

### 3.1 Home Page (Hero Focused)
The home page serves as a launchpad and motivation hub.
* **Inspiration Carousel:** A hardcoded, top-fold carousel featuring high-impact visual cards (e.g., AlphaFold protein structures, CRISPR diagrams).
* **Action List:** A "Current Focus" sidebar or section showing the top 3–5 pending actions with their due dates (e.g., "Complete cold reach", "4d left").
* **Primary CTA:** A prominent, aesthetic "Plus" button or "New Idea" input to trigger the creation flow immediately.

### 3.2 Modular Idea Creation Flow
The "Idea Dump" system must be flexible enough to handle anything from a "Stock Thesis" to a "Fashion Hobby."
* **Category Selection:** A modal or slide-over to select an existing category (Stock, Economy, Hobbies).
* **Dynamic Form Rendering:** Once a category is selected, the UI must render the specific template fields (JSON-based) associated with that category.
* **The "Template Builder" (Right-Side View):**
    * When creating a *new* category, a side-panel opens with a **Library of Elements**.
    * Users can drag/select elements (Text, Select, Stock Ticker, Image Upload) to build a custom form.
    * A "Default Template" (Idea, Explanation, Resources) is always loaded as a baseline.

### 3.3 The Elements Library (Custom Components)
Each element is a standalone React component with a `view` and `edit` state.
* **Standard Elements:** Text Areas, Checkboxes, File Uploads (for resources/news articles).
* **The "Stock Ticker" Element:** * **Edit State:** Simple ticker input field (e.g., "TSLA"). 
    * **View State:** Hits the **Yahoo Finance API** to fetch a sparkline graph showing the return percentage starting from the idea's creation date.
* **Resource Management:** Support for attaching images (Technical Analysis), podcast links, and book references directly to ideas or specific actions.

### 3.4 The "Idea Feed" (Swipe Experience)
* **Mobile:** A smooth, full-screen vertical swipe feed (similar to Perplexity/TikTok). Each card shows an AI-summarized heading, a cover image, and quick-action buttons.
* **Desktop:** A clean grid or list view (Pinterest-style) that prioritizes scannability.

---

## 4. Technical Architecture

### 4.1 Database Design (Supabase/PostgreSQL)
* **Hybrid Storage:** Fixed columns for `title` and `category_id`; a `JSONB` column for `content_json` to store custom form values.
* **Option C Relationships:** Separate tables for `idea_attachments`, `action_attachments`, and `action_updates` to maintain strict referential integrity.

### 4.2 Frontend (React/TypeScript)
* **Component Registry:** A mapping object that tells the app which UI component to render based on the element `type` (e.g., `type: 'stock_ticker'` -> `<StockTickerWidget />`).
* **State Management:** Optimized for smooth swiping and optimistic UI updates (e.g., marking an action as "Done" happens instantly).

---

## 5. MVP Success Metrics & Milestones

| Milestone | Deliverable |
| :--- | :--- |
| **M1: Foundation** | Supabase schema setup with the finalized SQL script and basic Auth. |
| **M2: The Builder** | JSONB-driven form renderer that can handle at least 3 distinct category templates. |
| **M3: Financial Layer** | Integration with Yahoo Finance API for the Stock Ticker widget. |
| **M4: The Swipe** | Implementation of the mobile-responsive swipe gesture for the Idea Feed. |

---

## 6. Future Roadmap (Post-MVP)
* **Alerts Engine:** WhatsApp and Android push notifications for actions.
* **Virtual Portfolio Pro:** The "1 Lakh Limit" hard constraint and thematic portfolio performance tracking.
* **Social/Sharing:** Platform-wide public templates and community-curated form elements.

---

This document is now your blueprint. Since we're using **React, TypeScript, and Supabase**, the next logical step is to set up your **Component Registry** for those modular form elements. 

Ready to look at the TypeScript interface for that registry, or should we jump into the **Yahoo Finance** integration logic first?
