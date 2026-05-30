# Features To Build Later

These features are deferred from the initial implementation sprint. Full architecture is designed; they need dedicated UI screens and additional backend work.

---

## 1. Cork Boards
Collaborative drag-and-drop mood boards shared between friends.

**What it is**: A shared canvas where friends can pin photos, notes, and links in free-form layouts. Think Pinterest board meets a physical cork board.

**Backend tables needed** (stubbed in schema-features.sql):
- `cork_boards` — board metadata (title, cover, creator)
- `cork_board_members` — who has access
- `cork_board_items` — each pinned item with x/y position, rotation, type (photo/note/link), content

**UI needed**:
- `app/board/new.tsx` — create board: title, emoji, invite friends
- `app/board/[boardId].tsx` — the canvas with pinned items
- `src/components/board/BoardCanvas.tsx` — gesture-driven drag+drop (react-native-gesture-handler + Reanimated)
- `src/components/board/PinnedPhoto.tsx` — draggable photo with rotation
- `src/components/board/StickyNote.tsx` — draggable text note
- `src/hooks/useCorkBoards.ts` — CRUD + realtime item positions

**Key challenge**: Drag-and-drop physics with multi-touch collision detection. Consider using `react-native-draggable-flatlist` or a custom gesture handler approach with `PanGestureHandler`.

---

## 2. Friendship Boards
Persistent group spaces — one board per friendship/group that accumulates memories over time.

**What it is**: A permanent "room" that exists for a friendship or group. Unlike cork boards (project-based), friendship boards are always-on spaces that grow as the friendship does. Shows recent polaroids, shared moments, inside jokes.

**Backend tables needed** (stubbed in schema-features.sql):
- `friendship_boards` — one per friend pair or group
- `friendship_board_members` — participants

**UI needed**:
- `app/board/friendship/[boardId].tsx` — the board view with timeline + pinned memories
- Auto-creation when a friendship is formed
- Integration with existing polaroid feed to pull relevant posts

**Key challenge**: Deciding what auto-populates vs what users manually pin.

---

## 3. Friendship Shelf
The visual home hub for all memories — a physical bookshelf metaphor where each "book" is a roll, capsule, scrapbook, or pass.

**What it is**: Instead of a flat list in the memories tab, the shelf shows books/objects arranged on shelves. Tapping a book opens it with a page-turning animation. Different object types (roll = camera, capsule = box, scrapbook = book, pass = polaroid chain).

**UI needed**:
- Overhaul of `app/(tabs)/memories.tsx` to use shelf layout
- `src/components/shelf/ShelfRow.tsx` — horizontal row of memory objects
- `src/components/shelf/ShelfBook.tsx` — animated book object with spine label
- `src/components/shelf/ShelfCamera.tsx` — film camera object for rolls
- Page-turn animation when opening (consider `react-native-page-flip` or custom Reanimated)

**Key challenge**: Performance with many shelf objects. Use FlashList from `@shopify/flash-list` instead of ScrollView for the shelf rows.

---

## 4. Polaroid Scrapbooks
Page-turning shared scrapbooks with handwritten-style titles and decorations.

**What it is**: Friends collaboratively build a scrapbook by adding photos to pages. Each page has a layout (grid, collage, single large photo). Page-turning is the reveal mechanic.

**Backend tables needed**:
- `scrapbooks` — title, cover, creator
- `scrapbook_members` — who contributes
- `scrapbook_pages` — ordered pages
- `scrapbook_items` — photos on each page with position

**UI needed**:
- `app/scrapbook/new.tsx` — create
- `app/scrapbook/[scrapbookId].tsx` — the book viewer with page-turn gesture
- `src/components/scrapbook/PageTurn.tsx` — custom page-turn animation (Reanimated interpolation on a skew/perspective transform)
- `src/components/scrapbook/ScrapbookPage.tsx` — one page layout

**Key challenge**: Page-turn animation is complex. Start with a simple swipe-to-paginate before attempting true 3D page curl.

---

## 5. Seasonal Memory Drops
Auto-generated recap collages at end of season/year, delivered like a letter.

**What it is**: At the end of each season (or on New Year's), the app auto-generates a collage of the user's most-shared photos from that period. Delivered as a "sealed letter" to the user and their friends. Opens with a ceremony.

**Backend needed**:
- Supabase Edge Function: `generate-seasonal-recap` — runs on a cron schedule, selects top N photos by interaction, composes a recap record
- `seasonal_recaps` table — stores generated collage data, season label, participant ids
- Push notification when a recap is ready

**UI needed**:
- `app/recap/[recapId].tsx` — cinematic slideshow of the season's photos
- `src/components/recap/RecapCeremony.tsx` — opening animation (envelope reveal)
- `src/components/recap/SeasonLabel.tsx` — the season stamp/label

**Integration**: Add recap cards to the memories shelf when available.

---

## 6. Photo Left on Your Desk — Full Send Flow
Currently desk drops are received passively (DeskDropCard on home). The send flow is missing.

**What's missing**:
- A screen or modal to *send* a desk drop to a friend
- A discovery screen when you tap a DeskDropCard (currently the hook exists but no full reveal UI)
- Push notification when a drop is discovered by the recipient

**UI needed**:
- `app/drop/send.tsx` or a modal accessed from the friends list — pick friend, add photo, optional note, confirm
- `app/drop/[dropId].tsx` — full-screen discovery experience (blurred → reveal with haptic)
- `src/components/desk/DropRevealScreen.tsx` — the discovery ceremony

**Integration**: Add a "leave something on their desk" button on each friend's avatar long-press in the friends list.
