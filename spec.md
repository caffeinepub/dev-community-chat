# Dev Community Chat

## Current State
New project with no existing application files.

## Requested Changes (Diff)

### Add
- Full-stack WhatsApp-style Developer Community Group Chat Platform
- User registration and login with password hashing and session tokens
- Stable storage for users, messages, and groups
- 5 pre-created developer groups: General, JavaScript, Rust, Web3, Help & Support
- Polling-based real-time messaging (every 2 seconds)
- Online/offline user status tracking
- Message history per group
- Unread message count badges
- Browser notification support for new messages
- Typing indicator simulation

### Modify
- N/A (new project)

### Remove
- N/A (new project)

## Implementation Plan

### Backend (Motoko)
- User entity: id, username, email, hashedPassword, onlineStatus, lastSeen
- Message entity: id, senderId, groupId, text, timestamp
- Group entity: id, name, members (list of user ids)
- Auth: register, login (returns session token), logout, validateSession
- Chat: sendMessage, getMessages(groupId, since), getGroups, getUsers
- Status: updateOnlineStatus, getOnlineUsers
- Pre-seed 5 default developer groups on init
- Simple hash for password storage

### Frontend (React + TypeScript + Tailwind)
1. Registration Page: username, email, password, confirm password fields
2. Login Page: email, password, link to register
3. Chat Dashboard:
   - Left sidebar (dark #111b21): group list with unread badges, online user list
   - Main chat area: message bubbles (green sent, white received), timestamps
   - Top header: group name, member count, online indicator
   - Bottom input: text field, emoji picker, send button
   - Logout button in sidebar header
4. Poll every 2 seconds for new messages and user status
5. Auto-scroll to latest message
6. Mobile-responsive design (mobile-first)
7. WhatsApp green (#25D366) accent throughout
