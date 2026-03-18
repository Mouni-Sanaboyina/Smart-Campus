import {
  LayoutDashboard,
  Users,
  UserCog,
  CalendarCheck,
  BrainCircuit,
  Sparkles,
  Settings
} from "lucide-react"
import { NavLink } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function Sidebar() {
  const { user } = useAuth()

  if (!user) return null

  const linkStyle =
    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200"

  const activeStyle =
    "bg-blue-100 text-blue-700 border-l-4 border-blue-600"

  const inactiveStyle =
    "text-gray-600 hover:bg-gray-100"

  return (
    <div className="w-64 bg-white shadow-lg flex flex-col p-6">

      <h2 className="text-2xl font-bold text-blue-700 mb-10">
        Smart Campus
      </h2>

      <div className="space-y-6">

        {/* ADMIN */}
        {user.role === "admin" && (
          <>
            <div>
              <p className="text-xs text-gray-400 uppercase mb-3">Main</p>
              <NavLink to="/admin/dashboard"
                className={({ isActive }) => `${linkStyle} ${isActive ? activeStyle : inactiveStyle}`}>
                <LayoutDashboard size={18} /> Dashboard
              </NavLink>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase mb-3">Management</p>
              <NavLink to="/admin/students"
                className={({ isActive }) => `${linkStyle} ${isActive ? activeStyle : inactiveStyle}`}>
                <Users size={18} /> Students
              </NavLink>
              <NavLink to="/admin/faculty"
                className={({ isActive }) => `${linkStyle} ${isActive ? activeStyle : inactiveStyle}`}>
                <UserCog size={18} /> Faculty
              </NavLink>
            </div>
          </>
        )}

        {/* FACULTY */}
        {user.role === "faculty" && (
          <div>
            <p className="text-xs text-gray-400 uppercase mb-3">Main</p>
            <NavLink to="/faculty/dashboard"
              className={({ isActive }) => `${linkStyle} ${isActive ? activeStyle : inactiveStyle}`}>
              <LayoutDashboard size={18} /> Dashboard
            </NavLink>
            <NavLink to="/faculty/attendance"
              className={({ isActive }) => `${linkStyle} ${isActive ? activeStyle : inactiveStyle}`}>
              <CalendarCheck size={18} /> Attendance
            </NavLink>
            <NavLink to="/faculty/curriculum"
              className={({ isActive }) => `${linkStyle} ${isActive ? activeStyle : inactiveStyle}`}>
              <CalendarCheck size={18} /> Curriculum
            </NavLink>
          </div>
        )}

        {/* STUDENT */}
        {user.role === "student" && (
          <>
            <div>
              <p className="text-xs text-gray-400 uppercase mb-3">Main</p>

              <NavLink to="/student/dashboard"
                className={({ isActive }) => `${linkStyle} ${isActive ? activeStyle : inactiveStyle}`}>
                <LayoutDashboard size={18} /> Dashboard
              </NavLink>

              <NavLink to="/student/attendance"
                className={({ isActive }) => `${linkStyle} ${isActive ? activeStyle : inactiveStyle}`}>
                <CalendarCheck size={18} /> Attendance
              </NavLink>
            </div>

            <div>
              <p className="text-xs text-gray-400 uppercase mb-3">Learning</p>

              {/* Skills & Interests — new tab */}
              <NavLink to="/student/skills"
                className={({ isActive }) => `${linkStyle} ${isActive ? activeStyle : inactiveStyle}`}>
                <Sparkles size={18} /> Skills & Interests
              </NavLink>

              <NavLink to="/student/recommendations"
                className={({ isActive }) => `${linkStyle} ${isActive ? activeStyle : inactiveStyle}`}>
                <BrainCircuit size={18} /> NEP Programs
              </NavLink>
            </div>
          </>
        )}

        {/* SETTINGS FOR ALL */}
        <div>
          <p className="text-xs text-gray-400 uppercase mb-3">System</p>
          <NavLink to="/settings"
            className={({ isActive }) => `${linkStyle} ${isActive ? activeStyle : inactiveStyle}`}>
            <Settings size={18} /> Settings
          </NavLink>
        </div>

      </div>
    </div>
  )
}