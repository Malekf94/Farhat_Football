# Farhat Football ⚽

A full-stack football session management platform built to automate and improve the organisation of weekly football games.

## Overview

Farhat Football was created to streamline the process of organising football sessions that were previously managed manually through WhatsApp and spreadsheets.

The platform manages:

- Player registrations
- Match creation
- Team balancing
- Attendance tracking
- Player statistics
- Payments
- Match history
- Recorded games and highlights

This project is based on real football sessions that have been running since 2019, involving nearly 200 players across multiple weekly games.

---

# Features

## 👥 Player Management

- Create and manage player profiles
- Store player attributes and skill ratings
- Track attendance and availability
- Preferred names and player history

## ⚽ Match Management

- Create football sessions and matches
- Add/remove players from matches
- Track teams and results
- Store match statistics

## 🧠 Team Balancing System

- Automatically generate balanced teams
- Uses player attributes and ratings
- Evenly distributes skill levels across teams

## 📊 Statistics Tracking

Track detailed player stats including:

- Goals
- Assists
- Defensive contributions
- Wins/losses
- Match appearances

## 💳 Payment Tracking

- Record player payments
- Track outstanding balances
- Session payment history

## 🎥 Media Integration

- Store YouTube links for recorded games
- Match footage integration

## 🔐 Authentication

- Auth0-issued JWT access tokens, verified server-side
- Admin routes guarded on the server, not just in the UI
- Secure API access

---

# Tech Stack

## Frontend

- React
- React Router
- CSS

## Backend

- Node.js
- Express.js

## Database

- PostgreSQL

## Other Tools

- Auth0 (`express-oauth2-jwt-bearer`)
- Vite
- Axios
- REST API Architecture

---

# Project Structure

Both tiers live in **one** npm package, `farhat_football_app/`. There is no manifest at the
repo root, and no separate `client/`, `server/` or `database/` directory.

```bash
Farhat_Football/
│
├── farhat_football_app/    # the only npm package — install and run from here
│   ├── src/                # React frontend (one folder per page under src/Pages/)
│   ├── Apis/               # Express API, CommonJS .cjs (routes → controller → queries)
│   ├── tests/              # Vitest unit and integration suites
│   ├── server.cjs          # Express entry point
│   ├── db.cjs              # shared pg pool
│   └── SETUP.md            # authoritative setup and deploy guide
│
├── schema.sql              # hand-maintained database schema
├── add_indexes.sql         # re-runnable index definitions
├── payment_balance_trigger.sql
└── readme.md
```

---

# Installation

**`farhat_football_app/SETUP.md` is the authoritative setup guide** — it covers the Auth0
dev application and database schema steps this summary leaves out.

## 1. Clone the repository

```bash
git clone https://github.com/Malekf94/Farhat_Football.git
```

## 2. Install (one package, one install)

```bash
cd Farhat_Football/farhat_football_app
npm install
```

---

# Environment Variables

Create `.env` inside `farhat_football_app/` by copying the template, then fill it in with
your own development values:

```bash
cp .env.example .env
```

`.env.example` lists every variable the app reads. Never commit a filled-in `.env` — the
production values live in the hosting dashboard.

---

# Running the Application

One command starts the API and the frontend together:

```bash
cd farhat_football_app
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3000

---

# Future Plans

- AI-powered stat tracking from recorded matches
- Automated highlight generation
- Player accounts and dashboards
- Advanced analytics
- League/table system
- Mobile optimisation
- Real-time match updates

---

# Motivation

This project started as a way to solve a real-world problem:

Managing football sessions manually became difficult as the community grew. Farhat Football was built to centralise everything into one platform while improving competitiveness, organisation, and the overall player experience.

---

# Screenshots

TBC

# Contributing

Contributions, suggestions, and feedback are welcome.

Feel free to fork the project and submit a pull request.

---

# License

This project is currently for personal/community use.
