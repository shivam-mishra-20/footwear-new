import React from "react";
import { NavLink, useNavigate } from "react-router";
import { signOut } from "firebase/auth";
import { auth } from "../../firebaseConfig";

function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = async (e) => {
    e.preventDefault();
    await signOut(auth);
    navigate("/login", { replace: true });
  };

  return (
    <div className="w-[220px] bg-slate-50 h-screen pt-8 shadow-md">
      <div className="mb-10 text-center">
        <img
          src="/noble_footwear_logo.png"
          alt="Logo"
          className="mx-auto mb-3 w-34 h-34 object-contain"
        />
        <div className="font-bold text-xl tracking-wider">
          NOBLE
          <br />
          FOOTWEAR
        </div>
      </div>
      <nav className="flex flex-col gap-4">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `px-8 py-3 no-underline font-medium rounded-lg ${
              isActive ? "text-blue-600 bg-blue-100" : "text-gray-900"
            }`
          }
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/inventory"
          className={({ isActive }) =>
            `px-8 py-3 no-underline font-medium rounded-lg ${
              isActive ? "text-blue-600 bg-blue-100" : "text-gray-900"
            }`
          }
        >
          Inventory
        </NavLink>
        <NavLink
          to="/sales"
          className={({ isActive }) =>
            `px-8 py-3 no-underline font-medium rounded-lg ${
              isActive ? "text-blue-600 bg-blue-100" : "text-gray-900"
            }`
          }
        >
          Sales
        </NavLink>
        <NavLink
          to="/report"
          className={({ isActive }) =>
            `px-8 py-3 no-underline font-medium rounded-lg ${
              isActive ? "text-blue-600 bg-blue-100" : "text-gray-900"
            }`
          }
        >
          Report
        </NavLink>
        <NavLink
          to="/logout"
          className={({ isActive }) =>
            `px-8 py-3 no-underline font-medium mt-8 rounded-lg ${
              isActive ? "text-blue-600 bg-blue-100" : "text-gray-900"
            }`
          }
          onClick={handleLogout}
        >
          Logout
        </NavLink>
      </nav>
    </div>
  );
}

export default Sidebar;
