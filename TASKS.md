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
- [ ] Session handling
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
