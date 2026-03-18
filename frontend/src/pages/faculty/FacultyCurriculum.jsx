import { useEffect, useState } from "react"
import MainLayout from "../../layouts/MainLayout"
import { getFacultyTimetable } from "../../services/api"

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

function useClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

export default function FacultyCurriculum() {
  const now       = useClock()
  const todayIdx  = now.getDay() === 0 ? -1 : now.getDay() - 1
  const todayName = todayIdx >= 0 ? DAY_NAMES[todayIdx] : "Sunday"
  const currentTime = now.toTimeString().slice(0, 5)

  const [schedule, setSchedule]   = useState([])
  const [loading,  setLoading]    = useState(true)
  const [error,    setError]      = useState("")

  useEffect(() => {
    if (todayIdx < 0) { setLoading(false); return }
    getFacultyTimetable(todayIdx)
      .then(setSchedule)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [todayIdx])

  const getStatus = (item) => {
    if (item.is_free) return "free"
    if (currentTime < item.start_time)  return "upcoming"
    if (currentTime <= item.end_time)   return "ongoing"
    return "done"
  }

  const ongoingClass = schedule.find(s => getStatus(s) === "ongoing")

  // Progress % for the live bar
  const progressPct = (item) => {
    const [sh, sm] = item.start_time.split(":").map(Number)
    const [eh, em] = item.end_time.split(":").map(Number)
    const totalSec   = (eh * 60 + em - (sh * 60 + sm)) * 60
    const elapsedSec = (now.getHours() * 60 + now.getMinutes() - (sh * 60 + sm)) * 60 + now.getSeconds()
    return Math.min(100, Math.max(0, Math.round((elapsedSec / totalSec) * 100)))
  }

  return (
    <MainLayout>
      <div className="mt-6 max-w-5xl">

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Today's Curriculum</h2>
            <p className="text-gray-500 text-sm mt-1">
              {todayName} · {now.toLocaleDateString("en-IN", { year:"numeric", month:"long", day:"numeric" })}
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow px-5 py-3 text-right border border-gray-100">
            <p className="text-xl font-bold text-blue-700 tabular-nums">
              {now.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", second:"2-digit" })}
            </p>
            <p className="text-xs text-gray-400">Live</p>
          </div>
        </div>

        {/* Ongoing banner */}
        {ongoingClass && (
          <div className="mb-5 bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-2xl px-6 py-4 flex items-center gap-4 shadow-lg">
            <span className="animate-pulse text-2xl">🔴</span>
            <div className="flex-1">
              <p className="font-bold">Class in Progress — {ongoingClass.subject}</p>
              <p className="text-sm opacity-90">
                {ongoingClass.section} · Room {ongoingClass.room_no} · {ongoingClass.period} · until {ongoingClass.end_time}
              </p>
              <div className="mt-2 bg-white/30 rounded-full h-2">
                <div
                  className="bg-white h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${progressPct(ongoingClass)}%` }}
                />
              </div>
            </div>
            <span className="text-3xl font-bold">{progressPct(ongoingClass)}%</span>
          </div>
        )}

        {loading && <p className="text-gray-400 animate-pulse">Loading timetable...</p>}
        {error   && <p className="text-red-500 text-sm">{error}</p>}

        {todayIdx < 0 && !loading && (
          <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-400">
            No classes on Sunday 🎉
          </div>
        )}

        {/* ── Table — matches the screenshot exactly ── */}
        {!loading && schedule.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100">

            {/* Sub-header */}
            <div className="px-6 py-4 border-b flex items-center gap-2">
              <span className="text-blue-600 text-xl">📅</span>
              <h3 className="font-semibold text-gray-800">Today's Curriculum</h3>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-left">
                  <th className="px-6 py-3 font-semibold text-center">Period</th>
                  <th className="px-6 py-3 font-semibold">Time</th>
                  <th className="px-6 py-3 font-semibold">Section</th>
                  <th className="px-6 py-3 font-semibold">Subject</th>
                  <th className="px-6 py-3 font-semibold">Room</th>
                  <th className="px-6 py-3 font-semibold">Type</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((item, i) => {
                  const status = getStatus(item)

                  const rowBg =
                    status === "ongoing"  ? "bg-green-50 border-l-4 border-green-500" :
                    status === "free"     ? "bg-amber-50" :
                    status === "done"     ? "opacity-50" : ""

                  const badge =
                    status === "ongoing"  ? <span className="px-2 py-0.5 bg-green-600 text-white rounded-full text-xs font-medium animate-pulse">Ongoing</span> :
                    status === "free"     ? <span className="px-2 py-0.5 bg-amber-400 text-white rounded-full text-xs font-medium">Free</span> :
                    status === "done"     ? <span className="px-2 py-0.5 bg-gray-300 text-gray-600 rounded-full text-xs">Done</span> :
                                           <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">Upcoming</span>

                  const typeColor =
                    item.class_type === "lab" ? "text-purple-700 bg-purple-100" :
                    item.class_type === "theory" ? "text-blue-700 bg-blue-100" : ""

                  return (
                    <tr key={i} className={`border-b transition ${rowBg} hover:bg-gray-50`}>
                      {/* Period number — just the digit like screenshot */}
                      <td className="px-6 py-4 text-center font-bold text-gray-700">
                        {item.period.replace("P", "")}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs tabular-nums">
                        {item.start_time} – {item.end_time}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {item.section || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        {item.is_free ? (
                          <span className="text-amber-600 font-medium italic">Free Period</span>
                        ) : (
                          <div>
                            <p className="font-medium text-gray-800">{item.subject_code}</p>
                            <p className="text-xs text-gray-400">{item.subject}</p>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {item.room_no || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        {item.class_type ? (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColor}`}>
                            {item.class_type}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-6 py-4">{badge}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </MainLayout>
  )
}