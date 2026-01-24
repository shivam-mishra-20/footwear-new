import React from "react";
import { NavLink, useNavigate } from "react-router";
import { signOut } from "firebase/auth";
import { auth } from "../../firebaseConfig";
// Updated to more business-appropriate icon set (Lucide/Feather style via react-icons)
import {
  FiHome,
  FiBarChart2,
  FiLogOut,
  FiRefreshCw,
  FiGift,
  FiTag,
  FiTrendingUp,
  FiDollarSign,
} from "react-icons/fi";
import { LuPackage, LuShoppingCart } from "react-icons/lu";
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
      className={`bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 h-screen pt-6 shadow-2xl w-[260px] lg:translate-x-0 fixed z-40 top-0 left-0 ${translated} transition-transform overflow-y-auto flex flex-col`}
    >
      {/* Brand */}
      <div className="px-5 mb-8">
        <div className="flex items-center justify-center mb-4">
          <img
            src="/noble_footwear_logo.png"
            alt="Logo"
            className="w-32 h-32 object-contain"
          />
        </div>
        {user && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-3 border border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
                {user.email?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 mb-0.5">Logged in as</p>
                <p className="text-sm font-semibold text-white truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="px-3 flex flex-col gap-2 flex-1">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider px-4 mb-2">
          Main Menu
        </p>
        {[
          {
            to: "/",
            label: "Dashboard",
            icon: FiHome,
            end: true,
            gradient: "from-blue-500 to-cyan-500",
          },
          {
            to: "/inventory",
            label: "Inventory",
            icon: LuPackage,
            gradient: "from-green-500 to-emerald-500",
          },
          {
            to: "/sales",
            label: "Point of Sale",
            icon: LuShoppingCart,
            gradient: "from-purple-500 to-pink-500",
          },
          {
            to: "/report",
            label: "Reports",
            icon: FiBarChart2,
            gradient: "from-orange-500 to-amber-500",
          },
          {
            to: "/billing",
            label: "Billing & Accounting",
            icon: FiDollarSign,
            gradient: "from-indigo-500 to-blue-500",
          },
          {
            to: "/returns",
            label: "Returns & Refunds",
            icon: FiRefreshCw,
            gradient: "from-red-500 to-rose-500",
          },
          {
            to: "/gift-cards",
            label: "Gift Cards",
            icon: FiGift,
            gradient: "from-teal-500 to-cyan-500",
          },
        ].map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 px-4 py-3 rounded-xl no-underline text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? "bg-gradient-to-r " +
                    item.gradient +
                    " text-white shadow-lg"
                  : "text-gray-300 hover:text-white hover:bg-gray-800/50"
              }`
            }
            onClick={() => setOpen(false)}
          >
            {({ isActive }) => (
              <>
                <span
                  className={`inline-flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-white/20 scale-105"
                      : "bg-gray-800 group-hover:bg-gray-700 group-hover:scale-105"
                  }`}
                >
                  {item.icon && <item.icon className="w-5 h-5" />}
                </span>
                <span className="flex-1">{item.label}</span>
                {isActive && (
                  <span className="w-2 h-2 rounded-full bg-white shadow-lg"></span>
                )}
              </>
            )}
          </NavLink>
        ))}

        {/* Logout */}
        <div className="mt-6 pt-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full group relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-400 hover:text-white hover:bg-gradient-to-r hover:from-red-500 hover:to-rose-500 transition-all duration-200 hover:shadow-lg"
          >
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-red-500/10 group-hover:bg-white/20 transition-all duration-200 group-hover:scale-105">
              <FiLogOut className="w-5 h-5" />
            </span>
            <span className="flex-1 text-left">Logout</span>
          </button>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700 mt-auto">
        <p className="text-xs text-gray-500 text-center">
          © 2026 Noble Footwear
        </p>
      </div>
    </div>
  );
}

export default Sidebar;
