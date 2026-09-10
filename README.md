# ⚡ Pulse — Real-Time Social Platform

A modern, high-performance full-stack social networking platform engineered with **Express 5**, **TypeScript**, **Prisma ORM**, **PostgreSQL**, **Redis caching**, **Socket.IO** real-time events, and a reactive **React 19 / Vite** client.

---

## ✨ Features

- **⚡ Real-Time Live Feed**: Instant post synchronization and live event propagation across connected clients with Socket.IO.
- **💬 Interactive Threads & Replies**: Nested discussions, multi-image upload support with preview, and optimistic state updates.
- **❤️ Real-Time Likes & Bookmarking**: Instant optimistic like toggling backed by Redis and persistent database records.
- **👥 Social Graph**: Follow/unfollow creators, dedicated follower & following views, and personalized account recommendations.
- **🔍 Fast Discovery**: Search users, explore profiles, and discover trending community members.
- **🔐 Secure Authentication**: JWT session authentication stored securely in cookies, route guards, and password hashing via bcrypt.
- **📸 Media Cloud Pipeline**: Seamless media processing and asset storage powered by Multer and Cloudinary.
- **📚 Interactive OpenAPI/Swagger**: Fully documented endpoints testable directly from the interactive docs dashboard.

---

## 🛠️ Tech Stack

### Backend (`pulse-api`)
- **Runtime & Language**: Node.js 18+ & TypeScript 5
- **Framework**: Express 5
- **Database & ORM**: PostgreSQL via Prisma ORM 6
- **Cache & Message Broker**: Redis 5
- **Real-Time Engine**: Socket.IO 4
- **Security & Auth**: JWT (`jsonwebtoken`) & bcrypt
- **File Handling**: Cloudinary API & Multer
- **Validation**: Joi
- **Documentation**: Swagger UI & OpenAPI 3.0

### Frontend (`pulse-web`)
- **Framework**: React 19 + TypeScript + Vite 7
- **State Management**: Redux Toolkit & React-Redux
- **Routing**: React Router 7
- **Styling**: Tailwind CSS + Radix UI Primitives + Lucide Icons
- **HTTP & Real-Time**: Axios + Socket.IO Client
- **Feedback & Notifications**: Sonner Toasts

---

## 📁 Repository Structure

```
pulse/
├── backend/                  # RESTful API & WebSocket engine
│   ├── src/
│   │   ├── config/           # Cloudinary & third-party configs
│   │   ├── controllers/      # Request handlers & logic
│   │   ├── lib/              # Redis client & caching utilities
│   │   ├── middleware/       # JWT auth & error middlewares
│   │   ├── prisma/           # Database client instance
│   │   ├── routes/           # Versioned API routes (/api/v1)
│   │   ├── services/         # Domain business logic
│   │   ├── types/            # TypeScript definitions
│   │   ├── utils/            # JWT & response helpers
│   │   ├── validation/       # Joi request validation schemas
│   │   ├── app.ts            # Express application setup
│   │   └── server.ts         # Server bootstrap & socket listener
│   └── prisma/schema.prisma  # Prisma data models & migrations
├── frontend/                 # Reactive client application
│   └── src/
│       ├── components/       # UI elements, navigation, threads
│       ├── helpers/          # UI helpers & layout utilities
│       ├── hooks/            # Custom React hooks
│       ├── lib/              # API clients, socket, toast config
│       ├── pages/            # View routes (Home, Profile, Search, Auth)
│       ├── services/         # API service calls
│       └── store/            # Redux Toolkit slices & store
└── docker-compose.yml        # PostgreSQL & Redis infrastructure
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Node.js** v18 or later
- **npm** v9 or later
- **Docker & Docker Compose** (or local PostgreSQL & Redis)

### 2. Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Environment Configuration

Copy the example environment files:

```bash
# Backend configuration
cp backend/.env.example backend/.env

# Frontend configuration
cp frontend/.env.example frontend/.env
```

Key environment variables in `backend/.env`:
```ini
PORT=9000
BACKEND_URL=http://localhost:9000
FRONTEND_URL=http://localhost:5173
DATABASE_URL="postgresql://postgres:root@localhost:5432/pulse_db"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your_secure_random_jwt_secret"
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
```

### 4. Start Infrastructure (Docker)

Launch PostgreSQL and Redis containers with Docker Compose:

```bash
docker-compose up -d db redis
```

### 5. Run Database Migrations

Apply database schema migrations and generate the Prisma Client:

```bash
cd backend
npx prisma migrate dev
```

### 6. Start Development Servers

Run both servers in separate terminal sessions:

```bash
# Terminal 1: Backend API (http://localhost:9000)
cd backend
npm run dev

# Terminal 2: Frontend Client (http://localhost:5173)
cd frontend
npm run dev
```

---

## 📖 API Documentation & Endpoints

When the backend is running, open your browser to view the interactive Swagger documentation:

- **Swagger UI**: [http://localhost:9000/docs](http://localhost:9000/docs)
- **Health Check**: [http://localhost:9000/health](http://localhost:9000/health)
- **API Base**: `http://localhost:9000/api/v1`

---

## 📜 License

This project is licensed under the MIT License.
