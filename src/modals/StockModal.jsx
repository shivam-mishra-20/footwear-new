import React, { useEffect, useMemo, useState } from "react";
import { db } from "../../firebaseConfig";
import { collection, onSnapshot } from "firebase/firestore";
import {
  BiSearch,
  BiPackage,
  BiChevronLeft,
  BiChevronRight,
} from "react-icons/bi";

const StockModal = ({ onClose }) => {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const pageSize = 10;

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => setIsVisible(true), 10);

    const unsub = onSnapshot(collection(db, "ProductsRegistered"), (snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setProducts(arr);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const parseStock = (p) => {
    const candidates = [
      "stock",
      "qty",
      "quantity",
      "units",
      "stock_qty",
      "total_stock",
      "available",
      "stocks",
    ];
    let v = null;
    for (const k of candidates) {
      if (p[k] !== undefined && p[k] !== null) {
        v = p[k];
        break;
      }
    }
    if (v == null) return 0;
    const n = Number(String(v).replace(/,/g, ""));
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  };

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const base = s
      ? products.filter((p) =>
          [p.name, p.product_name, p.barcode, p.code]
            .map((x) => (x ? String(x).toLowerCase() : ""))
            .some((v) => v.includes(s))
        )
      : products;
    return base
      .map((p) => ({
        ...p,
        _stock: parseStock(p),
        _name: p.name || p.product_name || "Unnamed",
        _code: p.barcode || p.code || "-",
      }))
      .sort((a, b) => b._stock - a._stock);
  }, [products, search]);

  const totalStock = filtered.reduce((sum, p) => sum + p._stock, 0);
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
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 sm:px-8 py-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <BiPackage className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Stock Inventory</h2>
              <p className="text-blue-100 text-sm mt-0.5">
                Manage your product stock
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
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200 transform hover:scale-105 transition-transform duration-200">
                <div className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">
                  Total Products
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {filtered.length}
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4 border border-green-200 transform hover:scale-105 transition-transform duration-200">
                <div className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">
                  Total Stock
                </div>
                <div className="text-2xl font-bold text-green-900">
                  {totalStock.toLocaleString("en-IN")}
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-4 border border-purple-200 transform hover:scale-105 transition-transform duration-200">
                <div className="text-xs font-medium text-purple-600 uppercase tracking-wide mb-1">
                  Avg Stock
                </div>
                <div className="text-2xl font-bold text-purple-900">
                  {filtered.length
                    ? Math.round(totalStock / filtered.length)
                    : 0}
                </div>
              </div>
            </div>

            <div className="relative">
              <BiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by product name or code..."
                className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm"
              />
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-gray-500 text-sm">Loading stock data...</p>
              </div>
            </div>
          ) : (
            <div className="border-2 border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Product Name
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Product Code
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Stock Quantity
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {pageItems.map((p) => (
                      <tr
                        key={p.id}
                        className="hover:bg-blue-50 transition-colors duration-150 group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                              <BiPackage className="w-5 h-5 text-blue-600" />
                            </div>
                            <span className="text-sm font-semibold text-gray-900">
                              {p._name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {p._code}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`inline-flex items-center px-3 py-1.5 rounded-xl text-sm font-bold ${
                              p._stock > 50
                                ? "bg-green-100 text-green-700"
                                : p._stock > 20
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {p._stock.toLocaleString("en-IN")}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!pageItems.length && (
                      <tr>
                        <td colSpan="3" className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                              <BiSearch className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-gray-500 font-medium">
                              No products found
                            </p>
                            <p className="text-gray-400 text-sm">
                              Try adjusting your search
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
                products
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 text-sm font-medium text-gray-700"
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
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                            : "bg-white border-2 border-gray-200 text-gray-700 hover:border-blue-300"
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
                  className="px-4 py-2 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 text-sm font-medium text-gray-700"
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

export default StockModal;
