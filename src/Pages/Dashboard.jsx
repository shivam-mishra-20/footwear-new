import React, { useEffect, useState } from "react";
import { db } from "../../firebaseConfig";
import { collection, onSnapshot } from "firebase/firestore";

function Dashboard() {
  const [totalStock, setTotalStock] = useState(0);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "ProductsRegistered"),
      (snapshot) => {
        let sum = 0;
        snapshot.forEach((doc) => {
          const data = doc.data();
          sum += Number(data.stock) || 0;
        });
        setTotalStock(sum);
      }
    );
    return () => unsub();
  }, []);

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-6">Welcome Back, Admin</h2>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-blue-100 rounded-xl p-6 flex flex-col shadow-md relative">
          <div className="text-blue-700 font-semibold mb-1 flex items-center gap-2">
            <span className="inline-block bg-blue-400/20 p-2 rounded-lg">
              <svg
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M3 3v18h18" />
              </svg>
            </span>
            Total Stock
          </div>
          <div className="text-3xl font-bold">{totalStock}</div>
        </div>
        <div className="bg-green-100 rounded-xl p-6 flex flex-col shadow-md relative">
          <div className="text-green-700 font-semibold mb-1 flex items-center gap-2">
            <span className="inline-block bg-green-400/20 p-2 rounded-lg">
              <svg
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" />
              </svg>
            </span>
            Employees
          </div>
          <div className="text-3xl font-bold">250</div>
        </div>
        <div className="bg-red-100 rounded-xl p-6 flex flex-col shadow-md relative">
          <div className="text-red-700 font-semibold mb-1 flex items-center gap-2">
            <span className="inline-block bg-red-400/20 p-2 rounded-lg">
              <svg
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M12 8v4l3 3" />
              </svg>
            </span>
            Attendance
          </div>
          <div className="text-3xl font-bold">82%</div>
        </div>
        <div className="bg-purple-100 rounded-xl p-6 flex flex-col shadow-md relative">
          <div className="text-purple-700 font-semibold mb-1 flex items-center gap-2">
            <span className="inline-block bg-purple-400/20 p-2 rounded-lg">
              <svg
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
            </span>
            Invoice
          </div>
          <div className="text-3xl font-bold">210</div>
        </div>
      </div>
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Invoices */}
        <div className="col-span-2 bg-white rounded-xl shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">Recent Invoices</h3>
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                className="pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-200 text-sm"
              />
              <span className="absolute left-2 top-2 text-gray-400">
                <svg
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </span>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-blue-50">
                <tr>
                  <th className="px-4 py-2 font-semibold">Code</th>
                  <th className="px-4 py-2 font-semibold">Customer</th>
                  <th className="px-4 py-2 font-semibold">Email</th>
                  <th className="px-4 py-2 font-semibold">&#8377;Amt</th>
                  <th className="px-4 py-2 font-semibold">Date</th>
                  <th className="px-4 py-2 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(8)].map((_, i) => (
                  <tr key={i} className="border-t hover:bg-blue-50">
                    <td className="px-4 py-2">1254789</td>
                    <td className="px-4 py-2">Smith</td>
                    <td className="px-4 py-2">Smith@gmail.com</td>
                    <td className="px-4 py-2">2500</td>
                    <td className="px-4 py-2">2025-05-11</td>
                    <td className="px-4 py-2 text-center">...</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between mt-4">
            <button className="bg-gray-100 px-4 py-2 rounded-lg text-sm font-medium">
              Filter
            </button>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
              Export
            </button>
          </div>
        </div>
        {/* Total Revenue & Top Products */}
        <div className="flex flex-col gap-8">
          <div className="bg-white rounded-xl shadow p-6 flex-1">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-lg">Total Revenue</h3>
              <select className="border rounded px-2 py-1 text-sm">
                <option>Last 30 Days</option>
                <option>Last 90 Days</option>
              </select>
            </div>
            <div className="text-2xl font-bold mb-2">₹93,250</div>
            {/* Placeholder chart */}
            <div className="h-32 w-full flex items-end">
              <svg width="100%" height="100%" viewBox="0 0 200 80">
                <polyline
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  points="0,60 30,50 60,55 90,40 120,45 150,30 180,60 200,20"
                />
              </svg>
            </div>
            <div className="text-xs text-gray-400 mt-2">
              May &nbsp; Jun &nbsp; Jul &nbsp; Aug &nbsp; Sep &nbsp; Oct
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 flex-1">
            <h3 className="font-semibold text-lg mb-4">Top Products</h3>
            <table className="min-w-full text-sm">
              <thead className="bg-blue-50">
                <tr>
                  <th className="px-4 py-2 font-semibold">Code</th>
                  <th className="px-4 py-2 font-semibold">Product</th>
                  <th className="px-4 py-2 font-semibold">Popularity</th>
                  <th className="px-4 py-2 font-semibold">Sales</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-2">1254789</td>
                    <td className="px-4 py-2">Nike</td>
                    <td className="px-4 py-2">
                      <div className="w-32 h-2 bg-gray-200 rounded-full">
                        <div
                          className={`h-2 rounded-full ${
                            [
                              "bg-red-400 w-3/4",
                              "bg-yellow-300 w-2/3",
                              "bg-green-400 w-1/3",
                              "bg-blue-400 w-1/4",
                              "bg-gray-400 w-4/6",
                            ][i]
                          }`}
                        ></div>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded-full ${
                          [
                            "bg-red-100 text-red-600",
                            "bg-yellow-100 text-yellow-700",
                            "bg-green-100 text-green-700",
                            "bg-blue-100 text-blue-700",
                            "bg-gray-100 text-gray-700",
                          ][i]
                        }`}
                      >
                        {["55%", "82%", "39%", "21%", "65%"][i]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
