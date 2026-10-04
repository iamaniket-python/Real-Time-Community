# 🤝 HelpNow: Real-Time Community Help Platform

A real-time platform that connects people who need local help with nearby, admin-verified helpers.

Built with the **PERN stack: PostgreSQL, Express.js, React.js and Node.js**, with real-time communication using **Socket.IO** and presence/rate-limit handling using **Redis**.

> 🚀 The goal is a real-world application rather than a basic CRUD project, with focus on security, concurrency, real-time communication and user experience.

------------------------------------------------------------------------

## ✨ Features

### 👤 User

-   Register and login (JWT access token plus httpOnly refresh cookie)
-   Create help requests with category, title, description, address, map location and an optional image
-   One active request at a time
-   Real-time status updates and notifications
-   Live map showing the assigned helper's position
-   See the assigned helper's details: shop name and address, years of experience, GST number, masked Aadhaar and PAN, phone, rating and shop photo
-   Real-time chat with the helper (text and images)
-   Cancel requests and view request history
-   Rate the helper after completion
-   Report problems

### 🧑‍🔧 Helper

-   Register as a helper
-   Business profile: shop name, address, years of experience, GST, Aadhaar, PAN
-   Upload Aadhaar card, PAN card and shop photo
-   Readiness checklist (business details, documents, services, admin verification)
-   Select service categories
-   Online/Offline availability with live location sharing
-   Receive nearby requests in real time
-   Accept or reject requests
-   Update job status step by step
-   Chat with users and receive messages from admin
-   View completed jobs

### 👨‍💼 Admin

-   Dashboard with platform statistics
-   Review helpers with full ID numbers and document images
-   Verify, reject or suspend helpers
-   Chat directly with any helper, without a request
-   Block or unblock users
-   Manage categories
-   Monitor active requests
-   Handle reports and complaints
-   Audit log of every admin action

------------------------------------------------------------------------

## ⚡ Real-Time Request Flow

``` text
Helper completes business profile and documents
        ↓
Admin reviews documents and verifies helper
        ↓
Helper goes online and shares location
        ↓
User creates request
        ↓
System finds nearby available helpers
        ↓
Socket.IO sends real-time notification
        ↓
Helper accepts request
        ↓
User sees helper details, live map and chat
        ↓
Helper updates job status
        ↓
Request completed
        ↓
User gives rating
```

### Request Status

``` text
PENDING
   ↓
SEARCHING
   ↓
ACCEPTED
   ↓
ARRIVING
   ↓
IN_PROGRESS
   ↓
COMPLETED
```

Other states:

``` text
CANCELLED
REJECTED
EXPIRED
```

### Helper Verification

``` text
PENDING → VERIFIED
PENDING → REJECTED → (resubmit) → PENDING
VERIFIED → SUSPENDED → VERIFIED
```

------------------------------------------------------------------------

## 🛠️ Tech Stack

  Technology                 Purpose
  -------------------------- ----------------------------------------
  React 19 + Vite            Frontend UI
  Tailwind CSS v4            Styling
  React Router               Routing
  Leaflet / react-leaflet    Maps
  Node.js + Express.js       REST API
  PostgreSQL (raw SQL)       Primary database
  Socket.IO                  Real-time communication
  Redis                      Presence, rate limiting, Socket scaling
  JWT                        Authentication
  Zod                        Input validation
  Multer + file-type         Safe image uploads
  Vercel                     Frontend hosting

------------------------------------------------------------------------

## 🏗️ Architecture

``` text
                    ┌──────────────────┐
                    │   React Client   │
                    └────────┬─────────┘
                             │
                    REST + Socket.IO
                             │
                    ┌────────▼─────────┐
                    │  Node / Express  │
                    │  + Socket.IO     │
                    └───┬──────────┬───┘
                        │          │
              ┌─────────▼──┐   ┌───▼─────────────┐
              │   Redis    │   │   PostgreSQL    │
              │ Presence / │   │ Persistent data │
              │ Rate limit │   └─────────────────┘
              └────────────┘
                        │
              ┌─────────▼─────────┐
              │ Private uploads   │
              │ (signed URLs)     │
              └───────────────────┘
```

------------------------------------------------------------------------

## 🗄️ Database Design

Main tables include:

``` text
users
helper_profiles          (business details, ID numbers, document paths)
categories
helper_categories
help_requests
request_status_history
request_rejections
conversations            (request chats and admin-helper chats)
messages
message_reads
notifications
ratings
reports
refresh_tokens
admin_actions            (audit log)
schema_migrations
```

PostgreSQL is the **source of truth**. Schema changes are numbered `.sql` files in the `migrations` folder, applied in order by `db/migrate.js`.

------------------------------------------------------------------------

## 🔥 Real-Time Features

Server to client:

``` text
request:new
request:accepted
request:unavailable
request:status_changed
request:cancelled
request:radius_expanded
incoming:sync

message:new
message:read
message:delivered
typing:start
typing:stop

helper:location_update
helper:online
helper:offline

notification:new
notification:count
```

Client to server: `request:join`, `request:leave`, `conversation:join`, `conversation:leave`, `helper:location_update`, `message:send`, `typing:start`, `typing:stop`.

Socket rooms are organised per user, request and conversation.

------------------------------------------------------------------------

## 📍 Location Matching

Nearby helpers are found using:

-   Latitude and longitude (Haversine distance in SQL)
-   Service category
-   Availability and a fresh location
-   Search radius that can expand over time

Helper locations are privacy-rounded until a job is accepted.

------------------------------------------------------------------------

## 🔐 Security

-   JWT access token (15 minutes, kept in memory) and httpOnly refresh cookie
-   Role-based authorization (USER, HELPER, ADMIN)
-   Zod input validation
-   Parameterised SQL queries
-   Rate limiting
-   Secure CORS configuration
-   Image uploads checked by real file type (JPEG, PNG, WebP) and 5 MB limit
-   Files stored outside the public folder and served only through **5-minute signed URLs**
-   Users see only **masked** Aadhaar and PAN; full numbers and ID images are visible to admins only
-   Every admin view of full helper details is written to the audit log
-   Non-owners receive 404 instead of 403, so ids cannot be probed
-   Race-safe request acceptance and idempotent request creation
-   Environment variables for all secrets

> ⚠️ Aadhaar and PAN numbers are currently stored as plain text. Encrypt them at rest before real users.

------------------------------------------------------------------------

## ⚙️ Redis Usage

-   Rate limiting
-   Presence handling
-   Socket.IO adapter for scaling

Redis is **not** the primary database.

------------------------------------------------------------------------

## 📁 Project Structure

``` text
Real Time Commnunity/
│
├── frontend/
│   └── client/
│       └── src/
│           ├── api/            (API wrappers)
│           ├── components/     (ui, admin, helper)
│           ├── context/
│           ├── hooks/
│           ├── pages/          (Authentication, user, helper, admin, shared)
│           ├── routes/
│           ├── socket/
│           └── utils/
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── db/
│   ├── jobs/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── sockets/
│   ├── utils/
│   ├── validators/
│   ├── app.js
│   └── server.js
│
├── migrations/                 (numbered .sql files)
├── README.md
└── .gitignore
```

------------------------------------------------------------------------

## 🚀 Getting Started

### Prerequisites

-   Node.js 20 or newer
-   npm
-   PostgreSQL
-   Redis
-   Git

### Clone Repository

``` bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git

cd YOUR_REPO
```

### Install Dependencies

Backend:

``` bash
cd backend
npm install
```

Frontend:

``` bash
cd frontend/client
npm install
```

------------------------------------------------------------------------

## 🔑 Environment Variables

Backend: create `backend/.env`. The full list of names is defined in `backend/config/env.js`. It includes the database URL, Redis URL, JWT secrets, `UPLOAD_SECRET`, the client origin and the request search settings.

Frontend: create `frontend/client/.env`:

``` env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

> Never commit real secrets or the `uploads` folder to GitHub.

------------------------------------------------------------------------

## 🗃️ Database Migrations

``` bash
cd backend
node db/migrate.js
```

Migrations are read from the `migrations` folder one level above `backend` and applied in filename order.

------------------------------------------------------------------------

## ▶️ Run Development Servers

Backend:

``` bash
cd backend
npm run dev
```

Frontend:

``` bash
cd frontend/client
npm run dev
```

Local URLs:

``` text
Frontend: http://localhost:5173
Backend:  http://localhost:5000
Health:   http://localhost:5000/api/health
```

> The backend CORS setting must allow exactly `http://localhost:5173`. Use two browser sessions (normal and incognito) to test two accounts, because the refresh cookie is shared inside one browser.

------------------------------------------------------------------------

## 🔌 API Endpoints

Base path `/api`. Success: `{ success: true, data }`. Error: `{ success: false, message, errorCode, details? }`.

### Authentication

``` http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/me
```

### Help Requests

``` http
POST  /api/requests
GET   /api/requests
GET   /api/requests/:id
POST  /api/requests/:id/cancel
GET   /api/requests/:id/helper
POST  /api/requests/:id/accept
POST  /api/requests/:id/reject
PATCH /api/requests/:id/status
POST  /api/requests/:id/rating
POST  /api/requests/:id/report
```

### Helper Profile

``` http
GET   /api/helpers/me
GET   /api/helpers/me/business
PUT   /api/helpers/me/business
GET   /api/helpers/me/documents
POST  /api/helpers/me/documents/:type     (aadhaar | pan | shop)
PUT   /api/helpers/categories
PATCH /api/helpers/availability
GET   /api/helpers/incoming
GET   /api/helpers/jobs
```

### Messages

``` http
GET  /api/conversations
GET  /api/messages/:conversationId
POST /api/messages
POST /api/messages/:conversationId/attachments
POST /api/messages/:conversationId/read
```

### Notifications

``` http
GET   /api/notifications
GET   /api/notifications/unread-count
PATCH /api/notifications/:id/read
PATCH /api/notifications/read-all
```

### Admin

``` http
GET   /api/admin/helpers
GET   /api/admin/helpers/:id
POST  /api/admin/helpers/:id/verify
POST  /api/admin/helpers/:id/reject
POST  /api/admin/helpers/:id/suspend
POST  /api/admin/helpers/:id/chat
POST  /api/admin/users/:id/block
POST  /api/admin/users/:id/unblock
GET   /api/admin/reports
PATCH /api/admin/reports/:id
GET   /api/admin/categories
POST  /api/admin/categories
PATCH /api/admin/categories/:id
GET   /api/admin/requests/active
GET   /api/admin/stats
GET   /api/admin/audit-log
```

------------------------------------------------------------------------

## 🧠 Concurrency Handling

Two helpers must never be able to accept the same request.

``` text
Helper A ─────┐
              │
              ▼
        PostgreSQL
   UPDATE ... WHERE status = 'SEARCHING'
   AND accepted_helper_id IS NULL
              │
       Only one caller matches
              │
       Assign Helper A, COMMIT

Helper B
   ↓
Same UPDATE matches no row
   ↓
409 REQUEST_NOT_AVAILABLE
```

Database constraints also enforce one active request per user and one active job per helper.

------------------------------------------------------------------------

## 🌐 Deployment

**Frontend (Vercel)**

-   Root Directory: `frontend/client`
-   Environment variables: `VITE_API_URL` and `VITE_SOCKET_URL` pointing at the deployed backend (redeploy after changes)
-   Add `frontend/client/vercel.json` so refreshing on routes like `/admin` works:

``` json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

**Backend**

-   Host it separately from Vercel (it is a long-lived Socket.IO server)
-   Run all migrations on the production database
-   CORS must allow the Vercel URL; the refresh cookie needs `Secure` and `SameSite=None` over HTTPS
-   Persist the `uploads` folder (volume or object storage)

------------------------------------------------------------------------

## 📊 Production Readiness Checklist

### Security

-   [ ] Encrypt Aadhaar and PAN at rest
-   [ ] Legal review for storing and showing identity data
-   [ ] Confirm `.env` and `uploads` are in `.gitignore`
-   [ ] HTTPS and production CORS/cookie settings

### Performance

-   [ ] Code splitting (the frontend bundle is about 550 kB)
-   [ ] Database indexes reviewed for the busiest queries

### UX

-   [x] Mobile-friendly layouts
-   [x] Loading, empty and error states
-   [x] Custom error page
-   [ ] SEO metadata and accessibility audit

### Monitoring

-   [ ] Error logging and API monitoring
-   [ ] Database and Redis health checks

------------------------------------------------------------------------

## 🧪 Testing

Manual end-to-end flow (use two browser sessions):

``` text
1. Helper fills profile and uploads documents
2. Admin reviews and verifies the helper
3. Helper picks services and goes online
4. User creates a request
5. Helper accepts; user sees helper card, map and chat
6. Helper advances status; user follows live
7. User rates and reports
8. Admin handles the report and chats with the helper
```

Concurrent acceptance should be tested by sending several accept calls at once and checking that only one succeeds.

------------------------------------------------------------------------

## 📈 Future Improvements

-   Admin inbox for all helper conversations
-   Push notifications
-   Payment integration
-   Background job queues
-   Fraud and abuse detection
-   Advanced analytics
-   Multi-language support
-   Docker and Nginx setup
-   PostGIS for large-scale geospatial queries
-   Dedicated mobile application

------------------------------------------------------------------------

## 📌 Project Status

✅ **All planned features are built.**

The core flow (requests, matching, chat, ratings, admin tools) has been tested. The newest features (helper business profile, assigned-helper card, admin-to-helper chat) still need a full end-to-end test before production use.

------------------------------------------------------------------------

## 👨‍💻 Author

Aniket Shrivastava

Built with ❤️ using the PERN stack.

------------------------------------------------------------------------

## 📄 License

This project is licensed under the MIT License.