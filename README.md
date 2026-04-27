# Real-time Poll Battle Arena

Build a head-to-head polling app where visitors create polls, cast votes, and watch results shift live. The centerpiece is a tug-of-war bar — a horizontal indicator that skews left or right as votes accumulate on each side.

## Stack

- **Frontend**: any (port 3000)
- **Backend**: Flask (port 3001)
- **Database**: sqlite

## Features

### Poll Creation

Anyone can create a poll from the home page. A poll needs:

- A **question** (e.g. "Tabs vs Spaces?")
- Exactly **two options** — Option A and Option B
- A **duration in seconds** controlling how long voting stays open (default: `86400`, i.e. 24 hours)

After creation, the page displays a shareable link so the creator can send others to vote.

### Voting

Each poll lives at its own URL. Before a visitor votes, only the two option buttons are shown — vote counts are deliberately hidden so they don't bias the choice.

Clicking an option casts a vote and immediately replaces the buttons with a **results panel** containing:

- A **tug-of-war bar**: a full-width horizontal bar with a sliding divider. Option A's share fills from the left, Option B's from the right. A 50/50 tie puts the divider dead center; any imbalance slides it toward the leading side.
- The raw **vote count** for each option
- The **percentage share** for each option (e.g. "60%" / "40%")

The results panel stays live — it subscribes to a Server-Sent Events stream so vote counts and the bar position update automatically as other visitors vote, without any page reload.

### Poll Locking

A poll locks once its duration elapses. On a locked poll:

- The option buttons are never rendered, even for first-time visitors
- The results panel is shown immediately with the final vote totals
- A locked indicator is displayed
- Any vote submitted to the backend after the deadline is rejected with an error response

### Trending

The trending page shows the top 5 polls ranked by the number of votes received **in the past hour**. Each entry shows the poll question and its recent vote count.

## Pages

**`/`** — Home. The poll creation form lives here. After a successful submission, a shareable link to the new poll appears beneath the form without navigating away.

**`/poll/:id`** — Poll view. Shows the question and either the voting buttons (poll active, visitor hasn't voted this session) or the results panel (visitor voted, or poll is locked).

**`/trending`** — Trending. Lists up to 5 polls ordered by recent vote activity.

## Navigation

A persistent navigation bar is visible on every page with links to the home page and the trending page.

## API

The frontend communicates with the Flask backend over HTTP and SSE. Provide endpoints to:

- Create a poll
- Retrieve a poll's current state (question, options, vote counts, expiry status)
- Submit a vote for one of the two options
- Stream live vote updates using Server-Sent Events
- Fetch the trending list

All API routes must be prefixed with `/api`.

## UI Requirements

Assign these `data-testid` attributes exactly — the test suite locates elements by these values.

### Navigation bar

| Element | `data-testid` |
|---------|--------------|
| Home link | `nav-home` |
| Trending link | `nav-trending` |

### Home page (`/`)

| Element | `data-testid` | Notes |
|---------|--------------|-------|
| Question text field | `question-input` | |
| Option A text field | `option-a-input` | |
| Option B text field | `option-b-input` | |
| Duration field | `duration-input` | numeric; value in **seconds** |
| Create button | `create-poll-btn` | submits the form |
| Error message | `create-error` | shown when creation fails (e.g. missing fields) |
| Shareable link | `shareable-link` | the URL to the created poll; visible only after a successful creation |

### Poll page (`/poll/:id`)

| Element | `data-testid` | Notes |
|---------|--------------|-------|
| Poll question | `poll-question` | |
| Option A vote button | `option-a-btn` | hidden once voted or poll is locked |
| Option B vote button | `option-b-btn` | hidden once voted or poll is locked |
| Tug-of-war bar | `tug-bar` | visible inside the results panel |
| Option A vote count | `option-a-count` | integer text; visible inside the results panel |
| Option B vote count | `option-b-count` | integer text; visible inside the results panel |
| Option A percentage | `option-a-pct` | e.g. `"60%"`; visible inside the results panel |
| Option B percentage | `option-b-pct` | visible inside the results panel |
| Locked indicator | `poll-locked` | visible only when the poll is locked |

### Trending page (`/trending`)

| Element | `data-testid` | Notes |
|---------|--------------|-------|
| List container | `trending-list` | wraps all entries |
| Individual entry | `trending-item` | one per poll, up to 5 |
| Question text | `trending-question` | inside each `trending-item` |
| Recent vote count | `trending-votes` | inside each `trending-item`; votes in the past hour |
