# CampusConnect

CampusConnect is a student-focused platform that helps students find people to learn, build, compete, and play with. Sometimes students want to practice DSA, study for an exam, work on a project, participate in a hackathon, or play a sport, but they don't know anyone who is looking for the same thing. 

CampusConnect solves this by letting students create requests and discover other students who are looking for the same activity.

## Features

- **User Authentication:** Simple and secure signup/login using JWT and bcrypt.
- **User Profiles:** Customize your profile with skills, interests, availability, and college details.
- **Partner Requests:** Create, view, update, and delete partner requests across categories like Learning, Building, Sports, and Other.
- **Discover:** Browse and search for partner requests based on activity, skill level, and category.
- **Connections:** Send and receive connection requests. Connect with students to form teams or study groups.
- **Dashboard:** Personalized dashboard to quickly view relevant requests and activity categories.
- **Modern UI:** Built with React and a custom dark-mode inspired glassmorphism design system.

## Tech Stack

**Frontend:**
- React (Vite)
- React Router
- Axios
- Vanilla CSS

**Backend:**
- Node.js
- Express.js
- MongoDB & Mongoose
- JSON Web Tokens (JWT)
- Bcrypt

## Project Structure

```
campusconnect/
│
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components (Home, Login, Dashboard, etc.)
│   │   ├── services/       # API integration
│   │   ├── context/        # React Context (Auth)
│   │   ├── App.jsx         # Main router
│   │   └── index.css       # Global design system
│   └── package.json
│
├── server/                 # Express backend
│   ├── config/             # Database configuration
│   ├── controllers/        # Request handlers
│   ├── middleware/         # Custom middlewares (e.g., auth)
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API routes
│   ├── server.js           # Entry point
│   └── package.json
│
├── .env.example            # Example environment variables
├── .gitignore
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account (or local MongoDB)

### 1. Backend Setup

1. Navigate to the `server` directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `server` directory and configure your environment variables (see `.env.example`).
   ```env
   NODE_ENV=development
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

### 2. Frontend Setup

1. Navigate to the `client` directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

## API Overview

- **Auth:**
  - `POST /api/auth/signup` - Register a new user
  - `POST /api/auth/login` - Authenticate a user
  - `GET /api/auth/me` - Get current user
- **Users:**
  - `GET /api/users/:id` - Get user profile
  - `PUT /api/users/profile` - Update user profile
- **Requests:**
  - `GET /api/requests` - Browse requests
  - `POST /api/requests` - Create a request
  - `GET /api/requests/:id` - Get request details
  - `PUT /api/requests/:id` - Update a request
  - `DELETE /api/requests/:id` - Delete a request
- **Connections:**
  - `POST /api/connections` - Send a connection request
  - `GET /api/connections` - Get all accepted connections
  - `GET /api/connections/received` - Get pending connection requests
  - `PUT /api/connections/:id` - Accept/reject connection request

## Roadmap & Future Improvements
- [ ] Implement advanced AI matching scoring system (Currently uses simple filtering).
- [ ] Add an in-app real-time messaging system for connected users using Socket.io.
- [ ] Implement pagination for partner requests.
- [ ] Add email verification (if requested in the future).
- [ ] Expand profile customization with avatars and social links.
