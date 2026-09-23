# Client app redesign: production parity

The preview at `client-app.html` is an interactive visual prototype with demo data.
It does not read or change production records. The redesign must be connected to
the existing APIs before deployment; example names, prices, dates and counts in
the preview must not be copied into production components.

## Existing data and behavior to preserve

| Screen | Production source | Required behavior |
| --- | --- | --- |
| Home | `ClientHome.jsx`, `/api/client/overview`, `/api/client/active-workout`, `/api/live/sessions` | Authenticated first name, checkout verification/result, subscription/access states, real workout and session history, weekly streak/calendar, trained-today state, next live, last-session recap and empty states. |
| Workout | `WorkoutPath.jsx`, `/api/client/active-workout` | Assigned days/items, exercise media and previous result, per-set loads/reps, RPE/notes, rest timer, persistent draft, skip and resume, unlocked previously reached items, completion and session submission. |
| Progress | `ClientHistory.jsx`, workout/session and measurement APIs | Real session counts/dates, strength history, body measurements, units, filters and empty states. |
| Live | `ClientLive.jsx`, `/api/live/sessions`, `/api/live/bookings`, `/api/payments/products`, `/api/payments/checkout` | Live credits, booked/available sessions, countdown, 1:1/group capacity, booking/cancellation, video link only when provided, no-credit/full states, quantity/discount/real product price and Stripe checkout. |
| Profile | `ClientProfile.jsx`, auth, overview, active-workout and messages APIs | Real name, avatar storage/edit/remove/URL, XP and level thresholds, total/month/recent sessions, all seven conditional badges, insight, quick actions and conditional active-package usage. |
| Settings | `ClientSupport.jsx`, auth and `/api/client/overview` | Name/email, active/trialing/past-due/canceled subscription, renewal or expiry, access level, remaining period, legacy package fallback, no-package purchase route, contact, privacy, install and real logout. |
| Privacy | `ClientPrivacy.jsx` | Intro, all six legal sections and exact policy/cookie links and footer. The preview copies the current text; legal claims are not rewritten. |
| Contact | `ClientContact.jsx` | Messages and subject categories, WhatsApp and email; accessible from Profile/Settings even though Live occupies the main tab. |
| Packages/install | `ClientPackages.jsx`, `ClientInstallApp.jsx` | Real products/checkout and install instructions remain reachable. |

## Review boundary

The supplied production screenshots show one account state, not every production
record or conditional state. Source-level parity and preview behavior can be
checked locally, but production-record verification requires authenticated,
read-only access. No database migration or write is part of this visual review.

Two existing placeholders should be resolved before a production push: the
WhatsApp URL in `ClientContact.jsx` uses `393000000000`, and the privacy footer
says `P.IVA da inserire`. The preview does not present that WhatsApp URL as a
working contact destination.
