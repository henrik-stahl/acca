# Data Model: Event Kick-off Time

## No schema changes required

The `Event.eventDate` field is already `DateTime` in Prisma:

```prisma
model Event {
  eventDate  DateTime
  ...
}
```

The field stores a full UTC timestamp. The change is entirely in how the UI collects and displays the value:

- **Before**: `<input type="date">` → stored as `2026-04-10T00:00:00.000Z` (midnight)
- **After**: date input + time input → stored as `2026-04-10T16:00:00.000Z` (18:00 Stockholm = 16:00 UTC)

No migration needed.
