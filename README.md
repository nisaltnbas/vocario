# Vocario - Real-Time Communication Platform

A modern real-time voice, video, and text communication platform built with Next.js, WebRTC, and Socket.io.

## Features

- 🔐 Secure Authentication
- 💬 Real-time Text Chat
- 🎤 Voice Channels
- 📹 Video Rooms
- 🖥️ Screen Sharing
- 👥 User Presence & Status
- 📱 Responsive Design

## Tech Stack

### Frontend
- Next.js 14 (React)
- TypeScript
- Tailwind CSS
- ShadcN UI
- Socket.io Client
- WebRTC

### Backend
- NestJS
- Socket.io
- PostgreSQL
- Prisma ORM
- Redis
- WebRTC

### Infrastructure
- Vercel (Frontend Hosting)
- Railway (Backend Hosting)
- Supabase (Authentication & Database)

## Project Structure

```
vocario/
├── apps/
│   ├── web/           # Next.js frontend application
│   └── server/        # NestJS backend application
├── packages/
│   ├── database/      # Database schema and migrations
│   └── shared/        # Shared types and utilities
└── docker/            # Docker configuration for local development
```

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm (Package Manager)
- Docker & Docker Compose
- PostgreSQL
- Redis

### Development Setup

1. Clone the repository
```bash
git clone https://github.com/yourusername/vocario.git
cd vocario
```

2. Install dependencies
```bash
pnpm install
```

3. Set up environment variables
```bash
cp apps/web/.env.example apps/web/.env
cp apps/server/.env.example apps/server/.env
```

4. Start the development environment
```bash
# Start the database and Redis
docker-compose up -d

# Start the development servers
pnpm dev
```

5. Open http://localhost:3000 in your browser

## Architecture

### Authentication Flow
- Supabase Authentication for user management
- JWT tokens for API authentication
- Redis for session management

### Real-Time Communication
- WebRTC for peer-to-peer voice/video communication
- Socket.io for signaling and real-time updates
- Redis pub/sub for horizontal scaling

### Database Schema
- Users
- Channels
- Rooms
- Messages
- Presence
- Permissions

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
