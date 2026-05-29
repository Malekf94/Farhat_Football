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

- JWT-based authentication
- Protected admin routes
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

- JWT Authentication
- Axios
- REST API Architecture

---

# Project Structure

```bash
Farhat_Football/
│
├── client/         # React frontend
├── server/         # Express backend
├── database/       # SQL/database files
└── README.md
```

---

# Installation

## 1. Clone the repository

```bash
git clone https://github.com/Malekf94/Farhat_Football.git
```

## 2. Navigate into the project

```bash
cd Farhat_Football
```

## 3. Install dependencies

### Frontend

```bash
cd client
npm install
```

### Backend

```bash
cd ../server
npm install
```

---

# Environment Variables

Create a `.env` file inside the server directory.

Example:

```env
PORT=5000
DATABASE_URL=your_database_url
JWT_SECRET=your_secret_key
```

---

# Running the Application

## Start Backend

```bash
cd server
npm start
```

## Start Frontend

```bash
cd client
npm run dev
```

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

_Add screenshots of your app here_

Example:

- Dashboard
- Match page
- Team balancing screen
- Player statistics page

---

# Contributing

Contributions, suggestions, and feedback are welcome.

Feel free to fork the project and submit a pull request.

---

# License

This project is currently for personal/community use.
