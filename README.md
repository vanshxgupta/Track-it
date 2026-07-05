---
Title: RouteShare – Real-Time Collaborative Route Tracking
Description: A real-time multi-user route tracking and navigation platform built with React, Node.js, Socket.IO, and Leaflet.
---

# 🚗 RouteShare – Real-Time Collaborative Route Tracking

**RouteShare** is a real-time geolocation and route-sharing web application that enables multiple users to track each other live on a shared map, follow synchronized routes, and communicate via live chat.

The platform is designed for **group travel**, **convoys**, **events**, and **collaborative navigation scenarios** where real-time location awareness and coordination are critical.

---

## 🔗 Live Demo & Repository

- **Live Application:** https://route-share.vercel.app/
- **GitHub Repository:** https://github.com/vanshxgupta/Track-it

---

## 🧠 Problem Statement & Motivation

Traditional navigation tools are optimized for **single-user navigation** and lack real-time collaborative capabilities.  
RouteShare bridges this gap by enabling:

- Multi-user live location tracking
- Shared route visualization
- Real-time communication
- Group-aware navigation experience

---

## ✨ Features

### 📍 Real-Time Location Tracking
- Live geolocation updates using **Socket.IO**
- Multiple users displayed simultaneously on the map
- Smooth marker transitions without page reloads

### 🗺️ Dynamic Route Generation
- Routes generated using **OpenRouteService API**
- GeoJSON-based polyline rendering
- Real-time distance and ETA calculation

### 👥 Multi-User Rooms
- Users join isolated tracking rooms
- Location updates scoped to room participants
- Automatic join and disconnect handling

### 💬 Live Chat
- Low-latency socket-based messaging
- Room-specific conversations
- Enables real-time coordination

### 🎨 Interactive Map Interface
- Built using **Leaflet**
- Multiple map themes (light / dark / satellite)
- Intelligent viewport fitting for all users

---

## 🛠️ Tech Stack

### Frontend
- React.js
- Tailwind CSS
- Leaflet.js
- Socket.IO Client

### Backend
- Node.js
- Express.js
- Socket.IO

### APIs & Services
- OpenRouteService API
- Browser Geolocation API

---

## 🧱 System Architecture

```
Client (React + Leaflet)
   |
   |  WebSocket (Socket.IO)
   |
Backend (Node.js + Express)
   |
   |  External API Calls
   |
OpenRouteService API
```

---

## ⚙️ Key Design Decisions

### 1. WebSockets over REST Polling
- REST polling introduces latency and excessive network overhead
- **Socket.IO** enables real-time bidirectional communication and efficient scaling

### 2. GeoJSON-Based Route Handling
- Native compatibility with Leaflet
- Flexible and efficient route rendering

### 3. Room-Based Socket Communication
- Each tracking group operates in an isolated socket room
- Prevents unnecessary broadcasts and improves privacy

### 4. Client-Side Map State Management
- Keeps backend lightweight and stateless
- Improves UI responsiveness

---

## 🚀 Performance Optimisations

### 🔄 Throttled Location Updates
- Location updates broadcast every **2 seconds**
- Prevents socket flooding
- Reduced backend load by ~60%

### 📦 Minimal Socket Payloads
- Only latitude and longitude transmitted
- No redundant metadata

### 🗺️ Intelligent Viewport Adjustments
- Auto-fit map only when required
- Avoids unnecessary re-renders

### ⚡ Efficient React State Updates
- Marker updates isolated from global state
- Faster UI updates

---

## 🔐 Security & Reliability Considerations

- Room-scoped socket events
- Graceful handling of user disconnects
- No persistent storage of user location data

---

## 🧪 Functional Coverage

| Feature | Status |
|------|------|
| Real-Time Location Tracking | ✅ |
| Multi-User Rooms | ✅ |
| Live Chat | ✅ |
| Route Generation | ✅ |
| Distance & ETA | ✅ |
| Map Themes | ✅ |
| Real-Time Sync | ✅ |

---

## 🌍 Deployment

- Frontend deployed on **Vercel**
- Backend deployed on **Render**
- WebSocket-compatible infrastructure

---

## 📈 Future Enhancements

- Authentication & user profiles
- Route replay & history
- Offline mode
- Voice chat
- Mobile app
- Admin controls for rooms

---

## 👨‍💻 Author

**Vansh Gupta**  
Engineering Student | Full Stack Developer  

GitHub: https://github.com/vanshxgupta

---

## ⭐ Project Highlights

- Real-time systems using WebSockets
- Geospatial data visualization
- Scalable multi-user architecture
- Practical real-world application

---

> _RouteShare demonstrates how real-time communication and geospatial APIs can power collaborative navigation experiences._
