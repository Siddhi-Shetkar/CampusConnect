# CampusConnect

**Find the right person to learn, build, compete, and play with.**

CampusConnect is a full-stack student partner discovery, real-time messaging, and push notification web app / PWA built with React, Tailwind CSS, React Router, Node.js, Express, Socket.IO, Web Push (VAPID), and MongoDB (Mongoose).

## Core Features

- **Zero Dummy Data**: Displays only real partner requests, users, connections, and messages stored in the database, with clean empty states when no listings exist yet.
- **Authentication**: Email/password signup and login with `bcryptjs` password hashing and JWT sessions.
- **Student Profiles**: Editable profiles with college, year of study, bio, skills, interests, preferred activities, availability, and skill level.
- **Partner Discovery (`Find Your People`) & College Filtering**: Filter by **All Colleges**, **My College**, or any registered college, combined with category, activity, skill level, availability, and cross-field search (name, college, activity, or skills).
- **Partner Requests & Connection Workflow**: Create, edit, mark as filled, close/reopen, and delete requests; send, accept, or decline connection requests.
- **Real-Time Messaging (Socket.IO)**: Private 1-to-1 conversations unlocked exclusively between accepted connections, with real-time delivery, persistent message history, unread badges, and live sent/read receipts.
- **In-App Notification Center**: Navbar notification bell backed by the database with unread counts, click-to-navigate links, and mark-as-read controls.
- **Real Phone Push Notifications (PWA + Service Worker + Web Push)**: Background/closed-app push notifications on Android Chrome, Edge, Firefox, Desktop browsers, and installed iOS 16.4+ Home Screen PWAs for connection requests, acceptances, responses, and new messages.

## Environment Variables & Secrets Configuration

Copy `.env.example` to `.env` (or add these values in your deployment Secrets panel):

```env
# MongoDB Atlas connection string
MONGODB_URI="mongodb+srv://<username>:<password>@<cluster>.mongodb.net/campusconnect?retryWrites=true&w=majority"

# Strong random secret for signing JWT sessions
JWT_SECRET="replace-with-a-strong-random-64-char-secret"

# Persistent Web Push (VAPID) keys for phone notifications
VAPID_PUBLIC_KEY="your-generated-vapid-public-key"
VAPID_PRIVATE_KEY="your-generated-vapid-private-key"
VAPID_SUBJECT="mailto:your-email@example.com"
```

### Generating Persistent VAPID Keys for Phone Push Notifications

Run this command once locally to generate your own VAPID public/private keypair:

```bash
npx web-push generate-vapid-keys
```

Copy the generated `Public Key` into `VAPID_PUBLIC_KEY` and `Private Key` into `VAPID_PRIVATE_KEY` in your Secrets / `.env` file. Setting persistent VAPID keys ensures subscribed phones continue receiving push notifications across server restarts and deployments. (When omitted in dev/preview, the server generates an ephemeral in-memory keypair for the current runtime session.)

### Testing Phone Push Notifications

1. Open CampusConnect over HTTPS on your Android phone (Chrome / Edge / Firefox) or install it to the Home Screen on iOS 16.4+ Safari.
2. Sign in and tap **Enable Notifications** on the Dashboard or inside the navbar **Notification Bell**.
3. Grant browser notification permission and optionally tap **Send Test** to confirm delivery.
4. Send a connection request, accept one, or exchange messages between two accounts—tapping the notification opens the relevant conversation or request directly.

## Database Models

- `server/models/User.ts`
- `server/models/PartnerRequest.ts`
- `server/models/ConnectionRequest.ts`
- `server/models/Conversation.ts`
- `server/models/Message.ts`
- `server/models/Notification.ts`
- `server/models/PushSubscription.ts`

## Running Locally

```bash
npm install
npm run dev
```

Runs the full-stack Express + Socket.IO + Vite server on `http://localhost:3000`.
