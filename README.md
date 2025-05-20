StuTrack is a comprehensive web application designed to help MSU-IIT students manage their academic life effectively. This repository contains the back-end code for the StuTrack platform.

## Features

- **User Authentication**: Secure registration and login system
- **Task Management**: Create, track, and complete academic and personal tasks
- **Calendar Planning**: Schedule classes, exams, and study sessions
- **Journal System**: Record thoughts, experiences, and reflections
- **Goal Tracking**: Set academic and personal goals with milestones
- **Analytics Dashboard**: View productivity metrics and academic performance
- **Notification System**: Receive reminders for upcoming deadlines

## Tech Stack

- **Node.js**: JavaScript runtime for server-side logic
- **Express**: Web framework for building the API
- **MongoDB**: NoSQL database for storing user data
- **Mongoose**: ODM library for MongoDB and Node.js
- **JWT**: JSON Web Tokens for authentication
- **bcrypt**: Library for password hashing

## API Documentation

The API is organized around RESTful principles and uses standard HTTP verbs:

### Authentication Endpoints

- `POST /api/users`: Register a new user
- `POST /api/users/login`: Login and get authentication token
- `GET /api/users/profile`: Get user profile
- `PUT /api/users/profile`: Update user profile

### Task Management Endpoints

- `POST /api/tasks`: Create a new task
- `GET /api/tasks`: Get all tasks for logged in user
- `GET /api/tasks/:id`: Get task by ID
- `PUT /api/tasks/:id`: Update a task
- `DELETE /api/tasks/:id`: Delete a task
- `GET /api/tasks/stats`: Get task statistics
- `GET /api/tasks/overdue`: Get overdue tasks

### Journal Endpoints

- `POST /api/journals`: Create a new journal entry
- `GET /api/journals`: Get all journal entries
- `GET /api/journals/:id`: Get journal entry by ID
- `PUT /api/journals/:id`: Update a journal entry
- `DELETE /api/journals/:id`: Delete a journal entry
- `GET /api/journals/stats`: Get journal statistics

### Calendar Endpoints

- `POST /api/calendar`: Create a new calendar event
- `GET /api/calendar`: Get all calendar events
- `GET /api/calendar/:id`: Get calendar event by ID
- `PUT /api/calendar/:id`: Update a calendar event
- `DELETE /api/calendar/:id`: Delete a calendar event
- `GET /api/calendar/upcoming`: Get upcoming events
- `GET /api/calendar/stats`: Get calendar statistics

### Goal Tracking Endpoints

- `POST /api/goals`: Create a new goal
- `GET /api/goals`: Get all goals
- `GET /api/goals/:id`: Get goal by ID
- `PUT /api/goals/:id`: Update a goal
- `DELETE /api/goals/:id`: Delete a goal
- `POST /api/goals/:id/milestones`: Add milestone to a goal
- `PUT /api/goals/:id/milestones/:milestoneId`: Update a milestone
- `DELETE /api/goals/:id/milestones/:milestoneId`: Delete a milestone
- `POST /api/goals/:id/reflections`: Add reflection to a goal
- `GET /api/goals/stats`: Get goal statistics

### Analytics Endpoints

- `GET /api/analytics/dashboard`: Get dashboard analytics
- `GET /api/analytics/productivity`: Get productivity analytics
- `GET /api/analytics/academic`: Get academic performance analytics

### Notification Endpoints

- `GET /api/notifications`: Get all notifications
- `POST /api/notifications`: Create a notification manually
- `PUT /api/notifications/:id/read`: Mark notification as read
- `PUT /api/notifications/read-all`: Mark all notifications as read
- `DELETE /api/notifications/:id`: Delete a notification

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)

### Installation

1. Clone the repository
```
git clone https://github.com/yourusername/stutrack-backend.git
cd stutrack-backend
```

2. Install dependencies
```
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/stutrack
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

4. Start the server
```
npm run dev
```

The server will start on port 5000 (or the port specified in your .env file).

## License

MIT
