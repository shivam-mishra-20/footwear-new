import React, { useState, useEffect, useMemo } from "react";
import { db } from "../../firebaseConfig";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import {
  FiDollarSign,
  FiTrendingUp,
  FiTrendingDown,
  FiFileText,
  FiDownload,
  FiCalendar,
  FiFilter,
  FiPieChart,
} from "react-icons/fi";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import jsPDF from "jspdf";

function Billing() {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Tax settings
  const [taxRate, setTaxRate] = useState(18); // Default GST 18%
  const [showTaxSettings, setShowTaxSettings] = useState(false);

  useEffect(() => {
    const unsubSales = onSnapshot(
      query(collection(db, "Sales"), orderBy("created_at", "desc")),
      (snapshot) => {
        setSales(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      }
    );

    const unsubProducts = onSnapshot(
      collection(db, "ProductsRegistered"),
      (snapshot) => {
        setProducts(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        );
      }
    );

    const unsubReturns = onSnapshot(collection(db, "Returns"), (snapshot) => {
      setReturns(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => {
      unsubSales();
      unsubProducts();
      unsubReturns();
    };
  }, []);

  // Filter sales by date
  const filteredSales = useMemo(() => {
    let filtered = [...sales];

    // Apply period filter
    const now = new Date();
    if (selectedPeriod !== "all") {
      filtered = filtered.filter((sale) => {
        const saleDate =
          sale.created_at?.toDate?.() || new Date(sale.created_at);
        const daysDiff = Math.floor((now - saleDate) / (1000 * 60 * 60 * 24));

        switch (selectedPeriod) {
          case "today":
            return daysDiff === 0;
          case "week":
            return daysDiff <= 7;
          case "month":
            return daysDiff <= 30;
          case "quarter":
            return daysDiff <= 90;
          case "year":
            return daysDiff <= 365;
          default:
            return true;
        }
      });
    }

    // Apply custom date range
    if (dateFrom || dateTo) {
      filtered = filtered.filter((sale) => {
        const saleDate =
          sale.created_at?.toDate?.() || new Date(sale.created_at);
        const from = dateFrom ? new Date(dateFrom) : null;
        const to = dateTo ? new Date(dateTo) : null;

        if (from && to) {
          return saleDate >= from && saleDate <= to;
        } else if (from) {
          return saleDate >= from;
        } else if (to) {
          return saleDate <= to;
        }
        return true;
      });
    }

    return filtered;
  }, [sales, selectedPeriod, dateFrom, dateTo]);

  // Calculate financial metrics
  const financialMetrics = useMemo(() => {
    // Total Revenue (gross sales)
    const totalRevenue = filteredSales.reduce(
      (sum, sale) => sum + (Number(sale.total) || 0),
      0
    );

    // Calculate COGS (Cost of Goods Sold)
    let totalCOGS = 0;
    filteredSales.forEach((sale) => {
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach((item) => {
          const product = products.find((p) => p.barcode === item.barcode);
          if (product && product.variants) {
            const variant = Object.values(product.variants).find(
              (v) => v.size === item.size
            );
            // Use purchaseCost if available, otherwise estimate as 60% of selling price
            const cost = variant?.purchaseCost || variant?.price * 0.6 || 0;
            totalCOGS += cost * (item.quantity || 1);
          }
        });
      }
    });

    // Gross Profit
    const grossProfit = totalRevenue - totalCOGS;

    // Tax calculation
    const taxAmount = (totalRevenue * taxRate) / (100 + taxRate); // Extract tax from inclusive price
    const revenueBeforeTax = totalRevenue - taxAmount;

    // Returns/Refunds
    const totalRefunds = returns
      .filter((r) => {
        const returnDate = r.createdAt?.toDate?.() || new Date(r.createdAt);
        const saleDate = filteredSales
          .find((s) => s.id === r.invoiceId)
          ?.created_at?.toDate?.();
        return saleDate !== undefined;
      })
      .reduce((sum, r) => sum + (Number(r.refundAmount) || 0), 0);

    // Net Revenue (after refunds)
    const netRevenue = totalRevenue - totalRefunds;

    // Net Profit (after all deductions)
    const netProfit = grossProfit - totalRefunds;

    // Profit margin
    const profitMargin =
      totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      revenueBeforeTax,
      taxAmount,
      totalCOGS,
      grossProfit,
      totalRefunds,
      netRevenue,
      netProfit,
      profitMargin,
      transactionCount: filteredSales.length,
      averageOrderValue:
        filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0,
    };
  }, [filteredSales, products, returns, taxRate]);

  // Monthly revenue data for chart
  const monthlyData = useMemo(() => {
    const months = {};
    filteredSales.forEach((sale) => {
      const date = sale.created_at?.toDate?.() || new Date(sale.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      if (!months[key]) {
        months[key] = { revenue: 0, profit: 0, transactions: 0 };
      }
      months[key].revenue += Number(sale.total) || 0;
      months[key].transactions += 1;
    });

    return Object.entries(months)
      .map(([key, data]) => ({
        month: key,
        revenue: data.revenue,
        profit: data.revenue * 0.4, // Simplified profit calculation
        transactions: data.transactions,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months
  }, [filteredSales]);

  // Export financial report as PDF
  const exportFinancialReport = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Financial Report", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Generated: ${new Date().toLocaleDateString()}`,
      pageWidth / 2,
      28,
      { align: "center" }
    );
    doc.text(
      `Period: ${selectedPeriod === "all" ? "All Time" : selectedPeriod}`,
      pageWidth / 2,
      34,
      { align: "center" }
    );

    // Financial Summary
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Financial Summary", 14, 50);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    let yPos = 60;

    const metrics = [
      [
        "Total Revenue",
        `₹${financialMetrics.totalRevenue.toLocaleString("en-IN")}`,
      ],
      [
        "Revenue (Before Tax)",
        `₹${financialMetrics.revenueBeforeTax.toLocaleString("en-IN")}`,
      ],
      [
        `Tax Amount (GST ${taxRate}%)`,
        `₹${financialMetrics.taxAmount.toLocaleString("en-IN")}`,
      ],
      [
        "Cost of Goods Sold",
        `₹${financialMetrics.totalCOGS.toLocaleString("en-IN")}`,
      ],
      [
        "Gross Profit",
        `₹${financialMetrics.grossProfit.toLocaleString("en-IN")}`,
      ],
      [
        "Refunds/Returns",
        `₹${financialMetrics.totalRefunds.toLocaleString("en-IN")}`,
      ],
      [
        "Net Revenue",
        `₹${financialMetrics.netRevenue.toLocaleString("en-IN")}`,
      ],
      ["Net Profit", `₹${financialMetrics.netProfit.toLocaleString("en-IN")}`],
      ["Profit Margin", `${financialMetrics.profitMargin.toFixed(2)}%`],
      ["Total Transactions", financialMetrics.transactionCount],
      [
        "Average Order Value",
        `₹${financialMetrics.averageOrderValue.toLocaleString("en-IN")}`,
      ],
    ];

    metrics.forEach(([label, value]) => {
      doc.text(label, 20, yPos);
      doc.text(value, pageWidth - 20, yPos, { align: "right" });
      yPos += 8;
    });

    doc.save(`financial-report-${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  // Revenue breakdown data
  const revenueBreakdown = [
    { name: "Revenue (Before Tax)", value: financialMetrics.revenueBeforeTax },
    { name: "Tax Amount", value: financialMetrics.taxAmount },
  ];

  const profitBreakdown = [
    { name: "Net Profit", value: Math.max(0, financialMetrics.netProfit) },
    { name: "COGS", value: financialMetrics.totalCOGS },
    { name: "Refunds", value: financialMetrics.totalRefunds },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading billing data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-2">
                Billing & Accounting
              </h1>
              <p className="text-gray-600 text-sm sm:text-base">
                Financial insights, tax calculations, and profit analysis
              </p>
            </div>
            <button
              onClick={exportFinancialReport}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            >
              <FiDownload className="w-5 h-5" />
              <span className="hidden sm:inline">Export Report</span>
              <span className="sm:hidden">Export</span>
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/60 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl px-3 py-2 border border-blue-100">
                <FiCalendar className="w-5 h-5 text-blue-600" />
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="bg-transparent border-none focus:outline-none focus:ring-0 text-gray-900 font-medium cursor-pointer"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                  <option value="quarter">Last Quarter</option>
                  <option value="year">Last Year</option>
                </select>
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                  showFilters
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-white border border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50"
                }`}
              >
                <FiFilter className="w-4 h-4" />
                <span className="hidden sm:inline">Custom Range</span>
              </button>

              <button
                onClick={() => setShowTaxSettings(!showTaxSettings)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                  showTaxSettings
                    ? "bg-purple-600 text-white shadow-md"
                    : "bg-white border border-gray-200 text-gray-700 hover:border-purple-300 hover:bg-purple-50"
                }`}
              >
                <FiFileText className="w-4 h-4" />
                <span className="hidden sm:inline">Tax Settings</span>
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                  {taxRate}%
                </span>
              </button>
            </div>

            {/* Custom Date Range */}
            {showFilters && (
              <div className="mt-5 pt-5 border-t border-gray-200 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tax Settings */}
            {showTaxSettings && (
              <div className="mt-5 pt-5 border-t border-gray-200 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Tax Rate (GST %)
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent w-32 font-semibold text-gray-900"
                  />
                  <div className="flex gap-2">
                    {[5, 12, 18, 28].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => setTaxRate(rate)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          taxRate === rate
                            ? "bg-purple-600 text-white shadow-md"
                            : "bg-gray-100 text-gray-700 hover:bg-purple-50 hover:text-purple-700"
                        }`}
                      >
                        {rate}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <MetricCard
            title="Total Revenue"
            value={`₹${financialMetrics.totalRevenue.toLocaleString("en-IN")}`}
            icon={FiDollarSign}
            gradient="from-blue-500 to-cyan-500"
            subtitle={`${financialMetrics.transactionCount} transactions`}
          />
          <MetricCard
            title="Net Profit"
            value={`₹${financialMetrics.netProfit.toLocaleString("en-IN")}`}
            icon={
              financialMetrics.netProfit >= 0 ? FiTrendingUp : FiTrendingDown
            }
            gradient={
              financialMetrics.netProfit >= 0
                ? "from-green-500 to-emerald-500"
                : "from-red-500 to-rose-500"
            }
            subtitle={`${financialMetrics.profitMargin.toFixed(2)}% margin`}
          />
          <MetricCard
            title="Tax Amount"
            value={`₹${financialMetrics.taxAmount.toLocaleString("en-IN")}`}
            icon={FiFileText}
            gradient="from-purple-500 to-pink-500"
            subtitle={`GST ${taxRate}%`}
          />
          <MetricCard
            title="Avg Order Value"
            value={`₹${financialMetrics.averageOrderValue.toLocaleString(
              "en-IN"
            )}`}
            icon={FiPieChart}
            gradient="from-orange-500 to-amber-500"
            subtitle="Per transaction"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Revenue & Profit Chart */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/60 p-6 hover:shadow-2xl transition-shadow duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
                <FiTrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                Monthly Revenue & Profit
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.3} />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  tickLine={{ stroke: "#d1d5db" }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  tickLine={{ stroke: "#d1d5db" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: "20px" }} />
                <Bar
                  dataKey="revenue"
                  fill="url(#colorRevenue)"
                  name="Revenue"
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="profit"
                  fill="url(#colorProfit)"
                  name="Profit"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue Breakdown Pie Chart */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/60 p-6 hover:shadow-2xl transition-shadow duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                <FiPieChart className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                Revenue Breakdown
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <defs>
                  <linearGradient
                    id="grad1"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                  <linearGradient
                    id="grad2"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
                <Pie
                  data={revenueBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {revenueBreakdown.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? "url(#grad1)" : "url(#grad2)"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Financial Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profit & Loss Statement */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/60 p-6 hover:shadow-2xl transition-shadow duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl">
                <FiTrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                Profit & Loss Statement
              </h3>
            </div>
            <div className="space-y-3">
              <FinancialRow
                label="Total Revenue (Gross Sales)"
                value={financialMetrics.totalRevenue}
                isHeader
              />
              <FinancialRow
                label="Less: Tax Amount (GST)"
                value={-financialMetrics.taxAmount}
                isNegative
                indent
              />
              <FinancialRow
                label="Revenue (Before Tax)"
                value={financialMetrics.revenueBeforeTax}
                isSubtotal
              />
              <FinancialRow
                label="Less: Cost of Goods Sold"
                value={-financialMetrics.totalCOGS}
                isNegative
                indent
              />
              <FinancialRow
                label="Gross Profit"
                value={financialMetrics.grossProfit}
                isSubtotal
              />
              <FinancialRow
                label="Less: Refunds/Returns"
                value={-financialMetrics.totalRefunds}
                isNegative
                indent
              />
              <FinancialRow
                label="Net Profit"
                value={financialMetrics.netProfit}
                isTotal
                color={financialMetrics.netProfit >= 0 ? "green" : "red"}
              />
            </div>
          </div>

          {/* Tax Summary */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/60 p-6 hover:shadow-2xl transition-shadow duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                <FiFileText className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Tax Summary</h3>
            </div>
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 border-2 border-purple-200 rounded-2xl p-5 shadow-inner">
                <p className="text-sm text-purple-700 font-semibold mb-2 flex items-center gap-2">
                  <FiFileText className="w-4 h-4" />
                  Current Tax Rate
                </p>
                <p className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {taxRate}%
                </p>
              </div>
              <FinancialRow
                label="Taxable Amount"
                value={financialMetrics.revenueBeforeTax}
              />
              <FinancialRow
                label={`Tax @ ${taxRate}%`}
                value={financialMetrics.taxAmount}
                isSubtotal
              />
              <FinancialRow
                label="Total (Tax Inclusive)"
                value={financialMetrics.totalRevenue}
                isTotal
              />
              <div className="mt-6 pt-5 border-t-2 border-gray-200">
                <p className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FiCalendar className="w-4 h-4" />
                  Tax Breakdown by Month
                </p>
                <div className="space-y-2.5">
                  {monthlyData.slice(-3).map((month) => (
                    <div
                      key={month.month}
                      className="flex justify-between items-center text-sm bg-gray-50 rounded-xl px-4 py-2.5 hover:bg-gray-100 transition-colors"
                    >
                      <span className="text-gray-600 font-medium">
                        {month.month}
                      </span>
                      <span className="font-bold text-gray-900">
                        ₹
                        {(
                          (month.revenue * taxRate) /
                          (100 + taxRate)
                        ).toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, gradient, subtitle }) {
  return (
    <div className="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/60 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-600 mb-1">{title}</p>
          <p className="text-lg sm:text-xl font-bold text-gray-900 mb-1 break-words">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
              {subtitle}
            </p>
          )}
        </div>
        <div
          className={`p-4 rounded-2xl bg-gradient-to-br ${gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <div
        className={`h-1.5 rounded-full bg-gradient-to-r ${gradient} opacity-20 group-hover:opacity-40 transition-opacity duration-300`}
      ></div>
    </div>
  );
}

function FinancialRow({
  label,
  value,
  isHeader,
  isSubtotal,
  isTotal,
  isNegative,
  indent,
  color,
}) {
  const formatValue = (val) => {
    const formatted = Math.abs(val).toLocaleString("en-IN");
    return val < 0 ? `-₹${formatted}` : `₹${formatted}`;
  };

  return (
    <div
      className={`flex justify-between items-center rounded-xl transition-all ${
        isTotal
          ? "pt-4 mt-2 border-t-2 border-gray-900 bg-gradient-to-r from-gray-50 to-transparent p-3"
          : ""
      } ${
        isSubtotal
          ? "pt-3 mt-2 border-t border-gray-300 bg-gray-50/50 p-2.5 rounded-lg"
          : ""
      } ${indent ? "pl-6" : ""} ${!isTotal && !isSubtotal ? "py-1.5" : ""}`}
    >
      <span
        className={`${isHeader || isTotal ? "font-bold" : "font-semibold"} ${
          isTotal ? "text-base sm:text-lg" : "text-sm"
        } ${isNegative ? "text-red-600" : "text-gray-700"}`}
      >
        {label}
      </span>
      <span
        className={`${isHeader || isTotal ? "font-bold" : "font-bold"} ${
          isTotal ? "text-lg sm:text-xl" : "text-sm"
        } ${
          color === "green"
            ? "text-green-600 bg-green-50 px-3 py-1 rounded-lg"
            : color === "red"
            ? "text-red-600 bg-red-50 px-3 py-1 rounded-lg"
            : isNegative
            ? "text-red-600"
            : "text-gray-900"
        }`}
      >
        {formatValue(value)}
      </span>
    </div>
  );
}

export default Billing;
