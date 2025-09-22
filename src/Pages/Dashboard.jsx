import React, { useEffect, useState, useCallback } from "react";
import { db } from "../../firebaseConfig";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  BiBox,
  BiShoppingBag,
  BiRupee,
  BiPackage,
  BiSearch,
  BiFilter,
  BiDownload,
  BiFile,
} from "react-icons/bi";

// Icon Components (now use react-icons and accept className)
const BoxIcon = ({ className = "text-current w-8 h-8" }) => (
  <BiBox className={className} aria-hidden="true" />
);
const ShoppingBagIcon = ({ className = "text-current w-8 h-8" }) => (
  <BiShoppingBag className={className} aria-hidden="true" />
);
const CurrencyIcon = ({ className = "text-current text-3xl" }) => (
  <BiRupee className={className} aria-hidden="true" />
);
const PackageIcon = ({ className = "text-current w-8 h-8" }) => (
  <BiPackage className={className} aria-hidden="true" />
);
const SearchIcon = ({ className = "w-4 h-4" }) => (
  <BiSearch className={className} aria-hidden="true" />
);
const FilterIcon = ({ className = "w-4 h-4" }) => (
  <BiFilter className={className} aria-hidden="true" />
);
const ExportIcon = ({ className = "w-4 h-4" }) => (
  <BiDownload className={className} aria-hidden="true" />
);
const InvoiceIcon = ({ className = "w-4 h-4" }) => (
  <BiFile className={className} aria-hidden="true" />
);

function Dashboard() {
  const [totalStock, setTotalStock] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [orders, setOrders] = useState(0);
  const [topProducts, setTopProducts] = useState([]);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [dailyRevenueData, setDailyRevenueData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // New filter states
  const [showFilter, setShowFilter] = useState(false);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [minAmount, setMinAmount] = useState("");

  const parseStockValue = useCallback((value) => {
    if (value == null) return 0;
    if (typeof value === "number")
      return Number.isFinite(value) ? Math.max(0, value) : 0;
    if (typeof value === "string") {
      const cleaned = value.replace(/,/g, "").trim();
      const m = cleaned.match(/-?\d+(?:\.\d+)?/);
      return m ? Number(m[0]) || 0 : 0;
    }
    if (Array.isArray(value)) {
      return value.reduce((s, item) => s + parseStockValue(item), 0);
    }
    if (typeof value === "object") {
      return Object.values(value).reduce((s, v) => s + parseStockValue(v), 0);
    }
    return 0;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "ProductsRegistered"),
      (snapshot) => {
        let sum = 0;
        snapshot.forEach((doc) => {
          const data = doc.data() || {};

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

          let stockVal = null;
          for (const key of candidates) {
            if (data[key] !== undefined && data[key] !== null) {
              stockVal = parseStockValue(data[key]);
              break;
            }
          }

          if (stockVal === null) {
            if (data.variants) stockVal = parseStockValue(data.variants);
            else if (data.sizes) stockVal = parseStockValue(data.sizes);
            else stockVal = 0;
          }

          sum += stockVal || 0;
        });
        setTotalStock(sum);
      }
    );
    return () => unsub();
  }, [parseStockValue]);

  useEffect(() => {
    const unsubSales = onSnapshot(collection(db, "Sales"), (snap) => {
      setOrders(snap.size);
      let rev = 0;
      const byDate = {};
      snap.forEach((d) => {
        const data = d.data();
        const amt = Number(data.total || 0);
        rev += amt;
        const date =
          data.created_at && data.created_at.toDate
            ? data.created_at.toDate()
            : new Date(data.created_at || Date.now());
        const key = date.toISOString().slice(0, 10);
        byDate[key] = (byDate[key] || 0) + amt;
      });
      setRevenue(rev);

      const days = [];
      const now = new Date();
      for (let i = 29; i >= 0; i--) {
        const dt = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - i
        );
        const key = dt.toISOString().slice(0, 10);
        days.push({
          date: key,
          label: dt.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          }),
          value: byDate[key] || 0,
        });
      }
      setDailyRevenueData(days);
    });

    const salesQ = query(
      collection(db, "Sales"),
      orderBy("created_at", "desc"),
      limit(8)
    );
    const unsubRecent = onSnapshot(salesQ, (snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRecentInvoices(arr);
    });
    const unsubSold = onSnapshot(collection(db, "SoldProducts"), (snap) => {
      const arr = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => Number(b.units_sold || 0) - Number(a.units_sold || 0))
        .slice(0, 5);
      setTopProducts(arr);
    });
    return () => {
      unsubSales();
      unsubSold();
      unsubRecent();
    };
  }, []);

  // Helper to get invoice date as Date
  const invoiceDate = (inv) => {
    if (!inv) return null;
    if (inv.created_at?.toDate) return inv.created_at.toDate();
    const d = new Date(inv.created_at || inv.date || Date.now());
    return isNaN(d.getTime()) ? null : d;
  };

  // Filter recent invoices based on search + filter inputs
  const filteredInvoices = recentInvoices.filter((inv) => {
    if (!inv) return false;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (
        !(
          (inv.sale_id || inv.id || "").toLowerCase().includes(searchLower) ||
          (inv.customer?.name || "").toLowerCase().includes(searchLower) ||
          (inv.customer?.email || "").toLowerCase().includes(searchLower)
        )
      )
        return false;
    }

    const amt = Number(inv.total || inv.amount || 0);
    if (minAmount) {
      const min = Number(minAmount) || 0;
      if (amt < min) return false;
    }

    const d = invoiceDate(inv);
    if (filterFrom) {
      const from = new Date(filterFrom);
      if (d && d < from) return false;
    }
    if (filterTo) {
      const to = new Date(filterTo);
      // include full day
      to.setHours(23, 59, 59, 999);
      if (d && d > to) return false;
    }

    return true;
  });

  // Export filtered invoices as CSV
  const exportInvoicesCsv = () => {
    if (!filteredInvoices || filteredInvoices.length === 0) {
      // minimal UX: browser alert
      alert("No invoices to export.");
      return;
    }
    const headers = ["Invoice ID", "Customer", "Contact", "Amount", "Date"];
    const rows = filteredInvoices.map((inv) => {
      const id = inv.sale_id || inv.id || "";
      const cust = inv.customer?.name || "Walk-in Customer";
      const contact = inv.customer?.phone || inv.customer?.email || "";
      const amt = Number(inv.total || inv.amount || 0).toLocaleString("en-IN");
      const dt = invoiceDate(inv)
        ? invoiceDate(inv).toLocaleString()
        : inv.created_at || "";
      return [id, cust, contact, amt, dt];
    });
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoices_export_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    bgColor,
    textColor,
    trend,
  }) => (
    <div
      className={`${bgColor} rounded-2xl p-6 shadow-lg border border-gray-100 transition-all duration-200 hover:shadow-xl hover:scale-[1.02]`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className={`text-sm font-medium ${textColor} mb-2`}>{title}</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">
            {typeof value === "number" && title.includes("Revenue")
              ? `₹${value.toLocaleString()}`
              : typeof value === "number"
              ? value.toLocaleString()
              : value}
          </p>
          {trend && (
            <div className="flex items-center gap-1 text-xs">
              <span className="text-green-600 font-medium">↗ +12.5%</span>
              <span className="text-gray-500">vs last month</span>
            </div>
          )}
        </div>
        <div
          className={`p-4 rounded-xl ${textColor
            .replace("text-", "bg-")
            .replace(/-\d+$/, "-100")} ${textColor}`}
        >
          {Icon && <Icon className="text-current w-8 h-8" />}
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen bg-white p-2 sm:p-6 lg:p-0">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome Back, Admin! 👋
              </h1>
              <p className="text-gray-600">
                Here's what's happening with your business today.
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Stock"
            value={totalStock}
            icon={BoxIcon}
            bgColor="bg-white"
            textColor="text-blue-600"
            trend={true}
          />
          <StatCard
            title="Total Orders"
            value={orders}
            icon={ShoppingBagIcon}
            bgColor="bg-white"
            textColor="text-green-600"
            trend={true}
          />
          <StatCard
            title="Total Revenue"
            value={revenue}
            icon={CurrencyIcon}
            bgColor="bg-white"
            textColor="text-purple-600"
            trend={true}
          />
          <StatCard
            title="Products"
            value={topProducts.length}
            icon={PackageIcon}
            bgColor="bg-white"
            textColor="text-orange-600"
            trend={false}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Recent Invoices */}
          <div className="xl:col-span-8">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
              {/* Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">
                      Recent Invoices
                    </h3>
                    <p className="text-sm text-gray-600">
                      {filteredInvoices.length} of {recentInvoices.length}{" "}
                      invoices shown
                    </p>
                  </div>
                  <div className="flex gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-initial">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon />
                      </div>
                      <input
                        type="text"
                        placeholder="Search invoices..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm w-full sm:w-64"
                      />
                    </div>
                    {/* Toggle filter button (now functional) */}
                    <button
                      onClick={() => setShowFilter((s) => !s)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors duration-150"
                    >
                      <FilterIcon />
                      Filter
                    </button>
                  </div>
                </div>

                {/* Filter panel (simple) */}
                {showFilter && (
                  <div className="mt-4 bg-gray-50 p-4 rounded-xl border border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-gray-600">From</label>
                      <input
                        type="date"
                        value={filterFrom}
                        onChange={(e) => setFilterFrom(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">To</label>
                      <input
                        type="date"
                        value={filterTo}
                        onChange={(e) => setFilterTo(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">
                        Min Amount (₹)
                      </label>
                      <input
                        type="number"
                        value={minAmount}
                        onChange={(e) => setMinAmount(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                        placeholder="0"
                      />
                    </div>
                    <div className="sm:col-span-3 flex gap-2 mt-2">
                      <button
                        onClick={() => {
                          // apply is implicit through state; just collapse the panel
                          setShowFilter(false);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-xl"
                      >
                        Apply
                      </button>
                      <button
                        onClick={() => {
                          setFilterFrom("");
                          setFilterTo("");
                          setMinAmount("");
                        }}
                        className="px-4 py-2 bg-gray-100 rounded-xl"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Table */}
              <div className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Invoice ID
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredInvoices.length > 0 ? (
                        filteredInvoices.map((inv) => {
                          const amt = Number(inv.total || inv.amount || 0);
                          const cust = inv.customer || {};
                          const dt = inv.created_at?.toDate
                            ? inv.created_at.toDate().toLocaleDateString()
                            : inv.created_at || "-";
                          return (
                            <tr
                              key={inv.id}
                              className="hover:bg-gray-50 transition-colors duration-150"
                            >
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {inv.sale_id || inv.id}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {cust.name || "Walk-in Customer"}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-600">
                                  {cust.phone || cust.email || "-"}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="text-sm font-semibold text-gray-900">
                                  ₹{amt.toLocaleString("en-IN")}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-600">
                                  {dt}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <button className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-150">
                                  <InvoiceIcon />
                                  View
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="6" className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <SearchIcon />
                              </div>
                              <p className="text-gray-500 text-sm">
                                {searchTerm
                                  ? "No invoices match your search"
                                  : "No invoices found"}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                <div>
                  {/* Footer Filter button kept for parity (open header filter) */}
                  <button
                    onClick={() => setShowFilter((s) => !s)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors duration-150"
                  >
                    <FilterIcon />
                    Filter
                  </button>
                </div>
                <div>
                  <button
                    onClick={exportInvoicesCsv}
                    className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors duration-150 shadow-lg hover:shadow-xl"
                  >
                    <ExportIcon />
                    Export
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="xl:col-span-4 space-y-6">
            {/* Revenue Chart */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    Revenue Trend
                  </h3>
                  <p className="text-sm text-gray-600">
                    Last 30 days performance
                  </p>
                </div>
                <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option>Last 30 Days</option>
                  <option>Last 90 Days</option>
                  <option>Last Year</option>
                </select>
              </div>

              <div className="mb-4">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  ₹{Number(revenue).toLocaleString("en-IN")}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-green-600 font-medium">↗ +8.2%</span>
                  <span className="text-gray-500">from last month</span>
                </div>
              </div>

              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={dailyRevenueData}
                    margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => `₹${v.toLocaleString("en-IN")}`}
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                      width={60}
                    />
                    <Tooltip
                      formatter={(v) => [
                        `₹${Number(v).toLocaleString("en-IN")}`,
                        "Revenue",
                      ]}
                      labelStyle={{ color: "#374151" }}
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{
                        r: 4,
                        fill: "#3b82f6",
                        strokeWidth: 2,
                        stroke: "#ffffff",
                      }}
                      activeDot={{ r: 6, stroke: "#3b82f6", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Products */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    Top Products
                  </h3>
                  <p className="text-sm text-gray-600">Best performing items</p>
                </div>
                <div className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                  {topProducts.length} items
                </div>
              </div>

              <div className="space-y-4">
                {topProducts.length > 0 ? (
                  topProducts.map((product, index) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-150"
                    >
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-semibold text-sm">
                          #{index + 1}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {product.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          Code: {product.barcode}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {product.units_sold || 0} sold
                        </p>
                        <p className="text-xs text-green-600 font-medium">
                          ₹{(product.total_revenue || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <PackageIcon />
                    </div>
                    <p className="text-gray-500 text-sm">
                      No products sold yet
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
