# Diba Restaurant Reservation System

A production-ready restaurant reservation system built with a focus on kiosk-first staff operations and a premium guest experience.

## 🚀 Features

### For Staff (Kiosk/Tablet)
- **Fast Reservation Entry**: optimized for touchscreen usage with minimal typing.
- **Inactivity Guard**: Automatic reset for privacy in shared kiosk environments.
- **Conflict Management**: One-tap options to resolve overlapping bookings.

### For Admins
- **Live Floor View**: Real-time occupancy tracking with detailed statuses (Occupied, Reserved, Checked-In).
- **Prompt System**: Smart alerts for late arrivals (15m past start) with manual email triggers.
- **Audit Logs**: Full auditable history of table reassignments, manual frees, and cancellations.
- **Table Management**: Reassign reservations or free tables immediately.

### For Guests
- **Web Booking**: Premium, mobile-responsive reservation flow.
- **Visual Floor Selection**: Choose specific tables based on real-time availability.
- **Manage Booking**: View, modify (via phone), or cancel reservations via a secure unique link.
- **Automated Emails**: Confirmation, reminders, and late arrival warnings.

## 🛠️ Tech Stack

### Backend
- **Node.js + Express**: Core API.
- **TypeScript**: Type safety across the stack.
- **Prisma**: Database ORM (PostgreSQL).
- **Redis + Redlock**: Distributed locking to prevent double-bookings.
- **Stripe**: Payment processing for large party deposits (Phase 4).

### Frontend
- **React + Vite**: Fast, modern frontend.
- **TailwindCSS**: Premium UI with custom layout for kiosk vs guest views.
- **TanStack Query**: Robust server state management.
- **Lucide Icons**: Modern iconography.

## 📦 Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL
- Redis

### Installation
1. Clone the repository.
2. Install dependencies for both backend and frontend:
   ```bash
   npm install
   cd frontend && npm install
   ```
3. Set up your environment variables (`.env` in root):
   ```env
   DATABASE_URL="postgresql://..."
   REDIS_URL="redis://..."
   ADMIN_PIN="1234"
   STRIPE_SECRET_KEY="..."
   STRIPE_WEBHOOK_SECRET="..."
   FRONTEND_URL="http://localhost:5173"
   ```
4. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```
5. Start the development servers:
   ```bash
   # In root (Backend)
   npm run dev
   
   # In frontend/
   npm run dev
   ```

## 🏗️ Architecture
The system follows a strict **Source of Truth** model where the backend handles all availability logic and table assignments. The frontend is a purely visual layer that adapts its view based on user roles (Admin vs Guest).

---
*Built with ❤️ for Diba Restaurant.*
