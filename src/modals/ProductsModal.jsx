import React, { useEffect, useMemo, useState } from "react";
import { db } from "../../firebaseConfig";
import { collection, onSnapshot } from "firebase/firestore";
import {
  BiSearch,
  BiPackage,
  BiChevronLeft,
  BiChevronRight,
  BiTrendingUp,
} from "react-icons/bi";

const ProductsModal = ({ onClose }) => {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const pageSize = 10;

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10);

    const unsub = onSnapshot(collection(db, "SoldProducts"), (snap) => {
      const arr = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .map((p) => ({
          ...p,
          _name: p.name || p.product_name || "Unnamed",
          _code: p.barcode || p.code || "-",
          _units: Number(p.units_sold || 0),
          _revenue: Number(p.total_revenue || 0),
        }))
        .sort((a, b) => b._units - a._units);
      setRows(arr);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      [r._name, r._code].map((x) => x.toLowerCase()).some((v) => v.includes(s))
    );
  }, [rows, search]);

  const totalUnitsSold = filtered.reduce((sum, r) => sum + r._units, 0);
  const totalRevenue = filtered.reduce((sum, r) => sum + r._revenue, 0);
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
        className={`bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden transform transition-all duration-300 ${
          isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-6 sm:px-8 py-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <BiTrendingUp className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Sold Products</h2>
              <p className="text-orange-100 text-sm mt-0.5">
                Top selling items performance
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
          {/* Stats & Search */}
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-4 border border-orange-200 transform hover:scale-105 transition-transform duration-200">
                <div className="text-xs font-medium text-orange-600 uppercase tracking-wide mb-1">
                  Total Products
                </div>
                <div className="text-2xl font-bold text-orange-900">
                  {filtered.length}
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200 transform hover:scale-105 transition-transform duration-200">
                <div className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">
                  Units Sold
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {totalUnitsSold.toLocaleString("en-IN")}
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4 border border-green-200 transform hover:scale-105 transition-transform duration-200">
                <div className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">
                  Total Revenue
                </div>
                <div className="text-2xl font-bold text-green-900">
                  ₹{totalRevenue.toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            <div className="relative">
              <BiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by product name or code..."
                className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm"
              />
            </div>
          </div>
          {/* Loading State */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-500 text-sm">Loading products...</p>
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="border-2 border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden sm:table-cell">
                        Code
                      </th>
                      <th className="px-4 sm:px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Units Sold
                      </th>
                      <th className="px-4 sm:px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {pageItems.map((r) => (
                      <tr
                        key={r.id}
                        className="hover:bg-orange-50 transition-colors duration-150 group"
                      >
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                              <BiPackage className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 text-sm">
                                {r._name}
                              </div>
                              <div className="text-xs text-gray-500 sm:hidden">
                                {r._code}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 hidden sm:table-cell">
                          {r._code}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-right">
                          <span className="inline-flex items-center px-3 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold text-sm">
                            {r._units.toLocaleString("en-IN")}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-right">
                          <span className="inline-flex items-center px-3 py-1 rounded-lg bg-green-50 text-green-700 font-semibold text-sm">
                            ₹{r._revenue.toLocaleString("en-IN")}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!pageItems.length && (
                      <tr>
                        <td colSpan="4" className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                              <BiPackage className="w-8 h-8 text-gray-400" />
                            </div>
                            <div className="text-gray-500 font-medium">
                              No products found
                            </div>
                            <div className="text-gray-400 text-sm">
                              Try adjusting your search
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {filtered.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t-2 border-gray-100">
                  <div className="text-sm text-gray-600 font-medium">
                    Showing {(page - 1) * pageSize + 1} to{" "}
                    {Math.min(page * pageSize, filtered.length)} of{" "}
                    {filtered.length} products
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 hover:from-orange-500 hover:to-orange-600 text-gray-700 hover:text-white font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-gray-100 disabled:hover:to-gray-200 disabled:hover:text-gray-700 shadow-sm hover:shadow-md"
                    >
                      <BiChevronLeft className="w-5 h-5" />
                      <span className="hidden sm:inline">Previous</span>
                    </button>
                    <div className="hidden sm:flex items-center gap-1">
                      {Array.from(
                        { length: Math.min(5, totalPages) },
                        (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (page <= 3) {
                            pageNum = i + 1;
                          } else if (page >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = page - 2 + i;
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setPage(pageNum)}
                              className={`w-10 h-10 rounded-xl font-semibold text-sm transition-all duration-200 ${
                                page === pageNum
                                  ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg scale-110"
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        }
                      )}
                    </div>
                    <button
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 hover:from-orange-500 hover:to-orange-600 text-gray-700 hover:text-white font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-gray-100 disabled:hover:to-gray-200 disabled:hover:text-gray-700 shadow-sm hover:shadow-md"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <BiChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductsModal;
