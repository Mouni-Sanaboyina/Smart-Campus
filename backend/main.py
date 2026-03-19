from fastapi import FastAPI, HTTPException, Body, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime
from math import radians, sin, cos, sqrt, atan2
import os, base64, io, sys

from database import engine, Base, get_db
from models import User, QRSession, Attendance, FacultySchedule, NEPCourse
from schemas import LoginRequest, StudentSignup
from utils import verify_password, hash_password
from auth import create_access_token, get_current_user
from seed import seed_data, PERIOD_TIMES, ALL_PERIODS

# ── face_recognition is REQUIRED — no fallback ────────────────────────────────
# If this import fails, the server will not start.
# Install: pip install cmake dlib face_recognition Pillow numpy
try:
    import face_recognition
    import numpy as np
    from PIL import Image
    print("✅ face_recognition loaded — biometric verification active")
except ImportError as e:
    print("=" * 60)
    print("❌ STARTUP FAILED: face_recognition is not installed.")
    print("   Run: pip install cmake dlib face_recognition Pillow numpy")
    print(f"   Error: {e}")
    print("=" * 60)
    sys.exit(1)   # Hard stop — do not start without face recognition


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "https://smart-campus-kqqa.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

# ── SQLite migration: safely add new columns without deleting the DB ──────────
def _run_migrations():
    from sqlalchemy import text
    with engine.connect() as conn:
        existing = {row[1] for row in conn.execute(text("PRAGMA table_info(nep_courses)"))}
        if "platform" not in existing:
            conn.execute(text("ALTER TABLE nep_courses ADD COLUMN platform VARCHAR"))
            conn.commit()
        if "description" not in existing:
            conn.execute(text("ALTER TABLE nep_courses ADD COLUMN description VARCHAR"))
            conn.commit()

_run_migrations()
seed_data()

FACE_DIR = "faces"
os.makedirs(FACE_DIR, exist_ok=True)

GPS_RADIUS_METERS = 100
FACE_TOLERANCE    = 0.5   # strict: default is 0.6, lower = stricter match required


# ── Helpers ───────────────────────────────────────────────────────────────────

def haversine(lat1, lon1, lat2, lon2) -> float:
    R = 6_371_000
    phi1, phi2 = radians(lat1), radians(lat2)
    dphi = radians(lat2 - lat1)
    dlam = radians(lon2 - lon1)
    a    = sin(dphi/2)**2 + cos(phi1)*cos(phi2)*sin(dlam/2)**2
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))


def decode_base64_image(b64_string: str) -> bytes:
    if "," in b64_string:
        b64_string = b64_string.split(",")[1]
    return base64.b64decode(b64_string)


def image_bytes_to_array(img_bytes: bytes):
    """Convert raw JPEG bytes → numpy RGB array for face_recognition."""
    pil = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    return np.array(pil)


def get_face_encoding(img_array, context: str):
    """
    Extract face encoding from a numpy image array.
    Raises HTTPException with a clear message if no face is found.
    context: "registered" | "live" — used in error messages
    """
    locations = face_recognition.face_locations(img_array)
    if len(locations) == 0:
        if context == "registered":
            raise HTTPException(
                500,
                "Registered photo has no detectable face. "
                "Admin must ask the student to re-register their face."
            )
        else:
            raise HTTPException(
                400,
                "No face detected in camera. "
                "Look straight at the camera, ensure good lighting, remove glasses."
            )
    encodings = face_recognition.face_encodings(img_array, locations)
    return encodings[0]


def verify_face_match(student_id: int, live_image_bytes: bytes) -> tuple[bool, str, float]:
    """
    Mandatory face comparison.
    Returns: (matched: bool, message: str, distance: float)
    Raises HTTPException if registered face file is missing or has no face.
    """
    registered_path = os.path.join(FACE_DIR, f"{student_id}.jpg")

    if not os.path.exists(registered_path):
        raise HTTPException(
            403,
            "No registered face on file. Go to Dashboard and register your face first."
        )

    # Load and encode the registered face
    known_array    = np.array(Image.open(registered_path).convert("RGB"))
    known_encoding = get_face_encoding(known_array, "registered")

    # Encode the live webcam image
    live_array    = image_bytes_to_array(live_image_bytes)
    live_encoding = get_face_encoding(live_array, "live")

    # Compare
    distance  = float(face_recognition.face_distance([known_encoding], live_encoding)[0])
    matched   = bool(face_recognition.compare_faces(
        [known_encoding], live_encoding, tolerance=FACE_TOLERANCE
    )[0])

    if matched:
        confidence = round((1 - distance) * 100, 1)
        return True, f"Face matched ✅ ({confidence}% confidence)", distance
    else:
        return False, (
            f"Face does not match your registered photo. "
            f"Match score: {round((1-distance)*100,1)}% (need ≥{round((1-FACE_TOLERANCE)*100)}%). "
            "Ensure good lighting and look straight at the camera."
        ), distance


# ── Root ──────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "Smart Campus Backend Running", "face_recognition": True}


# ── Login ─────────────────────────────────────────────────────────────────────
@app.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.password):
        raise HTTPException(400, "Invalid credentials")
    if user.role != request.selected_role:
        raise HTTPException(403, "Role mismatch")
    if user.role == "student" and not user.is_approved:
        raise HTTPException(403, "Admin approval pending")
    token = create_access_token({"user_id": user.id})
    return {"access_token": token, "role": user.role, "id": user.id,
            "name": user.name, "face_registered": user.face_registered}


# ── Student Signup ────────────────────────────────────────────────────────────
@app.post("/student/signup")
def student_signup(request: StudentSignup, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == request.email).first():
        raise HTTPException(400, "Email already registered")
    db.add(User(
        name=request.name, email=request.email,
        password=hash_password(request.password),
        role="student", department="CSE(AI&DS)",
        face_registered=False, is_approved=False,
        interests=request.interests
    ))
    db.commit()
    return {"message": "Signup successful. Waiting for admin approval."}


# ── Register Face — pre-approval (no JWT needed) ──────────────────────────────
@app.post("/student/register-face-signup")
def register_face_signup(payload: dict = Body(...), db: Session = Depends(get_db)):
    """
    Called right after signup. Student not approved yet so no JWT.
    Authenticated by email + password.
    Face is validated (must contain exactly one clear face) before saving.
    """
    email      = payload.get("email")
    password   = payload.get("password")
    image_data = payload.get("image")

    if not email or not password or not image_data:
        raise HTTPException(400, "email, password and image are required")

    student = db.query(User).filter(User.email == email, User.role == "student").first()
    if not student:
        raise HTTPException(404, "Student not found")
    if not verify_password(password, student.password):
        raise HTTPException(403, "Wrong password")

    try:
        img_bytes = decode_base64_image(image_data)
    except Exception:
        raise HTTPException(400, "Invalid image format")

    # ✅ Validate face exists in the photo before saving
    img_array  = image_bytes_to_array(img_bytes)
    locations  = face_recognition.face_locations(img_array)

    if len(locations) == 0:
        raise HTTPException(
            400,
            "No face detected in the photo. "
            "Please retake with your face clearly visible, good lighting, no sunglasses."
        )
    if len(locations) > 1:
        raise HTTPException(
            400,
            f"{len(locations)} faces detected. Photo must contain only your face."
        )

    with open(os.path.join(FACE_DIR, f"{student.id}.jpg"), "wb") as f:
        f.write(img_bytes)

    student.face_registered = True
    db.commit()
    return {"message": "Face registered successfully! Waiting for admin approval to login."}


# ── Register Face — authenticated (approved students) ─────────────────────────
@app.post("/student/register-face")
def register_face(
    image: dict = Body(...),
    cu: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if cu.role != "student":
        raise HTTPException(403, "Access denied")

    image_data = image.get("image")
    if not image_data:
        raise HTTPException(400, "No image provided")

    try:
        img_bytes = decode_base64_image(image_data)
    except Exception:
        raise HTTPException(400, "Invalid image format")

    img_array = image_bytes_to_array(img_bytes)
    locations = face_recognition.face_locations(img_array)

    if len(locations) == 0:
        raise HTTPException(400, "No face detected. Look straight at camera with good lighting.")
    if len(locations) > 1:
        raise HTTPException(400, f"{len(locations)} faces detected. Only your face should be in the frame.")

    with open(os.path.join(FACE_DIR, f"{cu.id}.jpg"), "wb") as f:
        f.write(img_bytes)

    db.query(User).filter(User.id == cu.id).update({"face_registered": True})
    db.commit()
    return {"message": "Face registered successfully"}


# ── Step 1: Validate Location ──────────────────────────────────────────────────
@app.post("/student/validate-location/{session_id}")
def validate_location(
    session_id: int,
    payload: dict = Body(default={}),
    cu: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if cu.role != "student":
        raise HTTPException(403, "Access denied")

    session = db.query(QRSession).filter(
        QRSession.id == session_id, QRSession.is_active == True
    ).first()
    if not session:
        raise HTTPException(404, "Invalid or expired QR session. Ask faculty to regenerate.")

    today = datetime.now().date().isoformat()
    if session.date != today:
        raise HTTPException(400, "This QR is from a different day.")
    if session.expires_at and session.expires_at < datetime.now():
        raise HTTPException(400, f"Period ended at {session.expires_at.strftime('%H:%M')}. QR expired.")

    # No GPS stored in QR → skip location check, proceed to face
    if session.latitude is None or session.longitude is None:
        return {"message": "Location check skipped (faculty did not share location)", "gps_validated": False}

    student_lat = payload.get("latitude")
    student_lng = payload.get("longitude")
    if student_lat is None or student_lng is None:
        raise HTTPException(
            400,
            "Could not read your GPS location. "
            "Please enable location permission in your browser and try again."
        )

    dist = haversine(session.latitude, session.longitude, student_lat, student_lng)
    if dist > GPS_RADIUS_METERS:
        raise HTTPException(
            400,
            f"You are {int(dist)}m away from the classroom. "
            f"Must be within {GPS_RADIUS_METERS}m. Are you physically present in class?"
        )

    return {
        "message": f"Location verified ✅ — you are {int(dist)}m from the classroom.",
        "gps_validated": True,
        "distance_meters": int(dist)
    }


# ── Step 2: Verify Face + Mark Attendance ────────────────────────────────────
@app.post("/student/verify-and-mark/{session_id}")
def verify_and_mark(
    session_id: int,
    payload: dict = Body(...),
    cu: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    MANDATORY: Face must match registered photo. No exceptions, no fallback.
    Flow: validate session → check duplicate → verify face → mark present
    """
    if cu.role != "student":
        raise HTTPException(403, "Only students can mark attendance")
    if not cu.is_approved:
        raise HTTPException(403, "Your account is pending admin approval")
    if not cu.face_registered:
        raise HTTPException(403, "Face not registered. Go to Dashboard and register your face.")

    session = db.query(QRSession).filter(
        QRSession.id == session_id, QRSession.is_active == True
    ).first()
    if not session:
        raise HTTPException(404, "Invalid QR session. Ask faculty to regenerate.")

    today = datetime.now().date().isoformat()
    if session.date != today:
        raise HTTPException(400, "QR is from a different day.")
    if session.expires_at and session.expires_at < datetime.now():
        raise HTTPException(400, "Class period has ended. QR is no longer valid.")

    # Duplicate check
    if db.query(Attendance).filter(
        Attendance.student_id == cu.id,
        Attendance.date == session.date,
        Attendance.period == session.period
    ).first():
        raise HTTPException(409, "Attendance already marked for this period.")

    # ── MANDATORY FACE VERIFICATION ───────────────────────────────────────────
    image_data = payload.get("image")
    if not image_data:
        raise HTTPException(400, "Face image is required to mark attendance.")

    try:
        live_bytes = decode_base64_image(image_data)
    except Exception:
        raise HTTPException(400, "Invalid image data received from camera.")

    # This raises HTTPException itself if face not found or registered photo missing
    matched, face_message, distance = verify_face_match(cu.id, live_bytes)

    # ✅ HARD BLOCK — attendance NOT marked if face doesn't match
    if not matched:
        raise HTTPException(
            403,
            f"❌ Face verification failed. {face_message} "
            "Attendance has NOT been marked. Contact faculty if this is an error."
        )

    # ── All checks passed — mark present ─────────────────────────────────────
    db.add(Attendance(
        student_id=cu.id,
        faculty_id=session.faculty_id,
        date=session.date,
        period=session.period,
        status="present",
        marked_by="student"
    ))
    db.commit()

    return {
        "message": "Attendance marked successfully ✅",
        "face_result": face_message,
        "period": session.period,
        "date": session.date,
    }


# ── Admin ─────────────────────────────────────────────────────────────────────
@app.get("/admin/pending-students")
def pending_students(cu: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if cu.role != "admin": raise HTTPException(403, "Access denied")
    rows = db.query(User).filter(User.role == "student", User.is_approved == False).all()
    return [{"id": s.id, "name": s.name, "email": s.email,
             "face_registered": s.face_registered} for s in rows]

@app.post("/admin/approve/{student_id}")
def approve_student(student_id: int, cu: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if cu.role != "admin": raise HTTPException(403, "Access denied")
    s = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if not s: raise HTTPException(404, "Student not found")
    s.is_approved = True
    db.commit()
    return {"message": "Approved"}

@app.get("/admin/stats")
def admin_stats(cu: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if cu.role != "admin": raise HTTPException(403, "Access denied")
    return {
        "total_students":   db.query(User).filter(User.role == "student").count(),
        "total_faculty":    db.query(User).filter(User.role == "faculty").count(),
        "pending_students": db.query(User).filter(User.role == "student", User.is_approved == False).count(),
    }


# ── Generate QR ───────────────────────────────────────────────────────────────
@app.post("/faculty/generate-qr/{faculty_id}/{period}")
def generate_qr(
    faculty_id: int, period: str,
    payload: dict = Body(default={}),
    cu: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if cu.role != "faculty": raise HTTPException(403, "Only faculty can generate QR")
    if cu.id != faculty_id:  raise HTTPException(403, "Cannot generate QR for another faculty")

    now          = datetime.now()
    today_str    = now.date().isoformat()
    current_time = now.strftime("%H:%M")

    schedule = db.query(FacultySchedule).filter(
        FacultySchedule.faculty_id == faculty_id,
        FacultySchedule.day_of_week == now.weekday(),
        FacultySchedule.period == period
    ).first()
    if not schedule:
        raise HTTPException(403, "No class scheduled for this period today")
    if not (schedule.start_time <= current_time <= schedule.end_time):
        raise HTTPException(403, f"Not class time. Class: {schedule.start_time}–{schedule.end_time}")

    existing = db.query(QRSession).filter(
        QRSession.faculty_id == faculty_id, QRSession.date == today_str,
        QRSession.period == period, QRSession.is_active == True
    ).first()
    if existing and existing.expires_at > now:
        return _qr_response(existing, schedule)

    eh, em     = map(int, schedule.end_time.split(":"))
    period_end = now.replace(hour=eh, minute=em, second=0, microsecond=0)

    session = QRSession(
        faculty_id=faculty_id, date=today_str, period=period,
        is_active=True, expires_at=period_end,
        latitude=payload.get("latitude"),
        longitude=payload.get("longitude")
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return _qr_response(session, schedule)


def _qr_response(session, schedule):
    return {
        "session_id": session.id, "period": session.period,
        "subject": schedule.subject, "room_no": schedule.room_no,
        "start_time": schedule.start_time, "end_time": schedule.end_time,
        "has_gps": session.latitude is not None,
    }


# ── Manual Mark ───────────────────────────────────────────────────────────────
@app.post("/faculty/mark-manual")
def manual_mark(payload: dict = Body(...), cu: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if cu.role != "faculty": raise HTTPException(403, "Access denied")
    student_id = payload.get("student_id")
    period     = payload.get("period")
    date       = payload.get("date") or datetime.now().date().isoformat()
    if not student_id or not period: raise HTTPException(400, "student_id and period required")
    student = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if not student: raise HTTPException(404, "Student not found")
    existing = db.query(Attendance).filter(
        Attendance.student_id == student_id,
        Attendance.date == date, Attendance.period == period
    ).first()
    if existing:
        if existing.status == "present": raise HTTPException(409, "Already marked present")
        existing.status = "present"; existing.marked_by = "faculty"
        db.commit()
        return {"message": f"{student.name} updated to present"}
    db.add(Attendance(student_id=student_id, faculty_id=cu.id,
                      date=date, period=period, status="present", marked_by="faculty"))
    db.commit()
    return {"message": f"{student.name} marked present manually ✅"}


# ── Faculty Attendance View ────────────────────────────────────────────────────
@app.get("/faculty/attendance/{period}")
def view_attendance(period: str, cu: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if cu.role != "faculty": raise HTTPException(403, "Access denied")
    today    = datetime.now().date().isoformat()
    students = db.query(User).filter(User.role == "student", User.is_approved == True).all()
    records  = db.query(Attendance).filter(
        Attendance.faculty_id == cu.id, Attendance.date == today, Attendance.period == period
    ).all()
    present_ids = {r.student_id: r.marked_by for r in records}
    return {
        "date": today, "period": period,
        "present": [{"id": s.id, "name": s.name, "marked_by": present_ids[s.id]}
                    for s in students if s.id in present_ids],
        "absent":  [{"id": s.id, "name": s.name}
                    for s in students if s.id not in present_ids],
    }


# ── Faculty Timetable ─────────────────────────────────────────────────────────
@app.get("/faculty/timetable/{day}")
def get_timetable(day: int, cu: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if cu.role != "faculty": raise HTTPException(403, "Access denied")
    scheduled = db.query(FacultySchedule).filter(
        FacultySchedule.faculty_id == cu.id, FacultySchedule.day_of_week == day
    ).all()
    scheduled_periods = {s.period for s in scheduled}
    result = []
    for p in ALL_PERIODS:
        start, end = PERIOD_TIMES[p]
        if p in scheduled_periods:
            s = next(x for x in scheduled if x.period == p)
            result.append({"period": p, "subject": s.subject, "subject_code": s.subject_code,
                           "section": s.section, "class_type": s.class_type, "room_no": s.room_no,
                           "start_time": s.start_time, "end_time": s.end_time, "is_free": False})
        else:
            result.append({"period": p, "subject": "Free Period", "subject_code": None,
                           "section": None, "class_type": None, "room_no": None,
                           "start_time": start, "end_time": end, "is_free": True})
    return result


# ── Student Timetable ─────────────────────────────────────────────────────────
@app.get("/student/timetable")
def student_timetable(cu: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if cu.role != "student": raise HTTPException(403, "Access denied")
    day  = datetime.now().weekday()
    rows = db.query(FacultySchedule, User).join(User, FacultySchedule.faculty_id == User.id).filter(
        FacultySchedule.day_of_week == day).all()
    period_map = {s.period: {"period": s.period, "subject": s.subject, "subject_code": s.subject_code,
        "class_type": s.class_type, "room_no": s.room_no, "faculty_name": f.name,
        "start_time": s.start_time, "end_time": s.end_time, "is_free": False} for s, f in rows}
    result = []
    for p in ALL_PERIODS:
        start, end = PERIOD_TIMES[p]
        result.append(period_map.get(p, {"period": p, "subject": "Free Period", "subject_code": None,
            "class_type": None, "room_no": None, "faculty_name": None,
            "start_time": start, "end_time": end, "is_free": True}))
    return result


# ── Attendance Percentage ─────────────────────────────────────────────────────
@app.get("/student/attendance-percentage")
def attendance_pct(cu: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if cu.role != "student": raise HTTPException(403, "Access denied")
    total   = db.query(Attendance).filter(Attendance.student_id == cu.id).count()
    present = db.query(Attendance).filter(Attendance.student_id == cu.id, Attendance.status == "present").count()
    return {"total_classes": total, "present_classes": present,
            "percentage": round((present/total)*100, 2) if total else 0,
            "face_registered": cu.face_registered}


# ── Student Profile ───────────────────────────────────────────────────────────
@app.get("/student/profile")
def get_student_profile(cu: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if cu.role != "student":
        raise HTTPException(403, "Access denied")
    return {
        "id":         cu.id,
        "name":       cu.name,
        "email":      cu.email,
        "department": cu.department,
        "interests":  cu.interests or "",
    }


# ── Update Interests ──────────────────────────────────────────────────────────
@app.put("/student/update-interests")
def update_interests(
    payload: dict = Body(...),
    cu: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if cu.role != "student":
        raise HTTPException(403, "Access denied")
    interests = (payload.get("interests") or "").strip()
    if not interests:
        raise HTTPException(400, "Interests cannot be empty")
    db.query(User).filter(User.id == cu.id).update({"interests": interests})
    db.commit()
    return {"message": "Interests updated successfully", "interests": interests}


# ── NEP Recommendations — improved scoring ────────────────────────────────────
@app.get("/student/recommendations")
def recommendations(cu: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if cu.role != "student":
        raise HTTPException(403, "Access denied")

    courses = db.query(NEPCourse).all()
    raw     = (cu.interests or "").lower()

    # Tokenise: split on spaces and commas, drop very short tokens
    interest_words = set(
        w for w in raw.replace(",", " ").split()
        if len(w) > 2
    )

    def score(c):
        tag_words   = set(c.skill_tag.lower().replace(",", " ").replace("-", " ").split())
        title_words = set(c.title.lower().split())
        tag_hits    = sum(2 for w in interest_words if w in tag_words)
        title_hits  = sum(1 for w in interest_words if w in title_words)
        # Partial match bonus (e.g. "ml" inside "machine-learning")
        partial = sum(
            1 for iw in interest_words
            for tw in tag_words
            if tw != iw and len(iw) > 2 and (iw in tw or tw in iw)
        )
        return tag_hits + title_hits + partial

    scored = sorted(courses, key=score, reverse=True)

    return [
        {
            "id":          c.id,
            "title":       c.title,
            "category":    c.category,
            "skill_tag":   c.skill_tag,
            "duration":    c.duration,
            "platform":    c.platform    or "",
            "description": c.description or "",
            "score":       score(c),
        }
        for c in scored
    ]


# ── Debug ─────────────────────────────────────────────────────────────────────
@app.get("/users")
def get_users(db: Session = Depends(get_db)):
    return [{"id": u.id, "name": u.name, "email": u.email,
             "role": u.role, "face_registered": u.face_registered, "is_approved": u.is_approved}
            for u in db.query(User).all()]