# Chat Application - Implementation Documentation

## Git Repository Organization and Version Control

### Repository Structure
The project is organized as a monorepo containing both client-side (Angular) and server-side (Node.js) applications:

```
3813-Assignment/
├── client/              # Angular frontend application
├── server/              # Node.js backend application
├── docker-compose.yml   # Docker configuration for MongoDB
├── init-mongo.js        # MongoDB initialization script
└── README.md           # Project documentation
```

### Version Control Strategy
- **Branching**: Main branch for stable releases, feature branches for development
- **Commits**: Atomic commits with descriptive messages following conventional commit format
- **Development Workflow**: 
  - Feature development in separate branches
  - Code review before merging to main
  - Regular commits to track progress and changes
  - Integration of MongoDB database in Phase 2
  - Implementation of real-time Socket.io communication
  - Enhancement of file upload and user management features

---

## Data Structures

### Client-Side Data Structures

#### User Model (User)
Located in `client/src/app/models/user.model.ts`

```typescript
interface User {
  id?: string;               // Client-side ID (optional)
  _id?: string;              // MongoDB ObjectId
  username: string;          // Username (unique)
  email: string;             // Email address (unique)
  roles: string[];           // User roles ['user', 'group-admin', 'super-admin']
  groups: string[];          // Array of group IDs user belongs to
  avatar?: string;           // User avatar URL
  isOnline?: boolean;        // Online status
  lastSeen?: Date;           // Last seen timestamp
  createdAt?: Date;          // Creation timestamp
  updatedAt?: Date;          // Update timestamp
}
```

#### Group Model (Group)
Located in `client/src/app/models/group.model.ts`

```typescript
interface Group {
  id?: string;               // Client-side ID (optional)
  _id?: string;              // MongoDB ObjectId
  name: string;              // Group name
  description?: string;      // Group description
  adminIds: any[];           // Array of admin IDs (may contain User objects)
  memberIds: any[];          // Array of member IDs (may contain User objects)
  pendingApplications?: GroupApplication[]; // Pending applications
  channels: Channel[];       // Array of channels
  createdBy: any;            // Creator ID or User object
  isPrivate?: boolean;       // Whether group is private
  maxMembers?: number;       // Maximum number of members
  createdAt?: Date | string; // Creation timestamp
  updatedAt?: Date | string; // Update timestamp
  __v?: number;              // MongoDB version number
}
```

#### Channel Model (Channel)
Located in `client/src/app/models/group.model.ts`

```typescript
interface Channel {
  id?: string;               // Client-side ID (optional)
  _id?: string;              // MongoDB ObjectId
  name: string;              // Channel name
  description?: string;      // Channel description
  groupId: string;           // Parent group ID
  memberIds: string[];       // Array of member IDs
  messages?: Message[];      // Array of messages (optional)
  createdAt?: Date;          // Creation timestamp
  updatedAt?: Date;          // Update timestamp
}
```

#### Message Model (Message)
Located in `client/src/app/models/group.model.ts`
#### Message Model (Message)
Located in `client/src/app/models/group.model.ts`

```typescript
interface Message {
  id?: string;               // Client-side ID (optional)
  _id?: string;              // MongoDB ObjectId
  content: string;           // Message content
  senderId: string;          // Sender ID
  senderUsername: string;    // Sender username
  channelId: string;         // Parent channel ID
  timestamp?: Date;          // Timestamp (optional)
  createdAt?: Date;          // Creation timestamp
  type: 'text' | 'image' | 'file';  // Message type
  fileUrl?: string;          // File URL (optional)
  fileName?: string;         // File name
  fileSize?: number;         // File size in bytes
  mimeType?: string;         // MIME type
}
```

#### Group Application Model (GroupApplication)
Located in `client/src/app/models/group.model.ts`

```typescript
interface GroupApplication {
  id?: string;               // Client-side ID (optional)
  _id?: string;              // MongoDB ObjectId
  groupId: string;           // Group ID
  userId: string;            // Applicant user ID
  username: string;          // Applicant username
  status: 'pending' | 'approved' | 'rejected'; // Application status
  appliedAt: Date | string;  // Application timestamp
  reviewedBy?: string;       // Reviewer ID (optional)
  reviewedAt?: Date | string;// Review timestamp (optional)
  message?: string;          // Application message (optional)
}
```

### Server-Side Data Structures

The server uses MongoDB with Mongoose ODM for data modeling. All models are located in `server/models/mongodb/`.

#### User Schema
Located in `server/models/mongodb/User.js`

```javascript
{
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  roles: [{ type: String, enum: ['user', 'group-admin', 'super-admin'] }],
  groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
  avatar: { type: String },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

#### Group Schema
Located in `server/models/mongodb/Group.js`

```javascript
{
  name: { type: String, required: true },
  description: { type: String },
  adminIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  memberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  channels: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Channel' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isPrivate: { type: Boolean, default: false },
  maxMembers: { type: Number, default: 100 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

#### Channel Schema
Located in `server/models/mongodb/Channel.js`

```javascript
{
  name: { type: String, required: true },
  description: { type: String },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  memberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

#### Message Schema
Located in `server/models/mongodb/Message.js`

```javascript
{
  content: { type: String, required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderUsername: { type: String, required: true },
  channelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true },
  type: { type: String, enum: ['text', 'image', 'file'], default: 'text' },
  fileUrl: { type: String },
  fileName: { type: String },
  fileSize: { type: Number },
  mimeType: { type: String },
  createdAt: { type: Date, default: Date.now }
}
```

#### Group Application Schema
Located in `server/models/mongodb/GroupApplication.js`

```javascript
{
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  appliedAt: { type: Date, default: Date.now },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  message: { type: String }
}
```

---

## Client-Server Responsibility Division

### Client-Side Responsibilities (Angular)
- **User Interface**: Rendering components and managing user interactions
- **State Management**: Managing application state using RxJS and services
- **Form Validation**: Client-side validation of user inputs
- **Routing**: Navigation between different views
- **Real-time Communication**: Socket.io client for real-time messaging
- **HTTP Requests**: Making API calls to the server
- **Authentication State**: Managing JWT tokens and user session
- **File Upload UI**: Providing interface for file selection and upload

### Server-Side Responsibilities (Node.js/Express)
- **Business Logic**: Processing requests and enforcing business rules
- **Database Operations**: CRUD operations on MongoDB
- **Authentication**: JWT token generation and validation
- **Authorization**: Role-based access control
- **Data Validation**: Server-side validation of incoming data
- **File Storage**: Handling file uploads using Multer
- **Real-time Communication**: Socket.io server for broadcasting messages
- **API Endpoints**: RESTful API returning JSON responses
- **Error Handling**: Catching and returning appropriate error responses
- **Security**: Password hashing, input sanitization

### REST API Architecture
The server provides a RESTful API that returns JSON responses. Static files (uploaded images, avatars) are served from the `/uploads` directory. All API endpoints are prefixed with `/api`.

---

## API Routes, Parameters, Return Values, and Purposes

### Authentication Routes (`/api/auth`)

#### POST `/api/auth/login`
- **Purpose**: User authentication
- **Parameters**: 
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```
- **Returns**:
  ```json
  {
    "success": true,
    "user": { User object },
    "token": "JWT token string"
  }
  ```

#### POST `/api/auth/register`
- **Purpose**: New user registration
- **Parameters**:
  ```json
  {
    "username": "string",
    "email": "string",
    "password": "string"
  }
  ```
- **Returns**:
  ```json
  {
    "success": true,
    "user": { User object },
    "message": "string"
  }
  ```

#### GET `/api/auth/users`
- **Purpose**: Get all users (admin only)
- **Parameters**: None (requires authentication)
- **Returns**:
  ```json
  {
    "success": true,
    "users": [ User objects array ]
  }
  ```

#### PUT `/api/auth/users/:id/promote`
- **Purpose**: Promote user role
- **Parameters**: URL param `id`, body: `{ "role": "group-admin" | "super-admin" }`
- **Returns**:
  ```json
  {
    "success": true,
    "user": { Updated user object }
  }
  ```

#### PUT `/api/auth/users/:id/demote`
- **Purpose**: Demote user role
- **Parameters**: URL param `id`, body: `{ "role": "user" | "group-admin" }`
- **Returns**:
  ```json
  {
    "success": true,
    "user": { Updated user object }
  }
  ```

#### DELETE `/api/auth/users/:id`
- **Purpose**: Delete user (super-admin only)
- **Parameters**: URL param `id`
- **Returns**:
  ```json
  {
    "success": true,
    "message": "User deleted successfully"
  }
  ```

### Group Routes (`/api/groups`)

#### GET `/api/groups`
- **Purpose**: Get groups for current user
- **Parameters**: None (requires authentication)
- **Returns**:
  ```json
  {
    "success": true,
    "groups": [ Group objects array ]
  }
  ```

#### GET `/api/groups/all`
- **Purpose**: Get all groups (admin only)
- **Parameters**: None (requires authentication)
- **Returns**:
  ```json
  {
    "success": true,
    "groups": [ Group objects array ]
  }
  ```

#### GET `/api/groups/available`
- **Purpose**: Get groups available to join (user not already a member)
- **Parameters**: None (requires authentication)
- **Returns**:
  ```json
  {
    "success": true,
    "groups": [ Group objects array ]
  }
  ```

#### POST `/api/groups`
- **Purpose**: Create a new group
- **Parameters**:
  ```json
  {
    "name": "string",
    "description": "string",
    "createdBy": "userId"
  }
  ```
- **Returns**:
  ```json
  {
    "success": true,
    "group": { Group object }
  }
  ```

#### GET `/api/groups/:groupId`
- **Purpose**: Get specific group details
- **Parameters**: URL param `groupId`
- **Returns**:
  ```json
  {
    "success": true,
    "group": { Group object with populated channels }
  }
  ```

#### DELETE `/api/groups/:groupId`
- **Purpose**: Delete a group (admin only)
- **Parameters**: URL param `groupId`
- **Returns**:
  ```json
  {
    "success": true,
    "message": "Group deleted successfully"
  }
  ```

#### POST `/api/groups/:groupId/channels`
- **Purpose**: Create a new channel in a group
- **Parameters**: URL param `groupId`, body:
  ```json
  {
    "name": "string",
    "description": "string"
  }
  ```
- **Returns**:
  ```json
  {
    "success": true,
    "channel": { Channel object }
  }
  ```

#### GET `/api/groups/:groupId/channels`
- **Purpose**: Get all channels in a group
- **Parameters**: URL param `groupId`
- **Returns**: Array of Channel objects

#### DELETE `/api/groups/:groupId/channels/:channelId`
- **Purpose**: Delete a channel (admin only)
- **Parameters**: URL params `groupId`, `channelId`
- **Returns**:
  ```json
  {
    "success": true,
    "message": "Channel deleted successfully"
  }
  ```

#### POST `/api/groups/:groupId/members`
- **Purpose**: Add member to group (admin only)
- **Parameters**: URL param `groupId`, body: `{ "userId": "string" }`
- **Returns**:
  ```json
  {
    "success": true,
    "message": "Member added successfully"
  }
  ```

#### DELETE `/api/groups/:groupId/members/:userId`
- **Purpose**: Remove member from group (admin only)
- **Parameters**: URL params `groupId`, `userId`
- **Returns**:
  ```json
  {
    "success": true,
    "message": "Member removed successfully"
  }
  ```

#### POST `/api/groups/:groupId/apply`
- **Purpose**: Apply to join a group
- **Parameters**: URL param `groupId`, body: `{ "message": "string" }`
- **Returns**:
  ```json
  {
    "success": true,
    "application": { GroupApplication object }
  }
  ```

#### GET `/api/groups/:groupId/applications`
- **Purpose**: Get pending applications for a group (admin only)
- **Parameters**: URL param `groupId`
- **Returns**:
  ```json
  {
    "success": true,
    "applications": [ GroupApplication objects array ]
  }
  ```

#### GET `/api/groups/applications`
- **Purpose**: Get all applications for groups the user manages
- **Parameters**: None (requires authentication)
- **Returns**:
  ```json
  {
    "success": true,
    "applications": [ GroupApplication objects array ]
  }
  ```

#### POST `/api/groups/applications/:applicationId/review`
- **Purpose**: Approve or reject a group application
- **Parameters**: URL param `applicationId`, body: `{ "action": "approve" | "reject" }`
- **Returns**:
  ```json
  {
    "success": true,
    "application": { Updated application object }
  }
  ```

#### GET `/api/groups/:groupId/channels/:channelId/messages`
- **Purpose**: Get messages for a channel
- **Parameters**: URL params `groupId`, `channelId`
- **Returns**:
  ```json
  {
    "success": true,
    "messages": [ Message objects array ]
  }
  ```

#### POST `/api/groups/:groupId/channels/:channelId/messages`
- **Purpose**: Send a message to a channel
- **Parameters**: URL params `groupId`, `channelId`, body:
  ```json
  {
    "content": "string",
    "type": "text" | "image" | "file",
    "fileUrl": "string (optional)"
  }
  ```
- **Returns**:
  ```json
  {
    "success": true,
    "message": { Message object }
  }
  ```

### Profile Routes (`/api/profile`)

#### GET `/api/profile/me`
- **Purpose**: Get current user profile
- **Parameters**: None (requires authentication)
- **Returns**:
  ```json
  {
    "success": true,
    "user": { User object }
  }
  ```

#### PUT `/api/profile/me`
- **Purpose**: Update current user profile
- **Parameters**: Body contains user fields to update
- **Returns**:
  ```json
  {
    "success": true,
    "user": { Updated user object }
  }
  ```

#### POST `/api/profile/avatar`
- **Purpose**: Upload user avatar
- **Parameters**: Multipart form data with `avatar` file
- **Returns**:
  ```json
  {
    "success": true,
    "avatarUrl": "string",
    "user": { Updated user object }
  }
  ```

#### DELETE `/api/profile/avatar`
- **Purpose**: Delete user avatar
- **Parameters**: None (requires authentication)
- **Returns**:
  ```json
  {
    "success": true,
    "message": "Avatar deleted successfully"
  }
  ```

### Upload Routes (`/api/upload`)

#### POST `/api/upload/image`
- **Purpose**: Upload an image file
- **Parameters**: Multipart form data with `image` file
- **Returns**:
  ```json
  {
    "success": true,
    "url": "string",
    "filename": "string"
  }
  ```

#### POST `/api/upload/file`
- **Purpose**: Upload a generic file
- **Parameters**: Multipart form data with `file`
- **Returns**:
  ```json
  {
    "success": true,
    "url": "string",
    "filename": "string"
  }
  ```

#### DELETE `/api/upload/file/:filename`
- **Purpose**: Delete an uploaded file
- **Parameters**: URL param `filename`
- **Returns**:
  ```json
  {
    "success": true,
    "message": "File deleted successfully"
  }
  ```

### Admin Routes (`/api/admin`)

#### GET `/api/admin/users`
- **Purpose**: Get all users (super-admin only)
- **Parameters**: None (requires super-admin authentication)
- **Returns**:
  ```json
  {
    "success": true,
    "users": [ User objects array ]
  }
  ```

#### GET `/api/admin/groups`
- **Purpose**: Get all groups (super-admin only)
- **Parameters**: None (requires super-admin authentication)
- **Returns**:
  ```json
  {
    "success": true,
    "groups": [ Group objects array ]
  }
  ```

#### DELETE `/api/admin/users/:userId`
- **Purpose**: Delete any user (super-admin only)
- **Parameters**: URL param `userId`
- **Returns**:
  ```json
  {
    "success": true,
    "message": "User deleted successfully"
  }
  ```

#### PUT `/api/admin/users/:userId/roles`
- **Purpose**: Update user roles (super-admin only)
- **Parameters**: URL param `userId`, body: `{ "roles": ["string array"] }`
- **Returns**:
  ```json
  {
    "success": true,
    "user": { Updated user object }
  }
  ```

---

## Angular Architecture

### Components

#### 1. LoginComponent
**Location**: `client/src/app/components/login/login.component.ts`

**Purpose**: User authentication interface (login and registration)

**Responsibilities**:
- Display login form with username and password fields
- Display registration form for new users
- Validate user inputs
- Call AuthService for authentication
- Navigate to dashboard upon successful login
- Display error messages for failed attempts

**Key Methods**:
- `onLogin()`: Handles login form submission
- `onRegister()`: Handles registration form submission
- `validateForm()`: Client-side form validation

#### 2. DashboardComponent
**Location**: `client/src/app/components/dashboard/dashboard.component.ts`

**Purpose**: Main user dashboard displaying groups and management features

**Responsibilities**:
- Display list of user's groups
- Provide group creation interface (for admins)
- Display user management panel (for super-admins)
- Show pending group applications (for group admins)
- Navigate to chat when group/channel is selected
- Handle group joining/leaving operations

**Key Methods**:
- `loadGroups()`: Fetch user's groups from server
- `createGroup()`: Create new group
- `joinGroup()`: Apply to join a group
- `manageUsers()`: Admin user management
- `reviewApplications()`: Review group join requests

#### 3. ChatComponent
**Location**: `client/src/app/components/chat/chat.component.ts`

**Purpose**: Real-time chat interface for channels

**Responsibilities**:
- Display chat messages in selected channel
- Send text messages
- Upload and share images/files
- Show online users
- Display typing indicators
- Handle channel switching
- Manage channel members (for admins)

**Key Methods**:
- `loadMessages()`: Load message history
- `sendMessage()`: Send new message
- `uploadFile()`: Handle file uploads
- `switchChannel()`: Change active channel
- `onTyping()`: Handle typing events

#### 4. ProfileComponent
**Location**: `client/src/app/components/profile/profile.component.ts`

**Purpose**: User profile management

**Responsibilities**:
- Display user information
- Allow profile editing
- Handle avatar upload
- Update user preferences

**Key Methods**:
- `loadProfile()`: Load user profile data
- `updateProfile()`: Save profile changes
- `uploadAvatar()`: Upload new avatar image

### Services

#### 1. AuthService
**Location**: `client/src/app/services/auth.service.ts`

**Purpose**: Manage user authentication and authorization

**Key Methods**:
- `login(credentials)`: Authenticate user and store JWT token
- `logout()`: Clear user session and token
- `isAuthenticated()`: Check if user is logged in
- `getCurrentUser()`: Get current user object
- `hasRole(role)`: Check if user has specific role
- `isSuperAdmin()`: Check super-admin status
- `isGroupAdmin()`: Check group-admin status
- `updateCurrentUser(user)`: Update stored user data
- `deleteUser(userId)`: Delete user (admin only)
- `updateUserRoles(userId, roles)`: Update user roles (admin only)

**Global Variables**:
- `currentUserSubject`: BehaviorSubject holding current user
- `currentUser$`: Observable of current user
- `API_URL`: Base API endpoint URL

#### 2. GroupService
**Location**: `client/src/app/services/group.service.ts`

**Purpose**: Manage groups, channels, and messages

**Key Methods**:
- `getUserGroups()`: Get groups for current user
- `getAllGroups()`: Get all groups (admin only)
- `getGroupById(groupId)`: Get specific group details
- `createGroup(groupData)`: Create new group
- `createChannel(groupId, channelData)`: Create new channel
- `getGroupChannels(groupId)`: Get channels in group
- `addUserToGroup(groupId, userId)`: Add member to group
- `removeUserFromGroup(groupId, userId)`: Remove member from group
- `sendMessage(channelId, content)`: Send message to channel
- `getMessages(channelId)`: Get channel message history
- `applyToGroup(groupId)`: Apply to join group
- `getApplications()`: Get pending applications
- `reviewApplication(applicationId, action)`: Approve/reject application

**Global Variables**:
- `API_URL`: Base API endpoint URL

#### 3. SocketService
**Location**: `client/src/app/services/socket.service.ts`

**Purpose**: Manage Socket.io real-time communication

**Key Methods**:
- `connect()`: Establish Socket.io connection
- `disconnect()`: Close Socket.io connection
- `joinChannel(channelId)`: Join a channel room
- `leaveChannel(channelId)`: Leave a channel room
- `sendMessage(message)`: Emit message event
- `onMessage()`: Listen for incoming messages
- `onUserJoin()`: Listen for user join events
- `onUserLeave()`: Listen for user leave events
- `onTyping()`: Listen for typing indicators

**Global Variables**:
- `socket`: Socket.io client instance
- `connected$`: Observable for connection status

#### 4. ProfileService
**Location**: `client/src/app/services/profile.service.ts`

**Purpose**: Manage user profile operations

**Key Methods**:
- `getProfile()`: Get current user profile
- `updateProfile(data)`: Update user profile
- `uploadAvatar(file)`: Upload user avatar
- `deleteAvatar()`: Remove user avatar

#### 5. UploadService
**Location**: `client/src/app/services/upload.service.ts`

**Purpose**: Handle file uploads

**Key Methods**:
- `uploadImage(file)`: Upload image file
- `uploadFile(file)`: Upload generic file
- `deleteFile(filename)`: Delete uploaded file

### Guards

#### AuthGuard
**Location**: `client/src/app/guards/auth.guard.ts`

**Purpose**: Protect routes that require authentication

**Functionality**:
- Checks if user is authenticated before allowing route access
- Redirects to login page if not authenticated
- Uses AuthService to verify authentication state

### Interceptors

#### AuthInterceptor
**Location**: `client/src/app/interceptors/auth.interceptor.ts`

**Purpose**: Add JWT token to HTTP requests

**Functionality**:
- Intercepts all outgoing HTTP requests
- Adds Authorization header with JWT token
- Handles token refresh if needed

### Routing

**Location**: `client/src/app/app.routes.ts`

```typescript
Routes:
- '' → '/login' (redirect)
- '/login' → LoginComponent
- '/dashboard' → DashboardComponent (protected by AuthGuard)
- '/chat/:id' → ChatComponent (protected by AuthGuard)
- '/profile' → ProfileComponent (protected by AuthGuard)
- '**' → '/login' (catch-all redirect)
```

---

## Client-Server Interaction Details

### Authentication Flow

**Client Side**:
1. User enters credentials in LoginComponent
2. LoginComponent calls `AuthService.login(credentials)`
3. AuthService sends POST request to `/api/auth/login`
4. On success, stores JWT token in localStorage
5. Updates `currentUserSubject` with user data
6. Navigates to DashboardComponent

**Server Side**:
1. `authRoutes.js` receives POST `/api/auth/login`
2. Validates credentials against MongoDB User collection
3. Compares password using bcrypt
4. Generates JWT token using `middleware/auth.js`
5. Returns user object and token
6. Updates global `activeUsers` Map if using Socket.io

**Global Variables Changed**:
- Client: `localStorage['token']`, `localStorage['currentUser']`, `currentUserSubject`
- Server: None (stateless REST API)

### Group Creation Flow

**Client Side**:
1. DashboardComponent displays create group form
2. User fills form and clicks create
3. Calls `GroupService.createGroup(groupData)`
4. GroupService sends POST to `/api/groups`
5. On success, updates local groups list
6. Re-renders dashboard with new group

**Server Side**:
1. `groupRoutes.js` receives POST `/api/groups`
2. `authenticateToken` middleware validates JWT
3. Creates new Group document in MongoDB
4. Adds creator as admin and member
5. Returns created group object

**Global Variables Changed**:
- Client: Groups array in DashboardComponent
- Server: MongoDB `groups` collection updated

### Real-time Messaging Flow

**Client Side**:
1. ChatComponent renders message list
2. User types message and clicks send
3. Calls `SocketService.sendMessage(message)`
4. Emits `send-message` Socket.io event
5. Listens for `new-message` event
6. Appends new message to message list
7. Scrolls to bottom

**Server Side**:
1. `server2.js` Socket.io handler receives `send-message` event
2. Validates user is in channel
3. Saves message to MongoDB `messages` collection
4. Broadcasts `new-message` event to all users in channel room
5. Updates `channelUsers` Map

**Global Variables Changed**:
- Client: Messages array in ChatComponent, scroll position
- Server: `channelUsers` Map, MongoDB `messages` collection

### File Upload Flow

**Client Side**:
1. ChatComponent displays file upload button
2. User selects file
3. Calls `UploadService.uploadImage(file)` or `uploadFile(file)`
4. Creates FormData with file
5. Sends POST to `/api/upload/image` or `/api/upload/file`
6. On success, gets file URL
7. Sends message with file URL via Socket.io

**Server Side**:
1. `uploadRoutes.js` receives POST `/api/upload/image` or `/api/upload/file`
2. Multer middleware processes file
3. Saves file to `uploads/` directory
4. Generates unique filename
5. Returns file URL

**Global Variables Changed**:
- Client: Message list in ChatComponent updated with file message
- Server: File system updated with new file

### User Management Flow (Admin)

**Client Side**:
1. DashboardComponent displays user list (admin only)
2. Admin clicks promote/demote/delete
3. Calls `AuthService.updateUserRoles()` or `deleteUser()`
4. Sends PUT/DELETE to `/api/auth/users/:id/promote` or `/api/auth/users/:id`
5. On success, updates user list display

**Server Side**:
1. `authRoutes.js` receives request
2. `authenticateToken` middleware validates JWT
3. Checks if user has admin role
4. Updates User document in MongoDB
5. Returns updated user or success message

**Global Variables Changed**:
- Client: Users array in DashboardComponent
- Server: MongoDB `users` collection updated

### Group Application Flow

**Client Side**:
1. DashboardComponent shows available groups
2. User clicks "Apply to Join"
3. Calls `GroupService.applyToGroup(groupId)`
4. Sends POST to `/api/groups/:groupId/apply`
5. Shows confirmation message

Group Admin Side:
1. DashboardComponent loads pending applications
2. Calls `GroupService.getApplications()`
3. Displays application list
4. Admin clicks approve/reject
5. Calls `GroupService.reviewApplication(applicationId, action)`
6. Updates application list

**Server Side**:
1. `groupRoutes.js` receives POST `/api/groups/:groupId/apply`
2. Creates GroupApplication document in MongoDB
3. Sets status to 'pending'

Review:
1. Receives POST `/api/groups/applications/:applicationId/review`
2. Updates GroupApplication status
3. If approved, adds user to group memberIds
4. Returns updated application

**Global Variables Changed**:
- Client: Available groups list, applications list in DashboardComponent
- Server: MongoDB `groupapplications` and `groups` collections updated

### Socket.io Connection Management

**Client Side**:
1. SocketService connects on initialization
2. Emits `user-join` with user data
3. Joins channel rooms with `join-channel` event
4. Listens for various events (new-message, user-join, typing, etc.)
5. Updates component state based on events

**Server Side**:
1. `server2.js` handles Socket.io connections
2. On connection, stores socket in `activeUsers` Map
3. On `user-join`, updates `userSockets` Map
4. On `join-channel`, adds user to `channelUsers` Map
5. Broadcasts events to appropriate rooms
6. On disconnect, cleans up Maps

**Global Variables Changed**:
- Client: SocketService connection status, messages array, online users list
- Server: `activeUsers`, `userSockets`, `channelUsers`, `typingUsers` Maps

---

## Summary

This application implements a complete chat system with:
- **Clear separation of concerns**: Client handles UI/UX, server handles business logic and data
- **RESTful API**: All endpoints return JSON, static files served separately
- **Real-time communication**: Socket.io for instant messaging
- **Role-based access control**: Three-tier user system (user, group-admin, super-admin)
- **MongoDB integration**: Persistent data storage with Mongoose ODM
- **Comprehensive routing**: Well-defined API endpoints for all operations
- **Angular architecture**: Components, services, guards, and interceptors working together
- **Bidirectional data flow**: Client requests → Server processes → Database updates → Client updates




