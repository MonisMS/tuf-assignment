# Interactive Wall Calendar Component

Frontend engineering challenge submission built with Next.js, TypeScript, and Tailwind CSS.

The component is inspired by a physical wall calendar with a strong visual header, month grid, integrated notes panel, and responsive behavior across desktop and mobile.

## Highlights

- Wall calendar visual style with hero image panel and calendar sheet framing
- Interactive date range selection with clear start, end, and in-between states
- Dual notes system:
	- Per-date notes
	- Per-range notes
- Local storage persistence for current month, selected range, and all notes
- Keyboard-friendly interaction:
	- Arrow keys to move between day cells
	- Enter or Space to select
	- Escape to clear selection
- Responsive layout for desktop and mobile
- Added polish features:
	- Month transition animation
	- Weekend emphasis
	- Holiday markers for common US holidays

## Tech Stack

- Next.js App Router
- React + TypeScript
- Tailwind CSS v4
- Browser localStorage for persistence

## Run Locally

1. Install dependencies

```bash
npm install
```

2. Start development server

```bash
npm run dev
```

3. Open http://localhost:3000

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run start
```

## Interaction Model

- First day click sets range start
- Second day click sets range end (auto-normalized if selected in reverse)
- Clicking clear removes current selection
- Date Note mode writes notes for the currently selected day
- Range Note mode writes notes for the currently selected full range

## Accessibility Notes

- Focus-visible styles for interactive controls
- ARIA labels on day cells including holiday and note metadata
- Keyboard support for calendar cell traversal and selection
- Selection and metadata are communicated through text and shape, not color alone

## Manual QA Checklist

- Desktop layout keeps hero, grid, and notes readable
- Mobile layout remains fully usable for range selection and note editing
- Range selection shows start, end, and in-range states correctly
- Per-date and per-range notes can be created, updated, and deleted
- Refresh preserves month, selection, and notes from local storage
- Keyboard navigation and selection behavior works as documented

## Submission Links

- Repository: add your public repository URL here
- Video demo: add Loom or YouTube URL here
- Live demo (optional): add deployment URL here

## Future Extensions

- Editable holiday lists
- Theme extraction from user-selected hero image
- Print-optimized monthly export
