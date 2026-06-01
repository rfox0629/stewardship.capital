# Stewardship Capital Tasks

## Sprint 1 - Homepage & Auth Shell

### Homepage
- [x] Homepage built
- [x] Mobile responsive
- [x] Desktop responsive
- [x] Dashboard preview component
- [x] Four pillar section
- [x] CTA section
- [x] Accessibility review
- [x] Homepage QA

### Code Quality
- [x] Fix lint
- [x] Fix typecheck issues
- [x] Verify build

### Authentication
- [x] Login page
- [x] Signup page
- [x] Protected app routes
- [x] Session handling
- [x] Logout

### App Shell
- [x] Dashboard layout
- [x] Sidebar/mobile nav
- [x] Empty Overview page
- [x] Empty Protect page
- [x] Empty Grow page
- [x] Empty Transfer page
- [x] Empty Impact page
- [x] Empty Reports page

Do not build:
- Assessment engine
- Scoring engine
- Financial analysis
- Opportunity engine
- PDF generation

## Sprint 2 - Supabase Auth + Protected Shell

### Supabase Auth
- [x] Supabase client/server helpers
- [x] Environment variable examples
- [x] Login page wired to Supabase email auth
- [x] Signup page wired to Supabase email auth
- [x] Logout action
- [x] Protected dashboard routes
- [x] Redirect unauthenticated users from /dashboard to /login
- [x] Redirect authenticated users to /dashboard after login
- [x] Profile schema need documented

Do not build:
- Production secrets
- Hardcoded Supabase keys
- Supabase schema migrations
- Assessment engine
- Scoring engine

## Sprint 3 - Assessment MVP Static Engine

### Assessment
- [x] Assessment route
- [x] One-question-at-a-time UI
- [x] 25 questions max
- [x] No dollar amounts, uploads, or account connections
- [x] Yes / No / Not Sure and multiple choice only
- [x] Sticky auto-save indicator
- [x] Progress percentage
- [x] Back and Next buttons
- [x] Resume later placeholder
- [x] Local client-side draft state
- [x] Completion navigates to dashboard

### Code Quality
- [x] Typecheck passes
- [x] Lint passes
- [x] Build passes

Do not build:
- Persisted assessment records
- Scoring engine
- Financial analysis
- Opportunity engine
- PDF generation

## Sprint 4 - Scoring + Dashboard MVP Mock Data

### Scoring
- [x] Basic scoring utilities
- [x] Stewardship Score
- [x] Financial Readiness Score
- [x] Legacy Impact Score
- [x] Stewardship Stage
- [x] Top 3 priorities
- [x] Mock data separated from future persisted data

### Dashboard MVP
- [x] Stewardship Score shown
- [x] Stage shown
- [x] Profile Completion % shown
- [x] Protect / Grow / Transfer / Impact snapshot
- [x] Top 3 priorities shown
- [x] Locked future modules shown
- [x] CTA to Complete Financial Analysis

### Code Quality
- [x] Typecheck passes
- [x] Lint passes
- [x] Build passes

Do not build:
- Persisted dashboard records
- Financial Analysis
- Opportunity engine
- PDF generation

## Sprint 5 - Financial Analysis Placeholder

### Financial Analysis
- [x] `/dashboard/grow` entry point
- [x] Progressive onboarding placeholder
- [x] Connect Accounts option
- [x] Connect Accounts marked Coming Soon
- [x] Upload Documents option
- [x] Upload Documents marked Coming Soon
- [x] Enter Manually placeholder
- [x] No Plaid implementation
- [x] No uploads implementation
- [x] No document extraction implementation

### Code Quality
- [x] Typecheck passes
- [x] Lint passes
- [x] Build passes

Do not build:
- Plaid integrations
- Document uploads
- OCR or extraction
- Persisted financial data
- Opportunity engine
- PDF generation

## Sprint 6 - Supabase Schema + Persisted Assessment Drafts

### Supabase Schema
- [x] Migration structure added
- [x] profiles table
- [x] assessments table
- [x] assessment_responses table
- [x] assessment_scores table
- [x] roadmap_items table
- [x] dashboard_snapshots table
- [x] reports table
- [x] RLS enabled on user-owned tables
- [x] Own-record select/insert/update/delete policies
- [x] Helpful indexes
- [x] Migration notes documented

### Assessment Persistence
- [x] Create or resume in-progress assessment for authenticated users
- [x] Save answers to assessment_responses
- [x] Update percent_complete
- [x] Update last question index
- [x] Visible save statuses
- [x] Resume later returns to saved question
- [x] Local fallback separated for unauthenticated or failed saves
- [x] Completion persists scores
- [x] Completion persists dashboard snapshot
- [x] Completion persists roadmap items

### Dashboard Persistence
- [x] Dashboard reads latest persisted completed snapshot
- [x] Starter state shown when no completed assessment exists
- [x] Assessment CTA shown from starter state

### Code Quality
- [x] Typecheck passes
- [x] Lint passes
- [x] Build passes

Do not build:
- Plaid
- uploads
- OCR
- PDF generation
- opportunity engine
- professional marketplace
