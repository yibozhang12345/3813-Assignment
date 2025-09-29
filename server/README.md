# 3813 Chat Server (Phase 1 → Phase 2)

## Phase 1
- In-memory data structures (users/groups/channels/messages).
- Simple login endpoint with default `super / 123` user.
- Role gates for super/groupAdmin basic actions.
- REST endpoints for users, groups, channels, and message history.
- Socket.IO skeleton wired (join/leave/send events).

## Phase 2
- Replace in-memory `db` with MongoDB.
- Persist users, groups, channels, messages.
- Implement real-time chat with Socket.IO broadcast + history.
- Add tests in `tests/`.

## Run
```bash
cd express-server
npm i
npm run dev
# server: http://localhost:3000
```
