# 🤝 Real-Time Community Help Platform

A production-oriented real-time platform that connects people who need
local help with nearby available helpers.

Built with the **PERN stack --- PostgreSQL, Express.js, React.js, and
Node.js** --- with real-time communication using **Socket.IO** and fast
temporary data/presence handling using **Redis**.

> 🚀 The goal is to build this as a real-world application rather than a
> basic CRUD project, with focus on security, scalability, concurrency,
> real-time communication, and user experience.

------------------------------------------------------------------------

## ✨ Features

### 👤 User

-   Register and login
-   JWT-based authentication
-   Create help requests
-   Select help category
-   Add title, description, image, and location
-   Find nearby available helpers
-   Receive real-time notifications
-   Real-time chat with the assigned helper
-   Track request status
-   Cancel requests
-   View request history
-   Rate and review helpers
-   Report problems/users

### 🧑‍🔧 Helper

-   Register as a helper
-   Create and manage helper profile
-   Select service categories
-   Online/Offline availability
-   Receive nearby requests in real time
-   Accept or reject requests
-   Chat with users
-   Update job status
-   Share location during active jobs
-   View completed jobs
-   View ratings and reviews

### 👨‍💼 Admin

-   Admin dashboard
-   Manage users
-   Manage helpers
-   Verify/suspend helpers
-   Manage categories
-   Monitor active requests
-   Manage reports and complaints
-   Manage reviews
-   View platform statistics

------------------------------------------------------------------------

## ⚡ Real-Time Request Flow

``` text
User creates request
        ↓
System finds nearby available helpers
        ↓
Socket.IO sends real-time notification
        ↓
Helper accepts request
        ↓
User receives instant notification
        ↓
Real-time chat starts
        ↓
Helper updates job status
        ↓
Request completed
        ↓
User gives rating/review
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

------------------------------------------------------------------------

## 🛠️ Tech Stack

  Technology   Purpose
  ------------ --------------------------------
  React.js     Frontend UI
  Node.js      Backend runtime
  Express.js   REST API
  PostgreSQL   Primary database
  Socket.IO    Real-time communication
  Redis        Cache, presence, rate limiting
  JWT          Authentication
  bcrypt       Password hashing
  PostGIS      Location-based queries
  Docker       Containerization
  Nginx        Reverse proxy
  Maps API     Location and map functionality

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
                    │ Load Balancer /  │
                    │      Nginx       │
                    └────────┬─────────┘
                             │
               ┌─────────────┴─────────────┐
               │                           │
       ┌───────▼────────┐        ┌────────▼───────┐
       │  Node/Express  │        │  Node/Express  │
       │    Server 1    │        │    Server 2    │
       └───────┬────────┘        └────────┬───────┘
               │                           │
               └─────────────┬─────────────┘
                             │
                 ┌───────────▼───────────┐
                 │         Redis         │
                 │ Cache / Presence /    │
                 │ Rate Limiting / PubSub│
                 └───────────┬───────────┘
                             │
                 ┌───────────▼───────────┐
                 │      PostgreSQL       │
                 │  Persistent Database  │
                 └───────────────────────┘
```

------------------------------------------------------------------------

## 🗄️ Database Design

Main tables include:

``` text
users
helper_profiles
categories
helper_categories
help_requests
request_status_history
messages
message_reads
notifications
ratings
reports
refresh_tokens
admin_actions
```

PostgreSQL remains the **source of truth** for persistent application
data.

------------------------------------------------------------------------

## 🔥 Real-Time Features

Socket.IO is used for:

``` text
request:new
request:accepted
request:rejected
request:status_changed
request:cancelled

message:send
message:new
message:read

typing:start
typing:stop

helper:online
helper:offline
helper:location_update

notification:new
```

Socket rooms can be organized as:

``` text
user:{userId}
helper:{helperId}
request:{requestId}
conversation:{conversationId}
```

------------------------------------------------------------------------

## 📍 Location Matching

The platform can find available helpers near a user's request based on:

-   Latitude
-   Longitude
-   Service category
-   Availability
-   Search radius

For production-scale geospatial queries, **PostGIS** can be used with
PostgreSQL.

Location data should only be exposed when required and should be
protected through authentication and authorization.

------------------------------------------------------------------------

## 🔐 Security

The application is designed with security in mind:

-   JWT authentication
-   Role-based authorization
-   Password hashing with bcrypt
-   HTTP-only cookies where appropriate
-   Input validation
-   SQL injection protection
-   Rate limiting
-   Secure CORS configuration
-   Helmet/security headers
-   File upload validation
-   File size restrictions
-   Environment variables for secrets
-   HTTPS in production
-   Centralized error handling
-   Protection against duplicate operations
-   No frontend exposure of private secrets

------------------------------------------------------------------------

## ⚙️ Redis Usage

Redis can be used for:

-   Online/offline helper presence
-   Rate limiting
-   Temporary matching information
-   Frequently accessed cache
-   Socket.IO scaling
-   Short-lived application data

Redis is **not** the primary database.

------------------------------------------------------------------------

## 📁 Project Structure

``` text
real-time-community-help/
│
├── client/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── layouts/
│       ├── hooks/
│       ├── services/
│       ├── store/
│       ├── socket/
│       ├── routes/
│       └── utils/
│
├── server/
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       ├── services/
│       ├── sockets/
│       ├── validators/
│       ├── utils/
│       ├── jobs/
│       ├── app.js
│       └── server.js
│
├── docker-compose.yml
├── .env.example
├── README.md
└── package.json
```

------------------------------------------------------------------------

## 🚀 Getting Started

### Prerequisites

Install:

-   Node.js
-   npm
-   PostgreSQL
-   Redis
-   Git
-   Docker (recommended)

### Clone Repository

``` bash
git clone https://github.com/YOUR_USERNAME/real-time-community-help.git

cd real-time-community-help
```

### Install Dependencies

Backend:

``` bash
cd server
npm install
```

Frontend:

``` bash
cd ../client
npm install
```

------------------------------------------------------------------------

## 🔑 Environment Variables

Create `.env` files based on `.env.example`.

Example:

``` env
PORT=5000

DATABASE_URL=postgresql://username:password@localhost:5432/community_help

JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret

REDIS_URL=redis://localhost:6379

CLIENT_URL=http://localhost:5173

MAP_API_KEY=your_map_api_key
```

> Never commit real secrets to GitHub.

------------------------------------------------------------------------

## 🐳 Run With Docker

If Docker configuration is available:

``` bash
docker compose up --build
```

Stop containers:

``` bash
docker compose down
```

------------------------------------------------------------------------

## ▶️ Run Development Servers

Backend:

``` bash
cd server
npm run dev
```

Frontend:

``` bash
cd client
npm run dev
```

Example local URLs:

``` text
Frontend: http://localhost:5173
Backend:  http://localhost:5000
Health:   http://localhost:5000/api/health
```

------------------------------------------------------------------------

## 🔌 Example API Endpoints

### Authentication

``` http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
```

### Help Requests

``` http
POST   /api/requests
GET    /api/requests
GET    /api/requests/:id
PATCH  /api/requests/:id/status
POST   /api/requests/:id/accept
POST   /api/requests/:id/cancel
```

### Helpers

``` http
GET   /api/helpers/nearby
PATCH /api/helpers/availability
```

### Messages

``` http
GET  /api/messages/:conversationId
POST /api/messages
```

### Notifications

``` http
GET   /api/notifications
PATCH /api/notifications/:id/read
```

### Ratings

``` http
POST /api/ratings
```

### Reports

``` http
POST /api/reports
```

------------------------------------------------------------------------

## 🧠 Concurrency Handling

One of the important technical challenges is preventing two helpers from
accepting the same request.

Example:

``` text
Helper A ─────┐
              │
              ▼
        PostgreSQL
        Transaction
              │
       Lock request row
              │
       Check status
              │
       Assign Helper A
              │
            COMMIT

Helper B
   ↓
Checks request
   ↓
Already ACCEPTED
   ↓
Reject acceptance
```

This prevents inconsistent assignments when multiple helpers try to
accept the same request simultaneously.

------------------------------------------------------------------------

## 📊 Production Readiness

Before production deployment, the application should be audited for:

### Security

-   Authentication
-   Authorization
-   Secrets management
-   HTTPS
-   Rate limiting
-   Input validation
-   File security

### Performance

-   PostgreSQL indexes
-   Query optimization
-   Pagination
-   Redis caching
-   Image compression
-   Lazy loading
-   API performance

### SEO

-   Page titles
-   Meta descriptions
-   Open Graph metadata
-   Favicon
-   Sitemap
-   robots.txt
-   Canonical URLs
-   Image alt text

### UX & Accessibility

-   Mobile responsiveness
-   Loading states
-   Empty states
-   Error states
-   Custom 404 page
-   Form validation
-   Accessible forms
-   Keyboard navigation
-   Color contrast

### Monitoring

-   Error logging
-   API monitoring
-   Database monitoring
-   Redis health
-   Server health
-   Socket connection monitoring

------------------------------------------------------------------------

## 🧪 Testing

Recommended test coverage:

``` text
Authentication
Authorization
Help request creation
Helper matching
Concurrent request acceptance
Request status transitions
Real-time chat
Notifications
Ratings
Admin operations
```

For the concurrency scenario, test multiple simultaneous acceptance
requests and verify that only one helper can successfully claim the
request.

------------------------------------------------------------------------

## 📈 Future Improvements

Possible future features:

-   Push notifications
-   Advanced helper matching algorithm
-   Payment integration
-   Background job queues
-   AI-based request categorization
-   Fraud/abuse detection
-   Advanced analytics
-   Multi-language support
-   Service provider verification
-   Customer support system
-   Dedicated mobile application
-   Horizontal scaling for high traffic

------------------------------------------------------------------------

## 🎯 Learning & Interview Value

This project demonstrates practical knowledge of:

-   Full-stack development
-   REST API design
-   PostgreSQL database design
-   Authentication and authorization
-   Real-time systems
-   Socket.IO
-   Redis
-   Concurrency and race conditions
-   Geospatial queries
-   Caching
-   API security
-   Scalable architecture
-   Docker
-   Production deployment
-   Error handling
-   Testing

------------------------------------------------------------------------

## 📌 Project Status

🚧 **Currently under development**

The architecture is designed with production scalability and real-time
functionality in mind. Features should be marked as complete only after
implementation and testing.

------------------------------------------------------------------------

## 👨‍💻 Author

**Your Name**

Built with ❤️ using the PERN stack.

------------------------------------------------------------------------

## 📄 License

This project is licensed under the MIT License.
