from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    name            = Column(String,  nullable=False)
    email           = Column(String,  unique=True, nullable=False, index=True)
    password        = Column(String,  nullable=False)
    role            = Column(String,  nullable=False)   # admin / faculty / student
    department      = Column(String,  nullable=True)
    face_registered = Column(Boolean, default=False)
    is_approved     = Column(Boolean, default=False)
    interests       = Column(String,  nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)


class FacultySchedule(Base):
    __tablename__ = "faculty_schedule"

    id           = Column(Integer, primary_key=True, index=True)
    faculty_id   = Column(Integer, ForeignKey("users.id"), nullable=False)
    day_of_week  = Column(Integer, nullable=False)   # 0=Mon … 5=Sat
    period       = Column(String,  nullable=False)   # "P1" … "P6"
    subject      = Column(String,  nullable=False)
    subject_code = Column(String,  nullable=True)
    section      = Column(String,  nullable=True)
    class_type   = Column(String,  nullable=True)    # "theory" | "lab"
    room_no      = Column(String,  nullable=False)
    start_time   = Column(String,  nullable=False)   # "09:00"
    end_time     = Column(String,  nullable=False)   # "09:50"


class QRSession(Base):
    __tablename__ = "qr_sessions"

    id         = Column(Integer, primary_key=True, index=True)
    faculty_id = Column(Integer, nullable=False)
    date       = Column(String,  nullable=False)
    period     = Column(String,  nullable=False)
    is_active  = Column(Boolean, default=True)
    expires_at = Column(DateTime, nullable=True)
    latitude   = Column(Float, nullable=True)
    longitude  = Column(Float, nullable=True)


class Attendance(Base):
    __tablename__ = "attendance"

    id         = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    faculty_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date       = Column(String,  nullable=False)
    period     = Column(String,  nullable=False)
    status     = Column(String,  nullable=False)   # present / absent
    marked_by  = Column(String,  default="student")  # "student" | "faculty"


class NEPCourse(Base):
    __tablename__ = "nep_courses"

    id          = Column(Integer, primary_key=True, index=True)
    title       = Column(String, nullable=False)
    category    = Column(String, nullable=False)
    skill_tag   = Column(String, nullable=False)
    duration    = Column(String, nullable=False)
    platform    = Column(String, nullable=True)   # e.g. "NPTEL / Coursera"
    description = Column(String, nullable=True)   # short course description