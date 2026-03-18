import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="bg-white shadow-sm border-b px-8 py-4 flex justify-between items-center">
      <div>
        <span className="text-sm text-gray-500">
          AI Powered Attendance System
        </span>
      </div>

      <div className="flex items-center gap-6">
        <span className="text-gray-600 cursor-pointer">🔔</span>

        <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm capitalize">
          {user?.role}
        </div>

        <button
          onClick={handleLogout}
          className="text-red-500 hover:text-red-700 text-sm"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default Header;