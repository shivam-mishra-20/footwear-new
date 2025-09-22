import React from "react";
import { NavLink, useNavigate } from "react-router";
import { signOut } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import {
  FiHome,
  FiBox,
  FiShoppingCart,
  FiBarChart2,
  FiLogOut,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";

function Sidebar({ open, setOpen }) {
  const navigate = useNavigate();
  const { user } = useAuth?.() || {}; // optional: show user info if available

  const handleLogout = async (e) => {
    e.preventDefault();
    await signOut(auth);
    navigate("/login", { replace: true });
  };

  const translated = open ? "translate-x-0" : "-translate-x-full";
  return (
    <div
      className={`bg-white h-screen pt-6 shadow-xl w-[240px] lg:translate-x-0 fixed z-40 top-0 left-0 ${translated} transition-transform border-r border-gray-100 overflow-hidden`}
    >
      {/* Brand */}
      <div className="px-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-1">
            <img
              src="/noble_footwear_logo.png"
              alt="Logo"
              className="w-36 h-36 object-contain"
            />
          </div>
        </div>
        {user && (
          <div className="mt-3 text-xs text-gray-500 truncate">
            {user.email}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="px-3 flex flex-col gap-1">
        {[
          { to: "/", label: "Dashboard", icon: FiHome, end: true },
          { to: "/inventory", label: "Inventory", icon: FiBox },
          { to: "/sales", label: "Sales", icon: FiShoppingCart },
          { to: "/report", label: "Reports", icon: FiBarChart2 },
        ].map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 px-4 py-2.5 rounded-xl no-underline text-sm font-medium transition-all ${
                isActive
                  ? "text-blue-700 bg-blue-50"
                  : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              }`
            }
            onClick={() => setOpen(false)}
          >
            {({ isActive }) => (
              <>
                <span
                  className={`absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-r-full transition ${
                    isActive
                      ? "bg-blue-600 opacity-100"
                      : "opacity-0 group-hover:opacity-60 bg-gray-300"
                  }`}
                />
                <span
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${
                    isActive
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-600 group-hover:text-gray-900"
                  }`}
                >
                  {item.icon && <item.icon className="w-4 h-4" />}
                </span>
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="mt-4 mx-3 inline-flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition"
        >
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 text-red-600">
            <FiLogOut className="w-4 h-4" />
          </span>
          Logout
        </button>
      </nav>
    </div>
  );
}

export default Sidebar;
