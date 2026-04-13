<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react" />
  <img src="https://img.shields.io/badge/Firebase-12.11-FFCA28?style=for-the-badge&logo=firebase" />
  <img src="https://img.shields.io/badge/Gemini_AI-2.5_Flash-4285F4?style=for-the-badge&logo=google" />
  <img src="https://img.shields.io/badge/Leaflet-1.9-199900?style=for-the-badge&logo=leaflet" />
  <img src="https://img.shields.io/badge/Cloud_Run-Deployed-4285F4?style=for-the-badge&logo=googlecloud" />
</p>

# 🏟️ VenueIQ — AI-Powered Venue Intelligence Platform

**VenueIQ** is a real-time, AI-driven crowd management and venue intelligence platform built for event organizers, venue staff, and attendees. It transforms how large-scale events are managed — from stadiums and concert halls to auditoriums — by combining **Google Gemini AI**, **Firebase real-time database**, **interactive SVG venue maps**, and **Leaflet-powered geolocation** into a single, unified experience.

> **Think of it as Google Maps meets a live event control room — powered by AI.**

---

## 🎯 Problem Statement

Managing large-scale venues (50,000+ capacity) involves critical real-time decisions: Which gates are overcrowded? Where should staff be deployed? How long are food queues? Is there a medical emergency?

Traditional systems rely on static plans and manual walkie-talkie coordination. **VenueIQ replaces this with an intelligent, real-time digital twin of any venue.**

---

## ✨ Key Features

### 🤖 AI-Powered Venue Generation (Gemini 2.5 Flash)
- Enter any real venue name (e.g., *"Eden Gardens Kolkata"*, *"Wankhede Stadium Mumbai"*) and Gemini AI automatically generates the complete venue architecture
- AI searches its knowledge for **real gate names, actual capacity, zone layouts, and seating configurations**
- Generates structured JSON with gates, zones, food stalls, restrooms, and emergency exits
- Produces **Mermaid.js flow diagrams** showing gate → zone → facility routing
- Graceful fallback system when AI is unavailable — detects venue type from name keywords

### 🗺️ Dynamic SVG Venue Maps
- Real-time animated venue maps rendered with SVG + Framer Motion
- Live color-coded gate indicators: 🟢 Low | 🟡 Medium | 🔴 High crowd density
- Animated zone heat pulsation showing crowd distribution
- Template system supporting **4 venue types**: Stadium, Auditorium, Concert, Arena
- Each template defines precise SVG coordinates for gates, zones, and center areas

### 📍 Live Navigation & Geolocation (Leaflet + OSRM)
- Interactive Leaflet map with automatic venue geocoding via **OpenStreetMap Nominatim**
- Real-time GPS tracking of the user's location
- Turn-by-turn driving/walking route calculation via **OSRM** (Open Source Routing Machine)
- Displays ETA, distance, and optimal route polyline on the map
- Dual travel modes: 🚗 Driving and 🚶 Walking

### 📊 Real-Time Analytics Dashboard
- Live venue statistics: total check-ins, zone occupancy, gate throughput
- **Custom wait-time prediction algorithm**: `waitTime = (queueLength × avgServiceTime) / activeCounters`
- Crowd density classification system with automatic status thresholds
- Animated stat cards with trend indicators (↑ rising, ↓ falling)
- Real-time Firestore snapshot listeners — zero polling, instant updates

### 🚨 SOS Emergency Alert System
- One-tap emergency reporting from the attendee dashboard
- Categorized alert types: 🏥 Medical | 🔥 Fire | 👶 Lost Child | 🛡️ Security
- Alerts instantly pushed to host dashboard via Firestore real-time listeners
- Host can view, acknowledge, and resolve alerts with timestamped tracking

### 🍔 Food & Beverage Queue Management
- Real-time food stall monitoring with queue length and wait times
- **Counter Portal** for stall staff — manage orders through status flow:
  `Queued → Preparing → Ready → Collected`
- Attendees can place orders directly from the dashboard
- Live order tracking with animated status transitions

### 🎟️ Ticket-Based Event Access
- Hosts generate unique event codes for attendee access
- Attendees browse events, enter ticket codes, and join event dashboards
- Access control enforced at the Firestore level — no unauthorized dashboard views

### ♿ Accessibility Mode
- Toggle for high-contrast, accessibility-optimized interface
- Affects venue maps, status indicators, and navigation elements

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Client (Next.js 16)                │
│  ┌──────────┬──────────┬──────────┬──────────────┐   │
│  │ Landing  │  Events  │Dashboard │   Host Panel  │   │
│  │  Page    │ Browser  │  (Fan)   │   (Organizer) │   │
│  └────┬─────┴────┬─────┴────┬─────┴──────┬────────┘   │
│       │          │          │            │            │
│  ┌────▼──────────▼──────────▼────────────▼────────┐  │
│  │              Service Layer                      │  │
│  │  eventService │ checkinService │ geminiService   │  │
│  │  firestoreService │ venueTemplates              │  │
│  └────────────────────┬───────────────────────────┘  │
└───────────────────────┼──────────────────────────────┘
                        │
         ┌──────────────┼──────────────┐
         ▼              ▼              ▼
   ┌──────────┐  ┌────────────┐  ┌──────────┐
   │ Firebase │  │ Gemini AI  │  │ Leaflet  │
   │Firestore │  │  2.5 Flash │  │ + OSRM   │
   │  + Auth  │  │  REST API  │  │ + OSM    │
   └──────────┘  └────────────┘  └──────────┘
```

### Firestore Data Model

```
events/{eventId}
  ├── metadata (eventName, venueName, hostId, template, ticketCode, ...)
  ├── gates/{gateId}        → { name, crowd, capacity, status }
  ├── zones/{zoneId}        → { name, currentAttendees, capacity }
  ├── stalls/{stallId}      → { name, type, queueLength, waitTime }
  ├── alerts/{alertId}      → { type, message, userId, timestamp, resolved }
  ├── checkins/{checkinId}  → { userId, gateId, timestamp }
  ├── orders/{orderId}      → { stallId, items, status, userId }
  └── stats/live            → { totalCheckins, totalCapacity, ... }
```

---

## 🧭 Application Routes

| Route | Role | Description |
|-------|------|-------------|
| `/` | Public | Animated landing page with SVG stadium visualization |
| `/auth` | Public | Authentication (Email/Password + Google OAuth) with role selection |
| `/events` | Fan | Browse and search live events, join with ticket codes |
| `/dashboard?eventId=` | Fan | Real-time venue dashboard with maps, gates, queues, SOS |
| `/host` | Host | Event creation wizard, AI venue generation, event management |
| `/counter?eventId=&stallId=` | Staff | Food stall order management portal |

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 16.2 (App Router) | Server components, routing, SSR |
| **UI Library** | React 19.2 | Component architecture |
| **Animations** | Framer Motion 12.38 | Page transitions, SVG animations, micro-interactions |
| **Icons** | Lucide React 1.7 | Enterprise-grade icon system |
| **Typography** | Plus Jakarta Sans (Google Fonts) | Professional, modern typeface |
| **Authentication** | Firebase Auth | Email/Password + Google OAuth |
| **Database** | Cloud Firestore | Real-time NoSQL with snapshot listeners |
| **AI Engine** | Google Gemini 2.5 Flash / 2.0 Flash | Venue architecture generation |
| **Maps** | Leaflet 1.9 + React-Leaflet 5.0 | Interactive geolocation maps |
| **Geocoding** | OpenStreetMap Nominatim | Free venue address resolution |
| **Routing** | OSRM (Open Source Routing Machine) | Driving/walking route calculation |
| **Diagrams** | Mermaid.js 11.14 | AI-generated venue flow diagrams |
| **Deployment** | Google Cloud Run | Containerized production hosting |
| **Containerization** | Docker (Node 20 Alpine) | Multi-stage production builds |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 20.9.0
- **npm** ≥ 10.x
- A **Firebase** project with Auth + Firestore enabled
- A **Google Gemini API** key ([Get one free](https://aistudio.google.com/apikey))

### Installation

```bash
# Clone the repository
git clone https://github.com/NayanPal01/PromptWar.git
cd PromptWar/venueiq

# Install dependencies
npm install
```

### Environment Setup

Create a `.env.local` file in the `venueiq/` directory:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the platform.

### Production Build

```bash
npm run build
npm start
```

---

## 🐳 Docker Deployment

### Build Locally

```bash
docker build -t venueiq .
docker run -p 80:80 venueiq
```

### Deploy to Google Cloud Run

```bash
# Authenticate
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Deploy
gcloud run deploy venueiq-app \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

---

## 📱 Responsive Design

VenueIQ is fully responsive across all device sizes:

- **Desktop** (1200px+) — Full sidebar navigation, multi-column layouts
- **Tablet** (768px–1199px) — Collapsible sidebar, adapted grid
- **Mobile** (320px–767px) — Bottom navigation, stacked layouts, touch-optimized controls

Key responsive techniques:
- CSS Grid with `minmax()` for fluid bento layouts
- Collapsible sidebar with overlay on mobile (z-index: 1050)
- Font scaling with `clamp()` for readable text at all sizes
- Touch-friendly tap targets (≥44px) on all interactive elements

---

## 🧪 Custom Algorithms

### Wait Time Prediction
```javascript
waitTime = (queueLength × avgServiceTime) / activeCounters
```
Predicts food stall wait times based on current queue depth, average service duration, and active counter count.

### Crowd Density Classification
```javascript
if (level < 0.4) → "Low"    (Green)
if (level < 0.7) → "Medium" (Yellow)
else             → "High"   (Red)
```
Classifies gate and zone congestion into actionable color-coded tiers.

### AI Model Fallback Chain
```javascript
Models: ["gemini-2.5-flash", "gemini-2.0-flash"]
```
Sequentially attempts the latest Gemini model first, automatically falling back to older stable models if rate-limited or unavailable. If all AI models fail, a keyword-based heuristic fallback generates venue configurations locally.

---

## 📂 Project Structure

```
venueiq/
├── src/
│   ├── app/
│   │   ├── page.js                # Landing page (animated SVG hero)
│   │   ├── page.module.css        # Landing page styles
│   │   ├── globals.css            # Global design tokens
│   │   ├── layout.js              # Root layout + font config
│   │   ├── auth/                  # Authentication (login/signup/OAuth)
│   │   ├── events/                # Event browser + ticket join
│   │   ├── dashboard/             # Fan dashboard (real-time venue view)
│   │   ├── host/                  # Host panel (AI event creation)
│   │   └── counter/               # Staff counter portal (order mgmt)
│   ├── components/
│   │   ├── LiveMapImpl.js         # Leaflet map + OSRM routing
│   │   └── VenueDiagram.js        # Mermaid.js venue flow diagram
│   ├── context/
│   │   └── AuthContext.js         # Firebase auth context provider
│   └── lib/
│       ├── firebase.js            # Firebase app initialization
│       ├── eventService.js        # Event CRUD + real-time listeners
│       ├── checkinService.js      # Gate check-in + crowd tracking
│       ├── firestoreService.js    # Generic Firestore utilities
│       ├── geminiService.js       # Gemini AI venue generation
│       ├── venueTemplates.js      # SVG venue template definitions
│       └── seedFirestore.mjs      # Database seeding script
├── Dockerfile                     # Multi-stage production container
├── .dockerignore
├── .gcloudignore
├── next.config.mjs                # Next.js config (standalone output)
└── package.json
```

---

## 👥 User Roles

| Role | Access | Capabilities |
|------|--------|-------------|
| **Fan / Attendee** | `/events`, `/dashboard` | Browse events, join with ticket code, view live venue map, check-in at gates, place food orders, send SOS alerts, navigate to venue |
| **Host / Organizer** | `/host` | Create events with AI, manage gates/stalls, view live attendee list, resolve emergency alerts, delete events |
| **Staff / Counter** | `/counter` | Manage food orders (queued → preparing → ready → collected), view stall-specific queue |

---

## 🔒 Security

- Firebase Authentication with role-based access control
- Environment variables for all API keys (never hardcoded in source)
- Firestore security rules enforce event-scoped data access
- Ticket code verification before granting dashboard access
- Google OAuth integration for secure single sign-on

---

## 🙏 Acknowledgments

- **Google Gemini AI** — Venue architecture intelligence
- **Firebase** — Real-time database and authentication
- **OpenStreetMap & OSRM** — Free geocoding and routing
- **Leaflet** — Interactive mapping
- **Framer Motion** — Fluid animations
- **Lucide** — Beautiful open-source icons

---

<p align="center">
  Built with ❤️ for smarter, safer venues.
</p>
