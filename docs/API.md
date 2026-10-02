# API Reference — SAP-SMS REST API

All API endpoints reside under the `/api` root path. Authenticated routes require an `Authorization: Bearer <token>` HTTP header.

## Response Standards

### Success Response Envelope
```json
{
  "success": true,
  "message": "Operation description",
  "data": { ... },
  "meta": { ... }
}
```

### Error Response Envelope
```json
{
  "success": false,
  "message": "Human-readable error description",
  "errors": ["Specific validation error string"],
  "stack": "Omitted in production"
}
```

---

## 1. Authentication Endpoints

### Register Student
- **Route**: `POST /api/auth/register`
- **Access**: Public
- **Body**:
  ```json
  {
    "name": "Alex Johnson",
    "email": "alex@university.edu",
    "password": "Password123!",
    "studentId": "STU-2024-001",
    "department": "Computer Science",
    "semester": "6th Semester"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "success": true,
    "message": "Registration successful",
    "data": {
      "user": {
        "id": "679f18a2bc9...",
        "name": "Alex Johnson",
        "email": "alex@university.edu",
        "role": "student",
        "profile": { ... }
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp..."
    }
  }
  ```

### Login Student
- **Route**: `POST /api/auth/login`
- **Access**: Public
- **Body**:
  ```json
  {
    "email": "alex@university.edu",
    "password": "Password123!"
  }
  ```
- **Response**: `200 OK` (returns user object and signed JWT token)

### Get Authenticated Profile
- **Route**: `GET /api/auth/me`
- **Access**: Private (Bearer JWT)
- **Response**: `200 OK`

### Update Profile
- **Route**: `PUT /api/auth/profile`
- **Access**: Private
- **Body**: `{ "name", "studentId", "department", "semester", "institution", "phone" }`

### Change Password
- **Route**: `PUT /api/auth/change-password`
- **Access**: Private
- **Body**: `{ "currentPassword", "newPassword" }`

### Logout
- **Route**: `POST /api/auth/logout`
- **Access**: Private

---

## 2. Subject Endpoints

### List Enrolled Subjects
- **Route**: `GET /api/subjects`
- **Access**: Private
- **Response**: `200 OK` Array of subjects with nested attendance summary.

### Create Subject
- **Route**: `POST /api/subjects`
- **Access**: Private
- **Body**:
  ```json
  {
    "name": "Computer Networks",
    "code": "CS303",
    "instructor": "Prof. Taylor",
    "credits": 3,
    "targetAttendance": 75,
    "color": "#3B82F6"
  }
  ```
- **Response**: `201 Created` (Subject is created and an Attendance document is automatically initialized).

### Get / Update / Delete Subject
- `GET /api/subjects/:id`
- `PUT /api/subjects/:id`
- `DELETE /api/subjects/:id` (Cascades to delete linked attendance records, timetable slots, and detaches task references).

---

## 3. Academic Tasks Endpoints

### List Tasks
- **Route**: `GET /api/tasks`
- **Access**: Private
- **Query Parameters**:
  - `status`: `pending` | `in-progress` | `completed`
  - `priority`: `low` | `medium` | `high` | `urgent`
  - `subject`: Subject ObjectId
  - `overdue`: `true` | `false`
  - `search`: Keyword string
- **Response**: `200 OK` Array of tasks populated with subject info.

### Create Task
- **Route**: `POST /api/tasks`
- **Access**: Private
- **Body**:
  ```json
  {
    "title": "Complete Graph Lab Sheet",
    "description": "Implement Dijkstra in C++",
    "subject": "679f18a2bc...",
    "dueDate": "2026-10-15T23:59:00Z",
    "priority": "high",
    "status": "pending"
  }
  ```

### Toggle Completion Status
- **Route**: `PATCH /api/tasks/:id/toggle`
- **Access**: Private
- **Response**: `200 OK` (Toggles status between pending and completed; sets `completionDate` automatically).

### Update / Delete Task
- `PUT /api/tasks/:id`
- `DELETE /api/tasks/:id`

---

## 4. Attendance Endpoints

### List Attendance Records
- **Route**: `GET /api/attendance`
- **Access**: Private
- **Response**: `200 OK` Array of attendance records decorated with mathematical metrics:
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "679f...",
        "subject": { "name": "Operating Systems", "code": "CS301", "color": "#10B981" },
        "attendedClasses": 24,
        "totalClasses": 34,
        "targetPercentage": 80,
        "percentage": 70.59,
        "classesNeeded": 16,
        "bunksAvailable": 0,
        "status": "warning",
        "needsAttention": true
      }
    ],
    "meta": {
      "totalAttendedAll": 24,
      "totalHeldAll": 34,
      "overallPercentage": 70.59,
      "lowAttendanceCount": 1
    }
  }
  ```

### Quick Log Attendance
- **Route**: `POST /api/attendance/:id/log`
- **Access**: Private
- **Body**: `{ "action": "present" | "absent" | "undo_present" | "undo_absent" }`

### Manual Adjustment
- **Route**: `PUT /api/attendance/:id`
- **Access**: Private
- **Body**: `{ "attendedClasses": 25, "totalClasses": 35, "targetPercentage": 80 }`

### Reset Attendance
- **Route**: `POST /api/attendance/:id/reset`
- **Access**: Private (resets to 0/0).

---

## 5. Timetable Endpoints

### Get Timetable
- **Route**: `GET /api/timetable`
- **Query Parameter**: `day` (`Monday` through `Sunday`)
- **Access**: Private

### Get Today's Classes
- **Route**: `GET /api/timetable/today`
- **Access**: Private

### Create / Update / Delete Timetable Slot
- `POST /api/timetable`
  - Body: `{ "subject", "day", "startTime", "endTime", "room", "type" }`
- `PUT /api/timetable/:id`
- `DELETE /api/timetable/:id`

---

## 6. Events Endpoints

### List Events
- **Route**: `GET /api/events`
- **Query Parameters**: `category`, `upcoming=true`, `month`, `year`
- **Access**: Private

### Create / Update / Delete Event
- `POST /api/events`
  - Body: `{ "title", "description", "date", "time", "location", "category" }`
- `PUT /api/events/:id`
- `DELETE /api/events/:id`

---

## 7. Dashboard Endpoint

### Aggregated Student Summary
- **Route**: `GET /api/dashboard`
- **Access**: Private
- **Response**: Returns today's classes, top pending tasks, upcoming events, overall attendance rate, and low-attendance alerts in a single round-trip.

---

## 8. Notifications Endpoints

- `GET /api/notifications/preferences`: Get preference flags.
- `PUT /api/notifications/preferences`: Update reminder flags.
- `GET /api/notifications/vapid-key`: Retrieve public key for PushManager.
- `POST /api/notifications/subscribe`: Store browser PushSubscription JSON.
- `POST /api/notifications/test`: Trigger test notification.
