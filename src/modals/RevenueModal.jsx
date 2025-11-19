import React, { useEffect, useMemo, useState } from "react";
import { db } from "../../firebaseConfig";
import { collection, onSnapshot } from "firebase/firestore";
import {
  BiSearch,
  BiRupee,
  BiChevronLeft,
  BiChevronRight,
  BiCalendar,
} from "react-icons/bi";

const RevenueModal = ({ onClose }) => {
  const [sales, setSales] = useState([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const pageSize = 10;

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10);

    const unsub = onSnapshot(collection(db, "Sales"), (snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSales(arr);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;
    if (toDate) toDate.setHours(23, 59, 59, 999);
    return sales
      .map((s) => ({
        ...s,
        _date: s.created_at?.toDate
          ? s.created_at.toDate()
          : new Date(s.created_at || Date.now()),
        _amount: Number(s.total || s.amount || 0),
        _id: s.sale_id || s.id,
        _name: s.customer?.name || "Walk-in Customer",
      }))
      .filter((s) => {
        if (fromDate && s._date < fromDate) return false;
        if (toDate && s._date > toDate) return false;
        return true;
      })
      .sort((a, b) => b._date - a._date);
  }, [sales, from, to]);

  const totalRevenue = filtered.reduce((sum, s) => sum + s._amount, 0);
  const totalOrders = filtered.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isVisible ? "bg-black/60 backdrop-blur-sm" : "bg-black/0"
      }`}
      onClick={handleClose}
    >
      <div
        className={`bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden transform transition-all duration-300 ${
          isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 sm:px-8 py-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <BiRupee className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                Revenue Analytics
              </h2>
              <p className="text-purple-100 text-sm mt-0.5">
                Track and analyze revenue
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all duration-200 hover:rotate-90"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Date Filters */}
          <div className="mb-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 border-2 border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <BiCalendar className="w-5 h-5 text-gray-600" />
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                Date Range Filter
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-2 block">
                  From Date
                </label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-2 block">
                  To Date
                </label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 text-sm"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFrom("");
                    setTo("");
                  }}
                  className="w-full px-4 py-2.5 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-purple-300 transition-all duration-200 text-sm font-semibold text-gray-700"
                >
                  Clear Filter
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-5 border border-purple-200 transform hover:scale-105 transition-transform duration-200">
              <div className="text-xs font-medium text-purple-600 uppercase tracking-wide mb-1">
                Total Revenue
              </div>
              <div className="text-2xl font-bold text-purple-900">
                ₹{totalRevenue.toLocaleString("en-IN")}
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-5 border border-green-200 transform hover:scale-105 transition-transform duration-200">
              <div className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">
                Total Orders
              </div>
              <div className="text-2xl font-bold text-green-900">
                {totalOrders}
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-5 border border-blue-200 transform hover:scale-105 transition-transform duration-200">
              <div className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">
                Avg Order Value
              </div>
              <div className="text-2xl font-bold text-blue-900">
                ₹{Math.round(avgOrderValue).toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                <p className="text-gray-500 text-sm">Loading revenue data...</p>
              </div>
            </div>
          ) : (
            <div className="border-2 border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Invoice ID
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {pageItems.map((s) => (
                      <tr
                        key={s._id}
                        className="hover:bg-purple-50 transition-colors duration-150 group"
                      >
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-gray-900">
                            {s._id}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-gray-900">
                            {s._name}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">
                            {s._date.toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-bold text-purple-700">
                            ₹{s._amount.toLocaleString("en-IN")}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!pageItems.length && (
                      <tr>
                        <td colSpan="4" className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                              <BiSearch className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-gray-500 font-medium">
                              No data in range
                            </p>
                            <p className="text-gray-400 text-sm">
                              Try adjusting the date filter
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && pageItems.length > 0 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50 rounded-xl p-4">
              <div className="text-sm text-gray-600">
                Showing{" "}
                <span className="font-semibold text-gray-900">
                  {(page - 1) * pageSize + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-gray-900">
                  {Math.min(page * pageSize, filtered.length)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-gray-900">
                  {filtered.length}
                </span>{" "}
                transactions
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-purple-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 text-sm font-medium text-gray-700"
                >
                  <BiChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <div className="hidden sm:flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-10 h-10 rounded-xl font-semibold text-sm transition-all duration-200 ${
                          page === pageNum
                            ? "bg-purple-600 text-white shadow-lg shadow-purple-200"
                            : "bg-white border-2 border-gray-200 text-gray-700 hover:border-purple-300"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-purple-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 text-sm font-medium text-gray-700"
                >
                  Next
                  <BiChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RevenueModal;
