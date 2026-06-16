# Smart Campus — AI-Powered Attendance System
 
A full-stack intelligent campus management platform that automates student attendance through a multi-layer verification system combining QR code scanning, GPS location validation, and real-time facial recognition. Faculty can generate time-bound QR codes, while students complete a secure three-step verification flow to mark their presence.
 
🌐 **Live Website:** https://smart-campus-kqqa.vercel.app
 
⚙️ **Backend API:** https://smart-campus-backend.up.railway.app
 
📦 **Repository:** https://github.com/Mouni-Sanaboyina/smart-campus
 
---
 
## Table of Contents
 
- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Attendance Verification Flow](#attendance-verification-flow)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [API Endpoints](#api-endpoints)
- [Demo Credentials](#demo-credentials)
- [Future Enhancements](#future-enhancements)
- [Author](#author)
---
 
## Overview
 
Smart Campus is a modern attendance automation platform built for educational institutions. It eliminates proxy attendance by enforcing a mandatory three-layer verification: students must scan the faculty-generated QR code, pass GPS proximity validation (within 100 m of the classroom), and match their registered face via live webcam capture.
 
Faculty get a real-time dashboard to view who is present or absent for each period, generate period-locked QR codes that expire when class ends, and manually override attendance when needed. The platform also includes a NEP course recommendation engine that suggests skill-development courses based on each student's declared interests.
 
---
 
## Features
 
### Student Features
 
- Self-registration with admin approval workflow
- Face registration via webcam during signup
- QR code scanning using device camera
- GPS proximity check before attendance is accepted
- Mandatory facial recognition to prevent proxy attendance
- Real-time attendance percentage dashboard
- Today's timetable view with subject and faculty details
- NEP course recommendations based on personal interests
- Interest profile management
### Faculty Features
 
- Period-aware QR code generation (only active during scheduled class time)
- Optional GPS embedding in QR for classroom proximity enforcement
- Live attendance roster — present and absent lists per period
- Manual attendance override for individual students
- Weekly timetable view with free-period detection
### Admin Features
 
- Pending student approval queue
- One-click student account activation
- Platform-wide stats: total students, faculty, and pending approvals
### Security Features
 
- JWT-based authentication with role enforcement (admin / faculty / student)
- bcrypt password hashing
- Face verification with configurable tolerance (default 0.5 — stricter than dlib default)
- QR sessions expire at period end time
- Duplicate attendance prevention per student per period per day
- GPS radius enforcement (100 m)
---
 
## Technology Stack
 
### Frontend
 
- React 19
- React Router DOM
- Vite
- Tailwind CSS
- Axios
- html5-qrcode (QR scanning)
- react-webcam (live face capture)
- qrcode.react (QR display)
- lucide-react (icons)
### Backend
 
- Python
- FastAPI
- SQLAlchemy ORM
- SQLite (development) / PostgreSQL (production)
- Uvicorn ASGI server
### AI / Biometrics
 
- face_recognition (dlib-based facial encoding and comparison)
- Pillow + NumPy (image processing pipeline)
### Authentication
 
- python-jose (JWT)
- passlib with bcrypt
### Deployment
 
- Vercel (Frontend)
- Railway (Backend)
---
 
## System Architecture
 
```
React Frontend (Vite + Tailwind)
        ↓
   Axios API Calls
        ↓
  FastAPI Backend
        ↓
  SQLAlchemy ORM
        ↓
SQLite / PostgreSQL
        ↓
face_recognition (dlib)
```
 
---
 
## Attendance Verification Flow
 
```
Student scans QR code
        ↓
   Session validation
   (active, correct day, not expired)
        ↓
   GPS proximity check
   (must be within 100 m of classroom)
        ↓
   Live face capture (webcam)
        ↓
   Face comparison vs. registered photo
   (tolerance 0.5 — hard block if no match)
        ↓
   Attendance marked ✅
```
 
---
 
## Project Structure
 
```
smart-campus
│
├── backend
│   ├── routers
│   │   ├── admin.py
│   │   ├── faculty.py
│   │   └── student.py
│   │
│   ├── faces/                  # Stored face images (per student ID)
│   ├── main.py                 # FastAPI app, routes, face verification
│   ├── models.py               # SQLAlchemy models
│   ├── schemas.py              # Pydantic request schemas
│   ├── database.py             # DB engine and session
│   ├── auth.py                 # JWT creation and current-user dependency
│   ├── utils.py                # Password hashing helpers
│   ├── seed.py                 # Initial data seeding (faculty, schedule, courses)
│   └── requirements.txt
│
└── frontend
    ├── public
    └── src
        ├── components
        │   ├── NotificationCard.jsx
        │   ├── QRDisplay.jsx
        │   ├── QRScanner.jsx
        │   └── StudentList.jsx
        │
        ├── layouts
        │   ├── Header.jsx
        │   ├── MainLayout.jsx
        │   └── Sidebar.jsx
        │
        ├── pages
        │   ├── auth
        │   │   └── Login.jsx
        │   ├── admin
        │   │   └── AdminDashboard.jsx
        │   ├── faculty
        │   │   ├── FacultyDashboard.jsx
        │   │   ├── FacultyAttendance.jsx
        │   │   └── FacultyCurriculum.jsx
        │   └── student
        │       ├── StudentDashboard.jsx
        │       ├── StudentAttendance.jsx
        │       ├── StudentQRScanner.jsx
        │       ├── StudentFaceVerification.jsx
        │       ├── StudentSignup.jsx
        │       ├── Studentskills.jsx
        │       ├── Studentcurriculum.jsx
        │       ├── Recommendations.jsx
        │       └── AttendancePage.jsx
        │
        ├── context
        │   └── AuthContext.jsx
        ├── services
        │   └── api.js
        ├── utils
        │   └── auth.js
        └── App.jsx
```
 
---
 
## Getting Started
 
### Prerequisites
 
- Python 3.10+
- Node.js 18+
- CMake (required by dlib for face recognition)
- Git
### Clone Repository
 
```bash
git clone https://github.com/Mouni-Sanaboyina/smart-campus.git
cd smart-campus
```
 
### Backend Setup
 
```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate
 
pip install -r requirements.txt
pip install cmake dlib face_recognition
```
 
Create `.env`:
 
```env
SECRET_KEY=your_jwt_secret_key
DATABASE_URL=sqlite:///./smart_campus.db
```
 
Run Backend:
 
```bash
uvicorn main:app --reload --port 8000
```
 
### Frontend Setup
 
```bash
cd frontend
npm install
```
 
Create `.env`:
 
```env
VITE_API_URL=http://localhost:8000
```
 
Start Development Server:
 
```bash
npm run dev
```
 
### Application URLs
 
**Development**
 
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`
**Production**
 
- Frontend: `https://smart-campus-kqqa.vercel.app`
- Backend: `https://smart-campus-backend.up.railway.app`
---
 
## Environment Variables
 
### Backend
 
| Variable | Description |
|---|---|
| `SECRET_KEY` | JWT signing secret |
| `DATABASE_URL` | SQLAlchemy database connection string |
 
### Frontend
 
| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL |
 
---
 
## Deployment
 
### Frontend
 
Hosted on **Vercel**
 
```
https://smart-campus-kqqa.vercel.app
```
 
Environment variable:
 
```
VITE_API_URL=https://smart-campus-backend.up.railway.app
```
 
### Backend
 
Hosted on **Railway**
 
Environment variables:
 
```
SECRET_KEY=
DATABASE_URL=
```
 
> **Note:** The `faces/` directory stores registered student face images. In production, consider migrating this to an object storage service (e.g., AWS S3) for persistence across deployments.
 
---
 
## API Endpoints
 
### Authentication
 
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/login` | Login for all roles |
| `POST` | `/student/signup` | New student registration |
 
### Student
 
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/student/register-face-signup` | Face registration during signup (pre-approval) |
| `POST` | `/student/register-face` | Face re-registration (approved student) |
| `POST` | `/student/validate-location/{session_id}` | Step 1 — GPS proximity check |
| `POST` | `/student/verify-and-mark/{session_id}` | Step 2 — Face verify and mark present |
| `GET` | `/student/attendance-percentage` | Attendance summary |
| `GET` | `/student/timetable` | Today's timetable |
| `GET` | `/student/profile` | Student profile |
| `PUT` | `/student/update-interests` | Update interests for recommendations |
| `GET` | `/student/recommendations` | NEP course recommendations |
 
### Faculty
 
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/faculty/generate-qr/{faculty_id}/{period}` | Generate period-locked QR session |
| `GET` | `/faculty/attendance/{period}` | View today's attendance roster |
| `POST` | `/faculty/mark-manual` | Manually mark a student present |
| `GET` | `/faculty/timetable/{day}` | Weekly timetable for a given day |
 
### Admin
 
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/pending-students` | List unapproved students |
| `POST` | `/admin/approve/{student_id}` | Approve a student account |
| `GET` | `/admin/stats` | Platform-wide statistics |
 
---
 
## Demo Credentials
 
### Admin
 
| Field | Value |
|---|---|
| Email | `admin@campus.com` |
| Password | `Admin@123` |
 
### Faculty
 
| Field | Value |
|---|---|
| Email | `faculty@campus.com` |
| Password | `Faculty@123` |
 
### Student
 
Create a new account using the Register page. Admin approval is required before first login.
 
---
 
## Future Enhancements
 
- Aadhaar / college ID verification integration
- Push notifications for attendance alerts
- Persistent cloud storage for face images (AWS S3 / Azure Blob)
- PostgreSQL migration for production-grade persistence
- Export attendance reports to CSV / Excel
- Parent portal for attendance monitoring
- Mobile app (React Native)
- Multi-department and multi-batch support
- Analytics dashboard with attendance trends
- Liveness detection to prevent photo spoofing
---
 
## Author
 
**Mounika Sanaboyina**
 
B.Tech – Computer Science (AI & Data Science)
 
GitHub: https://github.com/Mouni-Sanaboyina
 
Project: https://smart-campus-kqqa.vercel.app
 
If you found this project useful, consider giving the repository a ⭐ on GitHub.
 
---
 
## About
 
Smart Campus is an AI-powered attendance automation platform built with React, FastAPI, SQLAlchemy, and dlib face_recognition. It enforces a mandatory three-layer verification — QR scan, GPS proximity, and facial biometrics — to eliminate proxy attendance in educational institutions.
