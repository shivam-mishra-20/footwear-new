import React, { useEffect, useMemo, useState } from "react";
import { db } from "../../firebaseConfig";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { jsPDF } from "jspdf";

// Professional icons via react-icons (Feather/Lucide)
import {
  FiBarChart2,
  FiShoppingBag,
  FiPackage,
  FiDownload,
  FiFileText,
  FiCalendar,
  FiTrendingUp,
} from "react-icons/fi";
const ReportIcon = ({ className = "w-6 h-6" }) => (
  <FiBarChart2 className={className} aria-hidden="true" />
);
const OrderIcon = ({ className = "w-6 h-6" }) => (
  <FiShoppingBag className={className} aria-hidden="true" />
);
const PackageIcon = ({ className = "w-6 h-6" }) => (
  <FiPackage className={className} aria-hidden="true" />
);
const CurrencyIcon = ({ className = "w-6 h-6" }) => (
  <FiBarChart2 className={className} aria-hidden="true" />
);
const DownloadIcon = ({ className = "w-4 h-4" }) => (
  <FiDownload className={className} aria-hidden="true" />
);
const DocumentIcon = ({ className = "w-4 h-4" }) => (
  <FiFileText className={className} aria-hidden="true" />
);
const CalendarIcon = ({ className = "w-4 h-4" }) => (
  <FiCalendar className={className} aria-hidden="true" />
);
const TrendUpIcon = ({ className = "w-4 h-4" }) => (
  <FiTrendingUp className={className} aria-hidden="true" />
);

function sum(items, f) {
  return items.reduce((s, x) => s + (f ? f(x) : x), 0);
}

function Report() {
  const [sales, setSales] = useState([]);
  const [range, setRange] = useState("30");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "Sales"), orderBy("created_at", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setSales(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const days = Number(range);
    const since = Date.now() - days * 24 * 3600 * 1000;
    return sales.filter((s) => {
      const ts = s.created_at?.toMillis ? s.created_at.toMillis() : Date.now();
      return ts >= since;
    });
  }, [sales, range]);

  const totals = useMemo(() => {
    const orders = filtered.length;
    const revenue = sum(filtered, (s) => Number(s.total || 0));
    const items = sum(filtered, (s) =>
      (s.items || []).reduce((t, i) => t + Number(i.qty || 0), 0)
    );
    return { orders, revenue, items };
  }, [filtered]);

  const exportCSV = () => {
    const rows = [
      [
        "sale_id",
        "date",
        "customer_name",
        "phone",
        "items",
        "total",
        "payment_method",
        "payment_reference",
      ],
      ...filtered.map((s) => [
        s.sale_id,
        s.created_at?.toDate ? s.created_at.toDate().toISOString() : "",
        s.customer?.name || "",
        s.customer?.phone || "",
        (s.items || []).map((i) => `${i.name} x${i.qty}`).join("; "),
        s.total,
        s.payment?.method || "",
        s.payment?.reference || "",
      ]),
    ];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales_report_${range}days_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadInvoice = (sale) => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setFont("helvetica", "normal");
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 50;

    const fmtINR = (n) =>
      new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
        Number(n || 0)
      );
    const textRight = (str, xRight, yPos) =>
      doc.text(String(str), xRight, yPos, { align: "right" });
    const drawCurrency = (numStr, xRight, yPos) => {
      const gap = 4;
      const width = doc.getTextWidth(numStr);
      textRight(numStr, xRight, yPos);
      doc.text("₹", xRight - width - gap, yPos);
    };

    // Header
    doc.setFontSize(20);
    doc.text("NOBLE FOOTWEAR", 40, y);
    y += 18;
    doc.setFontSize(10);
    doc.text("GSTIN: —", 40, y);
    y += 14;
    doc.text("Address: 123, Business Street, City, State - 000000", 40, y);
    y += 14;
    doc.text("Phone: +91-XXXXXXXXXX | Email: contact@noblefootwear.com", 40, y);
    y += 20;

    doc.setFontSize(16);
    doc.text("TAX INVOICE", 40, y);
    y += 18;
    doc.setFontSize(11);
    const dateStr = sale.created_at?.toDate
      ? sale.created_at.toDate().toLocaleString()
      : new Date().toLocaleString();
    doc.text(`Invoice No: ${sale.sale_id}`, 40, y);
    textRight(`Date: ${dateStr}`, pageWidth - 40, y);
    y += 18;

    doc.setFontSize(12);
    doc.text("Bill To:", 40, y);
    y += 14;
    doc.setFontSize(11);
    doc.text(`${sale.customer?.name || "-"}`, 40, y);
    y += 14;
    if (sale.customer?.phone) {
      doc.text(`Phone: ${sale.customer.phone}`, 40, y);
      y += 16;
    }

    y += 6;
    const colItemLeft = 50;
    const colQtyRight = pageWidth - 260;
    const colPriceRight = pageWidth - 200;
    const colAmountRight = pageWidth - 40;
    doc.setFillColor(240, 248, 255);
    doc.rect(40, y, pageWidth - 80, 24, "F");
    doc.setFontSize(11);
    doc.text("Item", colItemLeft, y + 16);
    textRight("Qty", colQtyRight, y + 16);
    textRight("Price", colPriceRight, y + 16);
    textRight("Amount", colAmountRight, y + 16);
    y += 28;

    const items = sale.items || [];
    doc.setFontSize(10);
    items.forEach((it) => {
      const amount = Number(it.price || 0) * Number(it.qty || 0);
      doc.text(`${it.name || ""}`, colItemLeft, y);
      textRight(String(it.qty), colQtyRight, y);
      drawCurrency(fmtINR(it.price), colPriceRight, y);
      drawCurrency(fmtINR(amount), colAmountRight, y);
      y += 16;
      if (y > 760) {
        doc.addPage();
        doc.setFont("helvetica", "normal");
        y = 50;
      }
    });

    y += 8;
    doc.setDrawColor(200);
    doc.line(40, y, pageWidth - 40, y);
    y += 16;

    const totalsRight = colAmountRight;
    const labelRight = totalsRight - 120;
    doc.setFontSize(11);
    textRight("Subtotal", labelRight, y);
    drawCurrency(fmtINR(sale.subtotal ?? sale.total), totalsRight, y);
    y += 16;
    const discount = Number(sale.discount || 0);
    if (discount) {
      textRight("Discount", labelRight, y);
      drawCurrency(fmtINR(discount), totalsRight, y);
      y += 16;
    }
    doc.setFontSize(12);
    textRight("Total", labelRight, y);
    drawCurrency(fmtINR(sale.total), totalsRight, y);
    y += 20;

    doc.setFontSize(10);
    if (sale.payment?.method) {
      doc.text(
        `Payment: ${sale.payment.method} ${
          sale.payment.reference ? "(" + sale.payment.reference + ")" : ""
        }`,
        40,
        y
      );
      y += 14;
      if (typeof sale.payment.amount_received !== "undefined") {
        const receivedStr = fmtINR(sale.payment.amount_received);
        doc.text("Received:", 40, y);
        drawCurrency(receivedStr, 140, y);
        y += 14;
      }
      if (typeof sale.payment.change !== "undefined") {
        const changeStr = fmtINR(sale.payment.change);
        doc.text("Change:", 40, y);
        drawCurrency(changeStr, 140, y);
        y += 14;
      }
    }

    y += 8;
    doc.setDrawColor(220);
    doc.line(40, y, pageWidth - 40, y);
    y += 16;
    doc.setFontSize(9);
    doc.text(
      "Thank you for your business! Goods once sold will not be taken back.",
      40,
      y
    );

    doc.save(`invoice_${sale.sale_id}.pdf`);
  };

  const MetricCard = ({ title, value, Icon, bgColor, textColor, trend }) => (
    <div
      className={`${bgColor} rounded-2xl p-6 shadow-lg border border-gray-100 transition-all duration-200 hover:shadow-xl hover:scale-[1.02]`}
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className={`p-3 rounded-xl ${textColor
            .replace("text-", "bg-")
            .replace("-600", "-100")} ${textColor}`}
        >
          {Icon && <Icon />}
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <TrendUpIcon />
            <span className="font-medium">+12%</span>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-3xl font-bold text-gray-900">
          {title.includes("Revenue")
            ? `₹${value.toLocaleString()}`
            : value.toLocaleString()}
        </p>
        <p className="text-xs text-gray-500">Last {range} days</p>
      </div>
    </div>
  );

  const getRangeText = () => {
    const rangeMap = {
      7: "Last 7 days",
      30: "Last 30 days",
      90: "Last 90 days",
    };
    return rangeMap[range] || "Custom range";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 rounded w-48"></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6 lg:p-2">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-xl">
                <ReportIcon />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Sales Reports
                </h1>
                <p className="text-gray-600 mt-1">
                  Comprehensive analytics and insights • {getRangeText()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
                <CalendarIcon />
                <select
                  className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700 p-3 "
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                </select>
              </div>
              <button
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                onClick={exportCSV}
              >
                <DownloadIcon />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <MetricCard
            title="Total Orders"
            value={totals.orders}
            Icon={OrderIcon}
            bgColor="bg-white"
            textColor="text-blue-600"
            trend={true}
          />
          <MetricCard
            title="Items Sold"
            value={totals.items}
            Icon={PackageIcon}
            bgColor="bg-white"
            textColor="text-green-600"
            trend={true}
          />
          <MetricCard
            title="Total Revenue"
            value={totals.revenue}
            Icon={CurrencyIcon}
            bgColor="bg-white"
            textColor="text-purple-600"
            trend={true}
          />
        </div>

        {/* Sales Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
          {/* Table Header */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-1">
                  Sales Transactions
                </h3>
                <p className="text-sm text-gray-600">
                  {filtered.length} transaction
                  {filtered.length !== 1 ? "s" : ""} in selected period
                </p>
              </div>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-hidden">
            <div className="overflow-x-auto">
              {filtered.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Sale ID
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Items
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Payment
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((sale) => (
                      <tr
                        key={sale.id}
                        className="hover:bg-gray-50 transition-colors duration-150"
                      >
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {sale.sale_id}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {sale.created_at?.toDate
                              ? sale.created_at.toDate().toLocaleDateString()
                              : "—"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {sale.created_at?.toDate
                              ? sale.created_at.toDate().toLocaleTimeString()
                              : ""}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {sale.customer?.name || "Walk-in Customer"}
                          </div>
                          {sale.customer?.phone && (
                            <div className="text-xs text-gray-500">
                              {sale.customer.phone}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {(sale.items || []).length} item
                            {(sale.items || []).length !== 1 ? "s" : ""}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="text-sm font-semibold text-gray-900">
                            ₹{Number(sale.total || 0).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="text-sm text-gray-900">
                            {sale.payment?.method || "—"}
                          </div>
                          {sale.payment?.reference && (
                            <div className="text-xs text-gray-500 truncate max-w-20">
                              {sale.payment.reference}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-150"
                            onClick={() => downloadInvoice(sale)}
                          >
                            <DocumentIcon />
                            Invoice
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <ReportIcon />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No sales data found
                  </h3>
                  <p className="text-gray-500 text-center max-w-md">
                    No sales transactions were found for the selected time
                    period. Try adjusting your date range or check back later.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Table Footer */}
          {filtered.length > 0 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  Showing {filtered.length} transaction
                  {filtered.length !== 1 ? "s" : ""}
                  from {getRangeText().toLowerCase()}
                </span>
                <div className="flex items-center gap-4">
                  <span className="font-medium">
                    Total Revenue: ₹{totals.revenue.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Report;
