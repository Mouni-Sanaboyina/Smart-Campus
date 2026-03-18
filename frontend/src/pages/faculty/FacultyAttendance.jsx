import { useEffect, useState } from "react"
import MainLayout from "../../layouts/MainLayout"
import { getFacultyAttendance } from "../../services/api"

const PERIODS = ["P1", "P2", "P3", "P4", "P5", "P6"]

export default function FacultyAttendance() {
  const [period, setPeriod] = useState("P1")
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // ✅ FIX: Uses getFacultyAttendance() from api.js — sends JWT token automatically
  // ✅ FIX: faculty_id no longer in URL — backend reads identity from JWT
  const fetchAttendance = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await getFacultyAttendance(period)
      setData(res)
    } catch (err) {
      setError(err.message || "Failed to fetch attendance")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAttendance()
  }, [])

  const totalStudents = data ? data.present.length + data.absent.length : 0
  const presentPct = totalStudents > 0
    ? Math.round((data.present.length / totalStudents) * 100)
    : 0

  return (
    <MainLayout>
      <div className="mt-6">

        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Period-wise Attendance
        </h2>

        {/* Period Selector + Load */}
        <div className="flex flex-wrap gap-2 mb-6 items-center">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                period === p
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {p}
            </button>
          ))}

          <button
            onClick={fetchAttendance}
            disabled={loading}
            className="ml-auto px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-60"
          >
            {loading ? "Loading..." : "Load Attendance"}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Summary Bar */}
        {data && totalStudents > 0 && (
          <div className="mb-6 bg-white rounded-2xl shadow p-4 flex items-center gap-6">
            <div>
              <p className="text-xs text-gray-400">Total</p>
              <p className="text-2xl font-bold text-gray-800">{totalStudents}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Present</p>
              <p className="text-2xl font-bold text-green-600">{data.present.length}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Absent</p>
              <p className="text-2xl font-bold text-red-500">{data.absent.length}</p>
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-1">Attendance Rate</p>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-700 ${
                    presentPct >= 75 ? "bg-green-500" : "bg-red-400"
                  }`}
                  style={{ width: `${presentPct}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{presentPct}%</p>
            </div>
          </div>
        )}

        {/* Present / Absent Lists */}
        {data && (
          <div className="grid md:grid-cols-2 gap-6">

            <div className="bg-white p-6 rounded-2xl shadow-md">
              <h3 className="font-semibold text-green-700 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                Present ({data.present.length})
              </h3>
              {data.present.length === 0 ? (
                <p className="text-gray-400 text-sm">No students present yet</p>
              ) : (
                <ul className="space-y-2">
                  {data.present.map((s) => (
                    <li key={s.id} className="flex items-center gap-2 border-b pb-2 text-sm">
                      <span className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">
                        {s.name[0]}
                      </span>
                      {s.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-md">
              <h3 className="font-semibold text-red-600 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                Absent ({data.absent.length})
              </h3>
              {data.absent.length === 0 ? (
                <p className="text-gray-400 text-sm">No absentees 🎉</p>
              ) : (
                <ul className="space-y-2">
                  {data.absent.map((s) => (
                    <li key={s.id} className="flex items-center gap-2 border-b pb-2 text-sm">
                      <span className="w-7 h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">
                        {s.name[0]}
                      </span>
                      {s.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

          </div>
        )}

      </div>
    </MainLayout>
  )
}