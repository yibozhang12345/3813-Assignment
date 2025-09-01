# 3813ICT Assignment – Phase 1

> Due: 8am Wed 3 Sept 2025  
> MEAN + socket.io (+ PeerJS for Phase 2)

## 1. Repository Organization
- Root directory is the Angular (client) application
  - `/src/app`: Angular components, services, routes
- `/server`: Node/Express backend (Phase 1: mock/placeholder)
- Branching model: `main` + `feat/*` (UI, auth-local, groups-channels, etc.)
- Frequent commits and PR-based merges.

## 2. Data Structures
### User
```ts
type Role = 'super' | 'groupAdmin' | 'user';
interface User { id:string; username:string; email:string; roles:Role[]; groups:string[]; }
```

### Group
```ts
interface Group { id:string; name:string; ownerId:string; adminIds:string[]; memberIds:string[]; }
```
### Channel
```ts
interface Channel { id:string; name:string; groupId:string; bannedUserIds?:string[]; }
```

## 3. Project Overview
This project is a text/video chat system built using the MEAN stack.
Phase 1 focuses on planning, documentation, and basic implementation (user management, groups, channels, login system).
Data is stored in browser localStorage (MongoDB will be added in Phase 2).

## 4. Frontend Routes
/login
/dashboard
/groups
/groups/:id/channels
/profile
/admin

## 5. Client–Server Interaction
Frontend AuthService handles login/logout, stores user in localStorage.
Server provides placeholder routes (e.g., POST /api/auth/login) returning mock data.
Socket.io client is included but only as a placeholder (chat will be Phase 2).

## 6. Git Workflow
Feature branches per module, frequent commits.
PR workflow: merge into main after review/testing.

## 7. How to Run
# server
```bash
cd server
npm install
node server.js
```
# angular
# already in root directory (assignment-phase1)
```bash
npm install
ng serve --open
```
## 8. Definition of Done (Phase 1) 
All pages navigable via routes
Users/Groups/Channels stored in localStorage
Role-based view differences visible (Super Admin / Group Admin / User)
Socket.io placeholder integrated

## 9.Notes for Phase 2
Replace localStorage with MongoDB
Implement real chat via socket.io, history, image/video (PeerJS), SSL/ELF hosting.