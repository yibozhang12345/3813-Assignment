# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend (Angular)
```bash
# Development server
npm start
# or
ng serve --open

# Build for production
npm run build

# Run tests
npm test

# Watch mode for development builds
npm run watch
```

### Backend (Node.js/Express)
```bash
# Start server
cd server
npm install
npm start
# or
node server.js
```

## Architecture Overview

This is a **MEAN stack chat application** (Phase 1 of a larger project) with the following key architectural patterns:

### Project Structure
- **Root directory**: Angular frontend application
- **`/server`**: Node.js/Express backend with Socket.IO
- **`/src/app`**: Angular components, services, and routing
- **Data Storage**: localStorage (Phase 1) - will migrate to MongoDB in Phase 2

### Authentication System
- **AuthService** (`src/app/core/services/auth.service.ts`): Handles login/logout, role checking
- **StorageService** (`src/app/core/services/storage.service.ts`): Manages localStorage operations and seed data
- **AuthGuard** (`src/app/core/guards/auth.guard.ts`): Route protection
- **User roles**: `super`, `groupAdmin`, `user` with hierarchical permissions

### Data Models (`src/app/core/models.ts`)
```typescript
interface User {
  id: string;
  email: string;
  password: string;
  username?: string;
  roles: Role[];
  groups: string[];
}

interface Group {
  id: string;
  name: string;
  ownerId: string;
  adminIds: string[];
  memberIds: string[];
}

interface Channel {
  id: string;
  name: string;
  groupId: string;
  memberIds: string[];
}
```

### Socket.IO Communication
- **Server**: Room-based messaging by channel (`server/server.js:51-113`)
- **Client**: SocketsService manages connection and message broadcasting
- **Events**: `joinChannel`, `leaveChannel`, `newmsg`
- **Message format**: `{ user, roles, text, channelId, ts }`

### Route Structure
- `/login`, `/register`: Public access
- `/plaza`: Main dashboard (public)
- `/chat`: Channel-based chat (auth required)
- `/profile`: User profile management (auth required)
- `/admin/users`, `/admin/groups`: Administrative interfaces (role-based access)

### Key Services Architecture
- **AuthService**: Authentication state and user management
- **StorageService**: Data persistence and seed data management
- **SocketsService**: Real-time messaging via Socket.IO
- **GroupService**: Group and channel management operations

### Development Patterns
- **Service injection**: All services use `{ providedIn: 'root' }`
- **Role-based access**: Components check user roles via `AuthService.isSuper()`, `AuthService.isGroupAdmin()`
- **State management**: localStorage-based with centralized StorageService
- **Error handling**: Service methods throw errors, components catch and display

### Mock API Endpoints (server)
- `POST /api/auth/login`: Simple authentication (password: "123")
- `GET /api/groups`: Returns mock group data

### Testing
- **Framework**: Jasmine/Karma (Angular default)
- **Test files**: `*.spec.ts` pattern
- **Config**: `karma.conf.js`, `tsconfig.spec.json`

### Development Notes
- Server runs on port 3000, frontend on port 4200
- CORS configured for cross-origin requests
- Socket.IO configured with room-based message distribution
- Prettier configured with 100-character line width and single quotes
- Chinese comments indicate this is likely a university assignment project

### Phase 1 vs Phase 2
- **Phase 1**: localStorage, mock authentication, Socket.IO placeholder
- **Phase 2**: MongoDB integration, PeerJS video chat, production deployment