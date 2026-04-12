# Calendar Weekly View — Design Spec
Date: 2026-04-09

## Overview
Upgrade the AppointmentsPage calendar from a basic monthly grid to a full Google Calendar-style interface with a weekly time-slot view and a responsible-person filter.

## Goals
- Show appointments with their exact time as visual blocks (like Google Calendar)
- Allow switching between weekly and monthly views
- Filter appointments by responsible person (assignedTo user)
- Keep it simple and intuitive — no unnecessary complexity

## Views

### 1. Weekly View (primary new view)
- 7 columns (Sun → Sat), one per day
- Hour rows from 07:00 to 22:00, visible with horizontal grid lines
- Today's column highlighted with a subtle background
- Each appointment rendered as a colored block:
  - Positioned vertically by startAt time
  - Height proportional to duration
  - Shows title + start time (truncated if block is small)
  - Color based on STATUS_COLORS
  - Clickable to open edit modal
- Vertical scroll to navigate hours
- Navigation: < prev week | "Hoje" button | next week >
- Current week label shown (e.g. "5–11 Abril 2026")

### 2. Monthly View (enhanced existing)
- Keep current grid structure
- Add start time before event title: "10:30 Visita T3"
- Show max 3 events per cell + "+X mais" overflow

### 3. List View
- Unchanged from current implementation

## Responsible Filter
- Fetched from appointments data (extract unique assignedTo users)
- Displayed as chips at the top: "Todos" + one chip per user
- Selecting a chip filters all views to show only that user's appointments
- Default: "Todos" selected
- Chips show user initials avatar + first name

## Data
- Appointments already have `assignedTo` (User with id, name) returned from API
- Need to verify the API includes `assignedTo` in the response — if not, add it to the service include
- No backend changes needed for filtering (filter client-side)

## Files to Change
- `frontend/src/pages/AppointmentsPage.tsx` — main file, add week view + responsible filter
- `backend/src/modules/appointments/appointments.service.ts` — ensure `assignedTo` is included in list response

## Out of Scope
- Day view
- Drag-and-drop
- Create appointment by clicking time slot (future)
- Server-side filtering by responsible
