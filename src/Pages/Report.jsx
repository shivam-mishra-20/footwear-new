import React, { useEffect, useMemo, useState } from "react";
import { db } from "../../firebaseConfig";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
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
  FiEdit2,
  FiTrash2,
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
const EditIcon = ({ className = "w-4 h-4" }) => (
  <FiEdit2 className={className} aria-hidden="true" />
);
const DeleteIcon = ({ className = "w-4 h-4" }) => (
  <FiTrash2 className={className} aria-hidden="true" />
);

function sum(items, f) {
  return items.reduce((s, x) => s + (f ? f(x) : x), 0);
}

function Report() {
  const [sales, setSales] = useState([]);
  const [range, setRange] = useState("30");
  const [isLoading, setIsLoading] = useState(true);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [invoiceContent, setInvoiceContent] = useState("");
  const [invoicePhone, setInvoicePhone] = useState("");
  const [invoiceError, setInvoiceError] = useState("");
  const [invoiceSuccess, setInvoiceSuccess] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerPhone, setEditCustomerPhone] = useState("");
  const [editTotal, setEditTotal] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("");
  const [editPaymentRef, setEditPaymentRef] = useState("");
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [showRevenueModal, setShowRevenueModal] = useState(false);

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

  // Calculate detailed analytics
  const analytics = useMemo(() => {
    if (filtered.length === 0) {
      return {
        ordersByDay: [],
        topProducts: [],
        paymentMethods: [],
        revenueByDay: [],
        averageOrderValue: 0,
        totalSavings: 0,
      };
    }

    // Group orders by day
    const ordersByDay = {};
    const revenueByDay = {};
    const productSales = {};
    const paymentMethodStats = {};
    let totalSavings = 0;

    filtered.forEach((sale) => {
      const date = sale.created_at?.toDate
        ? sale.created_at.toDate().toLocaleDateString()
        : new Date().toLocaleDateString();

      // Orders by day
      ordersByDay[date] = (ordersByDay[date] || 0) + 1;

      // Revenue by day
      revenueByDay[date] = (revenueByDay[date] || 0) + Number(sale.total || 0);

      // Product sales
      (sale.items || []).forEach((item) => {
        if (!productSales[item.name]) {
          productSales[item.name] = { qty: 0, revenue: 0 };
        }
        productSales[item.name].qty += Number(item.qty || 0);
        productSales[item.name].revenue +=
          Number(item.price || 0) * Number(item.qty || 0);
      });

      // Payment methods
      const method = sale.payment?.method || "Unknown";
      if (!paymentMethodStats[method]) {
        paymentMethodStats[method] = { count: 0, amount: 0 };
      }
      paymentMethodStats[method].count += 1;
      paymentMethodStats[method].amount += Number(sale.total || 0);

      // Total savings
      const itemDiscounts = Number(sale.itemDiscountTotal || 0);
      const globalDiscount = Number(sale.totalDiscount || 0);
      totalSavings += itemDiscounts + globalDiscount;
    });

    // Convert to arrays and sort
    const ordersByDayArray = Object.entries(ordersByDay).map(
      ([date, count]) => ({
        date,
        count,
      })
    );

    const revenueByDayArray = Object.entries(revenueByDay).map(
      ([date, amount]) => ({
        date,
        amount,
      })
    );

    const topProducts = Object.entries(productSales)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    const paymentMethods = Object.entries(paymentMethodStats).map(
      ([method, data]) => ({ method, ...data })
    );

    const averageOrderValue = totals.revenue / totals.orders || 0;

    return {
      ordersByDay: ordersByDayArray,
      revenueByDay: revenueByDayArray,
      topProducts,
      paymentMethods,
      averageOrderValue,
      totalSavings,
    };
  }, [filtered, totals]);

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
      const itemName = it.name || "";
      const hasMRP = it.mrp && it.itemDiscount > 0;

      // Show item name
      doc.text(itemName, colItemLeft, y);

      // Show MRP if there's an item discount
      if (hasMRP) {
        y += 12;
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `  MRP: ${fmtINR(it.mrp)} - Disc: ${fmtINR(it.itemDiscount)}`,
          colItemLeft,
          y
        );
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        y -= 12;
      }

      const amount = Number(it.price || 0) * Number(it.qty || 0);
      textRight(String(it.qty), colQtyRight, y);
      drawCurrency(fmtINR(it.price), colPriceRight, y);
      drawCurrency(fmtINR(amount), colAmountRight, y);
      y += hasMRP ? 24 : 16;
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

    // Show MRP Total if there are item discounts
    const itemDiscountTotal = Number(sale.itemDiscountTotal || 0);
    if (itemDiscountTotal > 0) {
      const mrpTotal = Number(sale.subtotal || 0) + itemDiscountTotal;
      textRight("MRP Total", labelRight, y);
      drawCurrency(fmtINR(mrpTotal), totalsRight, y);
      y += 14;

      textRight("Item Discounts", labelRight, y);
      doc.text("-", totalsRight - 72, y);
      drawCurrency(fmtINR(itemDiscountTotal), totalsRight, y);
      y += 16;
    }

    // Subtotal (SRP)
    textRight("Subtotal (SRP)", labelRight, y);
    drawCurrency(fmtINR(sale.subtotal ?? sale.total), totalsRight, y);
    y += 16;

    // Global discount
    const globalDiscountPercent = Number(sale.globalDiscountPercent || 0);
    const totalDiscountAmount = Number(sale.totalDiscount || 0);
    if (globalDiscountPercent > 0 && totalDiscountAmount > 0) {
      textRight(
        `Additional Discount (${globalDiscountPercent}%)`,
        labelRight,
        y
      );
      doc.text("-", totalsRight - 72, y);
      drawCurrency(fmtINR(totalDiscountAmount), totalsRight, y);
      y += 16;
    }

    // Total
    doc.setFontSize(12);
    textRight("Total", labelRight, y);
    drawCurrency(fmtINR(sale.total), totalsRight, y);
    y += 16;

    // Show total savings
    const totalSavings =
      Number(sale.subtotal || 0) + itemDiscountTotal - Number(sale.total || 0);
    if (totalSavings > 0) {
      doc.setFontSize(10);
      doc.setTextColor(0, 128, 0);
      textRight(`You Saved: ${fmtINR(totalSavings)}`, totalsRight, y);
      doc.setTextColor(0, 0, 0);
      y += 4;
    }

    y += 4;

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

  // Build WhatsApp invoice message for a sale
  const buildWhatsAppMessage = (sale) => {
    const lines = [
      `🧾 *Invoice Summary*`,
      `━━━━━━━━━━━━━━━━━━`,
      `*Store:* Noble Footwear`,
      `*Date:* ${
        sale.created_at?.toDate
          ? sale.created_at.toDate().toLocaleString()
          : new Date().toLocaleString()
      }`,
      `*Invoice No:* ${sale.sale_id}`,
      ``,
      `*Customer:* ${sale.customer?.name || "Walk-in Customer"}`,
      sale.customer?.phone ? `*Phone:* ${sale.customer.phone}` : "",
      ``,
      `*Items:*`,
    ];
    (sale.items || []).forEach((item, idx) => {
      const itemTotal = Number(item.price || 0) * Number(item.qty || 0);
      let itemLine = `${idx + 1}. ${item.name} × ${item.qty}`;

      // Show MRP and item discount if applicable
      if (item.mrp && item.itemDiscount > 0) {
        itemLine += ` (MRP: ₹${Number(item.mrp).toLocaleString("en-IN")})`;
        itemLine += `\n   SRP: ₹${Number(item.price).toLocaleString(
          "en-IN"
        )} × ${item.qty} = ₹${itemTotal.toLocaleString("en-IN")}`;
        itemLine += `\n   _Discount: ₹${Number(
          item.itemDiscount
        ).toLocaleString("en-IN")}/item_`;
      } else {
        itemLine += ` = ₹${itemTotal.toLocaleString("en-IN")}`;
      }

      lines.push(itemLine);
    });

    lines.push(``, `━━━━━━━━━━━━━━━━━━`);

    // Show pricing breakdown
    const itemDiscountTotal = Number(sale.itemDiscountTotal || 0);
    const globalDiscountPercent = Number(sale.globalDiscountPercent || 0);
    const totalDiscountAmount = Number(sale.totalDiscount || 0);

    if (itemDiscountTotal > 0) {
      const mrpTotal = Number(sale.subtotal || 0) + itemDiscountTotal;
      lines.push(`MRP Total: ₹${mrpTotal.toLocaleString("en-IN")}`);
      lines.push(
        `Item Discounts: -₹${itemDiscountTotal.toLocaleString("en-IN")}`
      );
    }

    if (globalDiscountPercent > 0 || itemDiscountTotal > 0) {
      lines.push(
        `Subtotal (SRP): ₹${Number(sale.subtotal || 0).toLocaleString("en-IN")}`
      );
    }

    if (globalDiscountPercent > 0 && totalDiscountAmount > 0) {
      lines.push(
        `Additional Discount (${globalDiscountPercent}%): -₹${totalDiscountAmount.toLocaleString(
          "en-IN"
        )}`
      );
    }

    lines.push(
      `💰 *Total: ₹${Number(sale.total || 0).toLocaleString("en-IN")}*`
    );

    // Show total savings
    const totalSavings =
      Number(sale.subtotal || 0) + itemDiscountTotal - Number(sale.total || 0);
    if (totalSavings > 0) {
      lines.push(`🎉 *You Saved: ₹${totalSavings.toLocaleString("en-IN")}*`);
    }

    lines.push(``);

    if (sale.payment?.method) {
      lines.push(`*Payment Method:* ${sale.payment.method}`);
      if (sale.payment.reference) {
        lines.push(`*Reference:* ${sale.payment.reference}`);
      }
    }
    lines.push(
      ``,
      `✅ Thank you for shopping with us!`,
      `Need assistance? Reply here – we're happy to help.`,
      `📍 Visit again: Noble Footwear`
    );
    return lines.filter(Boolean).join("\n");
  };

  // WhatsApp encoder
  const encodeWhatsAppMessage = (text) => {
    return encodeURIComponent(text)
      .replace(/%EF%B8%8F/g, "")
      .replace(/%0A/g, "%0D%0A");
  };

  // Open invoice modal with pre-filled content
  const openInvoiceModal = (sale) => {
    setSelectedSale(sale);
    const invoiceText = buildWhatsAppMessage(sale);
    setInvoiceContent(invoiceText);
    setInvoicePhone(sale.customer?.phone || "");
    setInvoiceError("");
    setInvoiceSuccess("");
    setShowInvoiceModal(true);
  };

  // Open edit modal
  const openEditModal = (sale) => {
    setEditingSale(sale);
    setEditCustomerName(sale.customer?.name || "");
    setEditCustomerPhone(sale.customer?.phone || "");
    setEditTotal(sale.total || "");
    setEditPaymentMethod(sale.payment?.method || "");
    setEditPaymentRef(sale.payment?.reference || "");
    setEditError("");
    setEditSuccess("");
    setShowEditModal(true);
  };

  // Save edited sale
  const handleSaveEdit = async () => {
    if (!editingSale) return;
    setEditError("");
    setEditSuccess("");

    try {
      const saleRef = doc(db, "Sales", editingSale.id);
      await updateDoc(saleRef, {
        customer: {
          name: editCustomerName,
          phone: editCustomerPhone,
        },
        total: Number(editTotal) || 0,
        payment: {
          method: editPaymentMethod,
          reference: editPaymentRef,
        },
      });
      setEditSuccess("Sale updated successfully!");
      setTimeout(() => {
        setShowEditModal(false);
        setEditingSale(null);
      }, 1500);
    } catch (err) {
      setEditError(err.message || "Failed to update sale.");
    }
  };

  // Open delete confirmation modal
  const openDeleteModal = (sale) => {
    setEditingSale(sale);
    setEditError("");
    setShowDeleteModal(true);
  };

  // Delete sale
  const handleDeleteSale = async () => {
    if (!editingSale) return;
    setEditError("");

    try {
      await deleteDoc(doc(db, "Sales", editingSale.id));
      setShowDeleteModal(false);
      setEditingSale(null);
    } catch (err) {
      setEditError(err.message || "Failed to delete sale.");
    }
  };

  const MetricCard = ({
    title,
    value,
    Icon,
    bgColor,
    textColor,
    trend,
    onClick,
  }) => (
    <button
      onClick={onClick}
      className={`${bgColor} rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 transition-all duration-200 hover:shadow-xl hover:scale-[1.02] cursor-pointer w-full text-left`}
    >
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div
          className={`p-2 sm:p-3 rounded-lg sm:rounded-xl ${textColor
            .replace("text-", "bg-")
            .replace("-600", "-100")} ${textColor}`}
        >
          {Icon && <Icon className="w-5 h-5 sm:w-6 sm:h-6" />}
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <TrendUpIcon className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="font-medium">+12%</span>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-xs sm:text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl sm:text-3xl font-bold text-gray-900">
          {title.includes("Revenue")
            ? `₹${value.toLocaleString()}`
            : value.toLocaleString()}
        </p>
        <p className="text-xs text-gray-500">
          Last {range} days • Click for details
        </p>
      </div>
    </button>
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
      <div className="min-h-screen bg-gray-50 p-3 sm:p-4 lg:p-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="animate-pulse space-y-6 sm:space-y-8">
            <div className="h-6 sm:h-8 bg-gray-200 rounded w-32 sm:w-48"></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-28 sm:h-32 bg-gray-200 rounded-xl sm:rounded-2xl"
                ></div>
              ))}
            </div>
            <div className="h-64 sm:h-96 bg-gray-200 rounded-xl sm:rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 lg:p-6">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg sm:rounded-xl flex-shrink-0">
                <ReportIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">
                  Sales Reports
                </h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">
                  Analytics & insights • {getRangeText()}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 bg-white rounded-lg sm:rounded-xl p-2 shadow-sm border border-gray-100 flex-1 sm:flex-initial">
                <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 ml-1" />
                <select
                  className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700 py-1 sm:py-2 px-1 flex-1"
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                </select>
              </div>
              <button
                className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-medium rounded-lg sm:rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base"
                onClick={exportCSV}
              >
                <DownloadIcon className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <MetricCard
            title="Total Orders"
            value={totals.orders}
            Icon={OrderIcon}
            bgColor="bg-white"
            textColor="text-blue-600"
            trend={true}
            onClick={() => setShowOrdersModal(true)}
          />
          <MetricCard
            title="Items Sold"
            value={totals.items}
            Icon={PackageIcon}
            bgColor="bg-white"
            textColor="text-green-600"
            trend={true}
            onClick={() => setShowItemsModal(true)}
          />
          <MetricCard
            title="Total Revenue"
            value={totals.revenue}
            Icon={CurrencyIcon}
            bgColor="bg-white"
            textColor="text-purple-600"
            trend={true}
            onClick={() => setShowRevenueModal(true)}
          />
        </div>

        {/* Sales Table */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100">
          {/* Table Header */}
          <div className="p-4 sm:p-6 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">
                  Sales Transactions
                </h3>
                <p className="text-xs sm:text-sm text-gray-600">
                  {filtered.length} transaction
                  {filtered.length !== 1 ? "s" : ""} in selected period
                </p>
              </div>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-hidden">
            {filtered.length > 0 ? (
              <>
                {/* Desktop Table (hidden on mobile) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Sale ID
                        </th>
                        <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Date & Time
                        </th>
                        <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-4 lg:px-6 py-3 lg:py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Items
                        </th>
                        <th className="px-4 lg:px-6 py-3 lg:py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-4 lg:px-6 py-3 lg:py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Payment
                        </th>
                        <th className="px-4 lg:px-6 py-3 lg:py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
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
                          <td className="px-4 lg:px-6 py-3 lg:py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {sale.sale_id}
                            </div>
                          </td>
                          <td className="px-4 lg:px-6 py-3 lg:py-4">
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
                          <td className="px-4 lg:px-6 py-3 lg:py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {sale.customer?.name || "Walk-in Customer"}
                            </div>
                            {sale.customer?.phone && (
                              <div className="text-xs text-gray-500">
                                {sale.customer.phone}
                              </div>
                            )}
                          </td>
                          <td className="px-4 lg:px-6 py-3 lg:py-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {(sale.items || []).length} item
                              {(sale.items || []).length !== 1 ? "s" : ""}
                            </span>
                          </td>
                          <td className="px-4 lg:px-6 py-3 lg:py-4 text-right">
                            <div className="space-y-0.5">
                              {/* Show MRP if there are item discounts */}
                              {sale.itemDiscountTotal > 0 && (
                                <div className="text-xs text-gray-500 line-through">
                                  MRP: ₹
                                  {(
                                    Number(sale.subtotal || 0) +
                                    Number(sale.itemDiscountTotal || 0)
                                  ).toLocaleString()}
                                </div>
                              )}
                              {/* Show SRP (Subtotal) if there's a global discount */}
                              {sale.globalDiscountPercent > 0 && (
                                <div className="text-xs text-gray-600">
                                  SRP: ₹
                                  {Number(sale.subtotal || 0).toLocaleString()}
                                </div>
                              )}
                              {/* Show final total */}
                              <div className="text-sm font-semibold text-gray-900">
                                ₹{Number(sale.total || 0).toLocaleString()}
                              </div>
                              {/* Show total savings if any discount applied */}
                              {(sale.itemDiscountTotal > 0 ||
                                sale.globalDiscountPercent > 0) && (
                                <div className="text-xs text-green-600 font-medium">
                                  Saved: ₹
                                  {(
                                    Number(sale.subtotal || 0) +
                                    Number(sale.itemDiscountTotal || 0) -
                                    Number(sale.total || 0)
                                  ).toLocaleString()}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 lg:px-6 py-3 lg:py-4 text-center">
                            <div className="text-sm text-gray-900">
                              {sale.payment?.method || "—"}
                            </div>
                            {sale.payment?.reference && (
                              <div className="text-xs text-gray-500 truncate max-w-20">
                                {sale.payment.reference}
                              </div>
                            )}
                          </td>
                          <td className="px-4 lg:px-6 py-3 lg:py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 active:scale-95 transition-all duration-150"
                                onClick={() => openInvoiceModal(sale)}
                                title="Generate Invoice"
                              >
                                <DocumentIcon />
                                Invoice
                              </button>
                              <button
                                className="p-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 active:scale-95 transition-all duration-150"
                                onClick={() => openEditModal(sale)}
                                title="Edit Sale"
                              >
                                <EditIcon />
                              </button>
                              <button
                                className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 active:scale-95 transition-all duration-150"
                                onClick={() => openDeleteModal(sale)}
                                title="Delete Sale"
                              >
                                <DeleteIcon />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card List (visible on mobile only) */}
                <div className="md:hidden space-y-3 p-3">
                  {filtered.map((sale) => (
                    <div
                      key={sale.id}
                      className="bg-white border border-gray-100 rounded-lg p-4 space-y-3"
                    >
                      {/* Header Row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">
                            {sale.sale_id}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {sale.created_at?.toDate
                              ? sale.created_at.toDate().toLocaleDateString()
                              : "—"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="space-y-0.5">
                            {/* Show MRP if there are item discounts */}
                            {sale.itemDiscountTotal > 0 && (
                              <div className="text-xs text-gray-500 line-through">
                                MRP: ₹
                                {(
                                  Number(sale.subtotal || 0) +
                                  Number(sale.itemDiscountTotal || 0)
                                ).toLocaleString()}
                              </div>
                            )}
                            {/* Show SRP if there's a global discount */}
                            {sale.globalDiscountPercent > 0 && (
                              <div className="text-xs text-gray-600">
                                SRP: ₹
                                {Number(sale.subtotal || 0).toLocaleString()}
                              </div>
                            )}
                            {/* Show final total */}
                            <div className="text-base font-bold text-gray-900">
                              ₹{Number(sale.total || 0).toLocaleString()}
                            </div>
                            {/* Show total savings if any discount applied */}
                            {(sale.itemDiscountTotal > 0 ||
                              sale.globalDiscountPercent > 0) && (
                              <div className="text-xs text-green-600 font-medium">
                                Saved: ₹
                                {(
                                  Number(sale.subtotal || 0) +
                                  Number(sale.itemDiscountTotal || 0) -
                                  Number(sale.total || 0)
                                ).toLocaleString()}
                              </div>
                            )}
                          </div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-2">
                            {(sale.items || []).length} item
                            {(sale.items || []).length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>

                      {/* Customer Info */}
                      <div className="border-t border-gray-100 pt-2">
                        <div className="text-xs text-gray-500 mb-1">
                          Customer
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {sale.customer?.name || "Walk-in Customer"}
                        </div>
                        {sale.customer?.phone && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            {sale.customer.phone}
                          </div>
                        )}
                      </div>

                      {/* Payment Info */}
                      <div className="border-t border-gray-100 pt-2">
                        <div className="text-xs text-gray-500 mb-1">
                          Payment
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {sale.payment?.method || "—"}
                            </div>
                            {sale.payment?.reference && (
                              <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[180px]">
                                Ref: {sale.payment.reference}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="border-t border-gray-100 pt-2 flex gap-2">
                        <button
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 active:scale-95 transition-all duration-150"
                          onClick={() => openInvoiceModal(sale)}
                        >
                          <DocumentIcon className="w-3.5 h-3.5" />
                          Invoice
                        </button>
                        <button
                          className="p-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 active:scale-95 transition-all duration-150"
                          onClick={() => openEditModal(sale)}
                          title="Edit"
                        >
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 active:scale-95 transition-all duration-150"
                          onClick={() => openDeleteModal(sale)}
                          title="Delete"
                        >
                          <DeleteIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                  <ReportIcon className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                  No sales data found
                </h3>
                <p className="text-sm sm:text-base text-gray-500 text-center max-w-md px-4">
                  No sales transactions were found for the selected time period.
                  Try adjusting your date range or check back later.
                </p>
              </div>
            )}
          </div>

          {/* Table Footer */}
          {filtered.length > 0 && (
            <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border-t border-gray-100">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs sm:text-sm text-gray-600">
                <span>
                  Showing {filtered.length} transaction
                  {filtered.length !== 1 ? "s" : ""}
                </span>
                <div className="flex items-center gap-2 sm:gap-4">
                  <span className="font-medium">
                    Total: ₹{totals.revenue.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Modal */}
      {showInvoiceModal && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                  Generate Invoice
                </h3>
                <button
                  onClick={() => {
                    setShowInvoiceModal(false);
                    setSelectedSale(null);
                    setInvoiceError("");
                    setInvoiceSuccess("");
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-150"
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

              <div className="space-y-4 sm:space-y-6">
                {/* Sale Info Summary */}
                <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Invoice ID</p>
                      <p className="font-semibold text-gray-900">
                        {selectedSale.sale_id}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Final Amount</p>
                      <p className="font-semibold text-gray-900">
                        ₹{Number(selectedSale.total || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {/* Show pricing breakdown if discounts are applied */}
                  {(selectedSale.itemDiscountTotal > 0 ||
                    selectedSale.globalDiscountPercent > 0) && (
                    <div className="border-t border-blue-100 pt-3 space-y-1.5 text-xs">
                      {selectedSale.itemDiscountTotal > 0 && (
                        <>
                          <div className="flex justify-between text-gray-700">
                            <span>MRP Total:</span>
                            <span className="line-through">
                              ₹
                              {(
                                Number(selectedSale.subtotal || 0) +
                                Number(selectedSale.itemDiscountTotal || 0)
                              ).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between text-gray-700">
                            <span>Item Discounts:</span>
                            <span className="text-red-600">
                              -₹
                              {Number(
                                selectedSale.itemDiscountTotal || 0
                              ).toLocaleString()}
                            </span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between text-gray-700">
                        <span>Subtotal (SRP):</span>
                        <span>
                          ₹{Number(selectedSale.subtotal || 0).toLocaleString()}
                        </span>
                      </div>
                      {selectedSale.globalDiscountPercent > 0 && (
                        <div className="flex justify-between text-gray-700">
                          <span>
                            Additional Discount (
                            {selectedSale.globalDiscountPercent}%):
                          </span>
                          <span className="text-red-600">
                            -₹
                            {Number(
                              selectedSale.totalDiscount || 0
                            ).toLocaleString()}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold text-green-700 pt-1.5 border-t border-blue-200">
                        <span>You Saved:</span>
                        <span>
                          ₹
                          {(
                            Number(selectedSale.subtotal || 0) +
                            Number(selectedSale.itemDiscountTotal || 0) -
                            Number(selectedSale.total || 0)
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    WhatsApp Number
                  </label>
                  <input
                    type="text"
                    placeholder="Enter recipient phone with country code (e.g. 919876543210)"
                    value={invoicePhone}
                    onChange={(e) => setInvoicePhone(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm sm:text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invoice Content
                  </label>
                  <textarea
                    value={invoiceContent}
                    onChange={(e) => setInvoiceContent(e.target.value)}
                    rows={12}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 font-mono text-xs sm:text-sm resize-none"
                  />
                </div>

                {(invoiceError || invoiceSuccess) && (
                  <div className="space-y-2">
                    {invoiceError && (
                      <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg sm:rounded-xl">
                        <p className="text-red-700 text-xs sm:text-sm font-medium">
                          {invoiceError}
                        </p>
                      </div>
                    )}
                    {invoiceSuccess && (
                      <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg sm:rounded-xl">
                        <p className="text-green-700 text-xs sm:text-sm font-medium">
                          {invoiceSuccess}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end mt-4 sm:mt-6">
                <button
                  className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-100 text-gray-700 font-medium rounded-lg sm:rounded-xl hover:bg-gray-200 transition-colors duration-200 text-sm sm:text-base"
                  onClick={() => {
                    setShowInvoiceModal(false);
                    setSelectedSale(null);
                    setInvoiceError("");
                    setInvoiceSuccess("");
                  }}
                >
                  Close
                </button>
                <button
                  className="px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white font-medium rounded-lg sm:rounded-xl hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2 justify-center text-sm sm:text-base"
                  onClick={() => {
                    setInvoiceError("");
                    setInvoiceSuccess("");
                    try {
                      downloadInvoice(selectedSale);
                      setInvoiceSuccess(
                        "PDF generated. You can also share it on WhatsApp."
                      );
                    } catch (err) {
                      setInvoiceError(err.message || "Failed to generate PDF.");
                    }
                  }}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Generate PDF
                </button>
                <button
                  className="px-4 sm:px-6 py-2.5 sm:py-3 bg-green-600 text-white font-medium rounded-lg sm:rounded-xl hover:bg-green-700 transition-colors duration-200 flex items-center gap-2 justify-center text-sm sm:text-base"
                  onClick={async () => {
                    setInvoiceError("");
                    setInvoiceSuccess("");
                    const digits = (invoicePhone || "").replace(/\D/g, "");
                    if (!digits) {
                      setInvoiceError("Please enter a valid phone number.");
                      return;
                    }
                    try {
                      const msg =
                        invoiceContent || buildWhatsAppMessage(selectedSale);
                      const waUrl = `https://api.whatsapp.com/send?phone=${digits}&text=${encodeWhatsAppMessage(
                        msg
                      )}`;
                      window.open(waUrl, "_blank");
                      setInvoiceSuccess(
                        "WhatsApp opened with invoice. Please complete send in WhatsApp."
                      );
                    } catch (err) {
                      setInvoiceError(
                        err.message || "Failed to open WhatsApp."
                      );
                    }
                  }}
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  Send via WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                  Edit Sale
                </h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingSale(null);
                    setEditError("");
                    setEditSuccess("");
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-150"
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

              <div className="space-y-4">
                {/* Sale ID (read-only) */}
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Sale ID</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {editingSale.sale_id}
                  </p>
                </div>

                {/* Customer Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter customer name"
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-sm"
                  />
                </div>

                {/* Customer Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="Enter phone number"
                    value={editCustomerPhone}
                    onChange={(e) => setEditCustomerPhone(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-sm"
                  />
                </div>

                {/* Total Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Amount
                  </label>
                  <input
                    type="number"
                    placeholder="Enter total amount"
                    value={editTotal}
                    onChange={(e) => setEditTotal(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-sm"
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={editPaymentMethod}
                    onChange={(e) => setEditPaymentMethod(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-sm"
                  >
                    <option value="">Select payment method</option>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Payment Reference */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Reference (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Enter payment reference"
                    value={editPaymentRef}
                    onChange={(e) => setEditPaymentRef(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-sm"
                  />
                </div>

                {/* Messages */}
                {(editError || editSuccess) && (
                  <div className="space-y-2">
                    {editError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-700 text-xs sm:text-sm font-medium">
                          {editError}
                        </p>
                      </div>
                    )}
                    {editSuccess && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-700 text-xs sm:text-sm font-medium">
                          {editSuccess}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors duration-200 text-sm"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingSale(null);
                    setEditError("");
                    setEditSuccess("");
                  }}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 px-4 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors duration-200 text-sm"
                  onClick={handleSaveEdit}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && editingSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Delete Sale?
              </h3>
              <p className="text-sm text-gray-600 text-center mb-4">
                Are you sure you want to delete sale{" "}
                <span className="font-semibold">{editingSale.sale_id}</span>?
                This action cannot be undone.
              </p>

              {editError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-xs sm:text-sm font-medium">
                    {editError}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors duration-200 text-sm"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setEditingSale(null);
                    setEditError("");
                  }}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors duration-200 text-sm"
                  onClick={handleDeleteSale}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Orders Detail Modal */}
      {showOrdersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4 sm:mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 sm:p-3 bg-blue-100 rounded-lg sm:rounded-xl">
                    <OrderIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                      Orders Analytics
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Last {range} days • {totals.orders} total orders
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowOrdersModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-150"
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

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
                  <p className="text-xs text-gray-600 mb-1">Total Orders</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {totals.orders}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 sm:p-4">
                  <p className="text-xs text-gray-600 mb-1">Avg Order Value</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    ₹{Math.round(analytics.averageOrderValue).toLocaleString()}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 sm:p-4">
                  <p className="text-xs text-gray-600 mb-1">Total Items</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {totals.items}
                  </p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 sm:p-4">
                  <p className="text-xs text-gray-600 mb-1">Avg Items/Order</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {(totals.items / totals.orders || 0).toFixed(1)}
                  </p>
                </div>
              </div>

              {/* Orders by Day */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Orders by Day
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {analytics.ordersByDay.length > 0 ? (
                    analytics.ordersByDay.map((day, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <span className="text-sm font-medium text-gray-700">
                          {day.date}
                        </span>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 bg-blue-500 rounded-full"
                            style={{
                              width: `${
                                (day.count /
                                  Math.max(
                                    ...analytics.ordersByDay.map((d) => d.count)
                                  )) *
                                100
                              }px`,
                              minWidth: "20px",
                            }}
                          ></div>
                          <span className="text-sm font-semibold text-gray-900 w-8 text-right">
                            {day.count}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No data available
                    </p>
                  )}
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Payment Methods
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {analytics.paymentMethods.map((pm, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {pm.method}
                        </span>
                        <span className="text-xs text-gray-600">
                          {pm.count} order{pm.count !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <p className="text-lg font-bold text-gray-900">
                        ₹{pm.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {((pm.count / totals.orders) * 100).toFixed(1)}% of
                        orders
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Items Detail Modal */}
      {showItemsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4 sm:mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 sm:p-3 bg-green-100 rounded-lg sm:rounded-xl">
                    <PackageIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                      Items Analytics
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Last {range} days • {totals.items} items sold
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowItemsModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-150"
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

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
                <div className="bg-green-50 rounded-lg p-3 sm:p-4">
                  <p className="text-xs text-gray-600 mb-1">Total Items</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {totals.items}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
                  <p className="text-xs text-gray-600 mb-1">Unique Products</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {analytics.topProducts.length}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 sm:p-4">
                  <p className="text-xs text-gray-600 mb-1">Avg Items/Day</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {(totals.items / Number(range)).toFixed(1)}
                  </p>
                </div>
              </div>

              {/* Top Selling Products */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Top Selling Products
                </h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {analytics.topProducts.length > 0 ? (
                    analytics.topProducts.map((product, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-white rounded-lg border border-green-100 hover:shadow-md transition-all"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {product.name}
                            </p>
                            <p className="text-xs text-gray-600">
                              Revenue: ₹{product.revenue.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div
                            className="h-2 bg-green-500 rounded-full"
                            style={{
                              width: `${
                                (product.qty / analytics.topProducts[0].qty) *
                                80
                              }px`,
                              minWidth: "20px",
                            }}
                          ></div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-900">
                              {product.qty}
                            </p>
                            <p className="text-xs text-gray-600">units</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No data available
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Detail Modal */}
      {showRevenueModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4 sm:mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 sm:p-3 bg-purple-100 rounded-lg sm:rounded-xl">
                    <CurrencyIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                      Revenue Analytics
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Last {range} days • ₹{totals.revenue.toLocaleString()}{" "}
                      total
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRevenueModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-150"
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

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
                <div className="bg-purple-50 rounded-lg p-3 sm:p-4">
                  <p className="text-xs text-gray-600 mb-1">Total Revenue</p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900">
                    ₹{totals.revenue.toLocaleString()}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
                  <p className="text-xs text-gray-600 mb-1">Avg/Day</p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900">
                    ₹
                    {Math.round(
                      totals.revenue / Number(range)
                    ).toLocaleString()}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 sm:p-4">
                  <p className="text-xs text-gray-600 mb-1">Avg/Order</p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900">
                    ₹{Math.round(analytics.averageOrderValue).toLocaleString()}
                  </p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 sm:p-4">
                  <p className="text-xs text-gray-600 mb-1">Customer Savings</p>
                  <p className="text-lg sm:text-xl font-bold text-green-600">
                    ₹{Math.round(analytics.totalSavings).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Revenue by Day */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Revenue by Day
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {analytics.revenueByDay.length > 0 ? (
                    analytics.revenueByDay.map((day, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <span className="text-sm font-medium text-gray-700">
                          {day.date}
                        </span>
                        <div className="flex items-center gap-3">
                          <div
                            className="h-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full"
                            style={{
                              width: `${
                                (day.amount /
                                  Math.max(
                                    ...analytics.revenueByDay.map(
                                      (d) => d.amount
                                    )
                                  )) *
                                120
                              }px`,
                              minWidth: "30px",
                            }}
                          ></div>
                          <span className="text-sm font-semibold text-gray-900 w-20 text-right">
                            ₹{Math.round(day.amount).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No data available
                    </p>
                  )}
                </div>
              </div>

              {/* Top Revenue Products */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Top Revenue Products
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {analytics.topProducts
                    .sort((a, b) => b.revenue - a.revenue)
                    .slice(0, 6)
                    .map((product, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-gradient-to-br from-purple-50 to-white rounded-lg border border-purple-100 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-sm font-semibold text-gray-900 flex-1 pr-2">
                            {product.name}
                          </p>
                          <span className="flex-shrink-0 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                            #{idx + 1}
                          </span>
                        </div>
                        <p className="text-lg font-bold text-purple-600 mb-1">
                          ₹{product.revenue.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-600">
                          {product.qty} units sold •{" "}
                          {((product.revenue / totals.revenue) * 100).toFixed(
                            1
                          )}
                          % of total
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Report;
