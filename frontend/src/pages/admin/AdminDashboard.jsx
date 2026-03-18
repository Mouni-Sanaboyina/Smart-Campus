import { useEffect, useState } from "react"
import MainLayout from "../../layouts/MainLayout"
import { getPendingStudents, approveStudent, getAdminStats } from "../../services/api"

export default function AdminDashboard() {
  const [pending, setPending] = useState([])
  const [stats, setStats] = useState({ total_students: 0, total_faculty: 0, pending_students: 0 })
  const [error, setError] = useState("")

  const fetchAll = async () => {
    try {
      // ✅ FIX: Both calls now send Authorization header from api.js
      const [pendingData, statsData] = await Promise.all([
        getPendingStudents(),
        getAdminStats(),
      ])
      setPending(pendingData)
      setStats(statsData)
    } catch (err) {
      setError(err.message || "Failed to load data")
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const handleApprove = async (id) => {
    try {
      await approveStudent(id)
      fetchAll()
    } catch (err) {
      setError(err.message || "Approval failed")
    }
  }

  return (
    <MainLayout>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8 mt-6">

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <p className="text-gray-500 text-sm">Total Students</p>
          <h2 className="text-3xl font-bold text-blue-700">{stats.total_students}</h2>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <p className="text-gray-500 text-sm">Total Faculty</p>
          <h2 className="text-3xl font-bold text-indigo-700">{stats.total_faculty}</h2>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <p className="text-gray-500 text-sm">Pending Approvals</p>
          <h2 className="text-3xl font-bold text-red-600">{stats.pending_students}</h2>
        </div>

      </div>

      {/* Pending Approvals Table */}
      <div>
        <h2 className="text-2xl font-bold text-gray-700 mb-4">
          Pending Student Approvals
        </h2>

        {pending.length === 0 ? (
          <p className="text-gray-500">No pending students.</p>
        ) : (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b text-gray-500 text-sm">
                  <th className="py-2 pr-6">Name</th>
                  <th className="pr-6">Email</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((student) => (
                  <tr key={student.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 pr-6 font-medium">{student.name}</td>
                    <td className="pr-6 text-gray-600">{student.email}</td>
                    <td>
                      <button
                        onClick={() => handleApprove(student.id)}
                        className="bg-green-600 text-white px-4 py-1 rounded-lg hover:bg-green-700 transition text-sm font-medium"
                      >
                        Approve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </MainLayout>
  )
}