/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useState } from "react";
import { db } from "../../firebaseConfig";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import ZXingBarcodeScanner from "./ZXingBarcodeScanner";
import { jsPDF } from "jspdf";

// Icon Components (updated to accept className and use consistent defaults)
const SearchIcon = ({ className = "w-5 h-5 text-gray-400" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

const ScanIcon = ({ className = "w-5 h-5" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12h4.01M12 12v4.01"
    />
  </svg>
);

const PlusIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4v16m8-8H4"
    />
  </svg>
);

const MinusIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M20 12H4"
    />
  </svg>
);

const TrashIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

const ShoppingCartIcon = ({ className = "w-5 h-5" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6.5-5v6a1 1 0 01-1 1H9a1 1 0 01-1-1v-6m8 0V9a1 1 0 00-1-1H9a1 1 0 00-1 1v4.01"
    />
  </svg>
);

const CreditCardIcon = ({ className = "w-5 h-5" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
    />
  </svg>
);

const DocumentIcon = ({ className = "w-5 h-5" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5l-8-8-8 8V7a2 2 0 012-2h12a2 2 0 012 2v11z"
    />
  </svg>
);

function Sales() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ name: "", phone: "" });
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentRef, setPaymentRef] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [paymentError, setPaymentError] = useState("");

  useEffect(() => {
    const q = query(
      collection(db, "ProductsRegistered"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [p.name, p.barcode, p.category, p.gender]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [products, search]);

  const addToCart = (p, qty = 1) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.id === p.id);
      const qDesired = Math.min(
        Number(p.stock || 0),
        (idx >= 0 ? prev[idx].qty : 0) + qty
      );
      if (qDesired <= 0) return prev;
      if (idx >= 0) {
        const clone = [...prev];
        clone[idx] = { ...clone[idx], qty: qDesired };
        return clone;
      }
      return [
        ...prev,
        {
          id: p.id,
          name: p.name,
          barcode: p.barcode,
          price: Number(p.price || 0),
          qty: qDesired,
          stock: Number(p.stock || 0),
          category: p.category,
          size: p.size,
          gender: p.gender,
        },
      ];
    });
  };

  const updateQty = (id, qty) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.id === id ? { ...i, qty: Math.max(0, Math.min(i.stock, qty)) } : i
        )
        .filter((i) => i.qty > 0)
    );
  };

  const removeFromCart = (id) =>
    setCart((prev) => prev.filter((i) => i.id !== id));

  const total = useMemo(
    () => cart.reduce((s, i) => s + i.price * i.qty, 0),
    [cart]
  );

  const handleScan = (code) => {
    const item = products.find((p) => p.barcode === code);
    if (item) addToCart(item, 1);
    setShowScanner(false);
  };

  const checkout = async () => {
    if (cart.length === 0) return;
    setShowPayment(true);
  };

  const confirmPaymentAndCheckout = async () => {
    if (cart.length === 0) return;
    setPaymentError("");
    if (paymentMethod === "UPI") {
      const upiIdRegex = /^[a-zA-Z0-9._-]{3,}@[a-zA-Z]{2,}$/;
      const genericRef = /^[a-zA-Z0-9_-]{6,}$/;
      if (
        !paymentRef ||
        !(upiIdRegex.test(paymentRef) || genericRef.test(paymentRef))
      ) {
        setPaymentError(
          "Enter a valid UPI ID (e.g., name@bank) or transaction reference."
        );
        return;
      }
    }
    if (paymentMethod === "Card") {
      const last4 = /^\d{4}$/;
      const approval = /^[a-zA-Z0-9]{6,}$/;
      if (
        !paymentRef ||
        !(last4.test(paymentRef) || approval.test(paymentRef))
      ) {
        setPaymentError(
          "Enter card last 4 digits or approval code (min 6 chars)."
        );
        return;
      }
    }
    if (paymentMethod === "Cash") {
      const received = Number(cashReceived);
      if (!Number.isFinite(received) || received < total) {
        setPaymentError(
          "Cash received must be a number and at least equal to total."
        );
        return;
      }
    }
    setBusy(true);
    setMsg({ type: "", text: "" });
    try {
      const saleId = `SALE-${Date.now()}`;
      await runTransaction(db, async (tx) => {
        const productRefs = cart.map((line) =>
          doc(db, "ProductsRegistered", line.id)
        );
        const soldRefs = cart.map((line) => doc(db, "SoldProducts", line.id));

        const productSnaps = await Promise.all(
          productRefs.map((r) => tx.get(r))
        );
        const soldSnaps = await Promise.all(soldRefs.map((r) => tx.get(r)));

        const newStocks = [];
        const newSold = [];
        for (let idx = 0; idx < cart.length; idx++) {
          const line = cart[idx];
          const pSnap = productSnaps[idx];
          if (!pSnap.exists()) throw new Error(`Item missing: ${line.name}`);
          const current = Number(pSnap.data().stock || 0);
          if (current < line.qty)
            throw new Error(`Insufficient stock for ${line.name}`);
          newStocks[idx] = current - line.qty;

          const sSnap = soldSnaps[idx];
          const prevUnits = sSnap.exists()
            ? Number(sSnap.data().units_sold || 0)
            : 0;
          const newUnits = prevUnits + line.qty;
          const totalRevenue = newUnits * Number(line.price || 0);
          newSold[idx] = {
            barcode: line.barcode,
            name: line.name,
            category: line.category,
            size: line.size,
            gender: line.gender,
            price: line.price,
            units_sold: newUnits,
            total_revenue: totalRevenue,
            last_sold_at: serverTimestamp(),
          };
        }

        for (let idx = 0; idx < cart.length; idx++) {
          tx.update(productRefs[idx], { stock: newStocks[idx] });
          tx.set(soldRefs[idx], newSold[idx]);
        }

        const saleRef = doc(db, "Sales", saleId);
        const paidAmount =
          paymentMethod === "Cash" ? Number(cashReceived) : Number(total);
        const change =
          paymentMethod === "Cash"
            ? Math.max(0, paidAmount - Number(total))
            : 0;
        tx.set(saleRef, {
          sale_id: saleId,
          created_at: serverTimestamp(),
          customer,
          note,
          items: cart.map((i) => ({
            id: i.id,
            name: i.name,
            barcode: i.barcode,
            price: i.price,
            qty: i.qty,
          })),
          subtotal: total,
          discount: 0,
          total,
          payment: {
            method: paymentMethod,
            reference: paymentRef || null,
            status: "paid",
            paid_at: serverTimestamp(),
            amount_received: paidAmount,
            change,
          },
        });
      });

      setCart([]);
      setCustomer({ name: "", phone: "" });
      setNote("");
      setPaymentMethod("Cash");
      setPaymentRef("");
      setCashReceived("");
      setShowPayment(false);
      setMsg({ type: "success", text: "Sale completed successfully." });
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Checkout failed" });
    }
    setBusy(false);
  };

  const generateInvoicePdf = () => {
    const sale = {
      sale_id: `TEMP-${Date.now()}`,
      created_at: { toDate: () => new Date() },
      customer,
      items: cart,
      subtotal: total,
      discount: 0,
      total,
      payment: {},
    };
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

    doc.setFontSize(10);
    sale.items.forEach((it) => {
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
    doc.setFontSize(12);
    textRight("Total", labelRight, y);
    drawCurrency(fmtINR(sale.total), totalsRight, y);
    y += 20;

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

    doc.save(`invoice_${Date.now()}.pdf`);
  };

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6 lg:p-2">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-xl">
              <ShoppingCartIcon />
            </div>
            Point of Sale
          </h1>
          <p className="text-gray-600">
            Process sales, manage cart, and complete transactions
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Product Selection Panel */}
          <div className="xl:col-span-8">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
              {/* Search Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <SearchIcon />
                    </div>
                    <input
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                      placeholder="Search products by name, code, or category"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <button
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 flex items-center gap-2"
                    onClick={() => setShowScanner(true)}
                  >
                    <ScanIcon className="w-5 h-5 text-white" />
                    <span className="ml-2 text-sm sm:text-base font-medium">
                      Scan Barcode
                    </span>
                  </button>
                </div>
              </div>

              {/* Products Table */}
              <div className="overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  {filtered.length > 0 ? (
                    <>
                      {/* Desktop / Tablet: table (visible md and up) */}
                      <div className="hidden md:block">
                        <table className="w-full">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Code
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Product
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Stock
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Price
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {filtered.map((product) => (
                              <tr
                                key={product.id}
                                className="hover:bg-gray-50 transition-colors duration-150"
                              >
                                <td className="px-4 py-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {product.barcode}
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="flex flex-col">
                                    <div className="text-sm font-medium text-gray-900">
                                      {product.name}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {product.category} • Size: {product.size}{" "}
                                      • {product.gender}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-center">
                                  <span
                                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                      Number(product.stock) <= 0
                                        ? "bg-red-100 text-red-800"
                                        : Number(product.stock) <= 5
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-green-100 text-green-800"
                                    }`}
                                  >
                                    {product.stock}
                                  </span>
                                </td>
                                <td className="px-4 py-4 text-center">
                                  <div className="text-sm font-semibold text-gray-900">
                                    ₹{product.price}
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-center">
                                  <button
                                    className={`p-2 rounded-lg font-medium transition-all duration-150 ${
                                      Number(product.stock) <= 0
                                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                        : "bg-green-100 text-green-700 hover:bg-green-200 hover:scale-105"
                                    }`}
                                    disabled={Number(product.stock) <= 0}
                                    onClick={() => addToCart(product, 1)}
                                  >
                                    {Number(product.stock) <= 0 ? (
                                      <span className="text-xs px-2">Out</span>
                                    ) : (
                                      <PlusIcon className="w-4 h-4" />
                                    )}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile: card list (visible below md) */}
                      <div className="md:hidden space-y-3 p-3">
                        {filtered.map((product) => (
                          <div
                            key={product.id}
                            className="bg-white border border-gray-100 rounded-xl p-3 flex items-center justify-between"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {product.name}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {product.category} • Size: {product.size}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Code: {product.barcode}
                              </div>
                            </div>
                            <div className="flex flex-col items-end ml-3">
                              <div
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                  Number(product.stock) <= 0
                                    ? "bg-red-100 text-red-800"
                                    : Number(product.stock) <= 5
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-green-100 text-green-800"
                                }`}
                              >
                                {product.stock}
                              </div>
                              <div className="text-sm font-semibold text-gray-900 mt-2">
                                ₹{product.price}
                              </div>
                              <button
                                className={`mt-2 w-10 h-10 rounded-lg flex items-center justify-center ${
                                  Number(product.stock) <= 0
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    : "bg-green-100 text-green-700 hover:bg-green-200"
                                }`}
                                disabled={Number(product.stock) <= 0}
                                onClick={() => addToCart(product, 1)}
                              >
                                <PlusIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <SearchIcon />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No products found
                      </h3>
                      <p className="text-gray-500 text-center">
                        {search
                          ? "Try adjusting your search terms"
                          : "No products available"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Cart Panel */}
          <div className="xl:col-span-4">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 h-fit">
              {/* Cart Header */}
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <div className="p-1.5 bg-green-100 rounded-lg">
                    <ShoppingCartIcon />
                  </div>
                  Shopping Cart
                  {cart.length > 0 && (
                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      {cart.length} item{cart.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </h3>
              </div>

              {/* Cart Items */}
              <div className="p-6">
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {cart.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <ShoppingCartIcon />
                      </div>
                      <p className="text-gray-500 text-sm">
                        Your cart is empty
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        Add products to get started
                      </p>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-0 md:p-2 p-3 border border-gray-100 rounded-xl hover:border-gray-200 transition-colors duration-150"
                      >
                        <div className="flex-1 min-w-10">
                          <div className="font-medium text-gray-900 truncate">
                            {item.name}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            <span className="truncate block">
                              Code: {item.barcode}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-start justify-start gap-1 mt-2 md:mt-0">
                          <button
                            className="p-2 sm:p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-150 flex items-center justify-center"
                            onClick={() => updateQty(item.id, item.qty - 1)}
                            aria-label="Decrease quantity"
                          >
                            <MinusIcon className="w-4 h-4" />
                          </button>
                          <input
                            className="w-14 sm:w-12 text-center text-sm border border-gray-200 rounded-lg py-1 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            value={item.qty}
                            onChange={(e) =>
                              updateQty(item.id, Number(e.target.value) || 0)
                            }
                          />
                          <button
                            className="p-1.5 sm:p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-150 flex items-center justify-center"
                            onClick={() => updateQty(item.id, item.qty + 1)}
                            aria-label="Increase quantity"
                          >
                            <PlusIcon className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="mt-3 sm:mt-0 flex items-center gap-3 ml-auto">
                          <div className="text-sm font-semibold text-gray-900 w-20 text-right">
                            ₹{item.price * item.qty}
                          </div>
                          <button
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors duration-150"
                            onClick={() => removeFromCart(item.id)}
                            aria-label="Remove item"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Total */}
                {cart.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-semibold text-gray-900">
                        Total
                      </span>
                      <span className="text-xl font-bold text-green-600">
                        ₹{total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Customer Information */}
                <div className="space-y-4 mt-6">
                  <h4 className="font-medium text-gray-900">
                    Customer Information
                  </h4>
                  <div className="space-y-3">
                    <input
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                      placeholder="Customer name (optional)"
                      value={customer.name}
                      onChange={(e) =>
                        setCustomer({ ...customer, name: e.target.value })
                      }
                    />
                    <input
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                      placeholder="Phone number (optional)"
                      value={customer.phone}
                      onChange={(e) =>
                        setCustomer({ ...customer, phone: e.target.value })
                      }
                    />
                    <textarea
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white resize-none"
                      placeholder="Additional notes (optional)"
                      rows={2}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </div>
                </div>

                {/* Messages */}
                {msg.text && (
                  <div
                    className={`mt-4 p-4 rounded-xl ${
                      msg.type === "error"
                        ? "bg-red-50 border border-red-200 text-red-700"
                        : "bg-green-50 border border-green-200 text-green-700"
                    }`}
                  >
                    <p className="text-sm font-medium">{msg.text}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 mt-6">
                  <button
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold py-3 rounded-xl hover:from-green-600 hover:to-green-700 focus:ring-4 focus:ring-green-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                    disabled={busy || cart.length === 0}
                    onClick={checkout}
                  >
                    <CreditCardIcon />
                    {busy ? "Processing..." : "Checkout"}
                  </button>
                  <button
                    className="px-4 py-3 bg-blue-100 text-white font-medium rounded-xl hover:bg-blue-200 focus:ring-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={cart.length === 0}
                    onClick={generateInvoicePdf}
                  >
                    <DocumentIcon />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Barcode Scanner Modal */}
        {showScanner && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg md:max-w-md">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Scan Barcode
                  </h3>
                  <button
                    onClick={() => setShowScanner(false)}
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
                <div className="rounded-xl overflow-hidden bg-black h-56 md:h-96">
                  <ZXingBarcodeScanner
                    onResult={handleScan}
                    onClose={() => setShowScanner(false)}
                    height={360}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Method Modal */}
        {showPayment && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Payment Method
                  </h3>
                  <div className="text-sm text-gray-500">
                    Total: ₹{total.toLocaleString()}
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {["Cash", "UPI", "Card", "Other"].map((method) => (
                    <button
                      key={method}
                      className={`p-4 rounded-xl border-2 font-medium transition-all duration-150 ${
                        paymentMethod === method
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                      onClick={() => setPaymentMethod(method)}
                    >
                      {method}
                    </button>
                  ))}
                </div>

                {/* Payment Details */}
                {paymentMethod === "Cash" && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cash Received
                    </label>
                    <input
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter amount received"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      inputMode="decimal"
                    />
                    {Number(cashReceived) >= total && (
                      <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-700 font-medium">
                          Change: ₹
                          {Math.max(
                            0,
                            Number(cashReceived) - Number(total)
                          ).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {paymentMethod !== "Cash" && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Reference
                    </label>
                    <input
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                      placeholder={
                        paymentMethod === "UPI"
                          ? "Enter UPI transaction ID or UPI ID"
                          : paymentMethod === "Card"
                          ? "Enter last 4 digits or approval code"
                          : "Payment reference number"
                      }
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                    />
                  </div>
                )}

                {/* Payment Error */}
                {paymentError && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-red-700 text-sm font-medium">
                      {paymentError}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end">
                  <button
                    className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors duration-200"
                    onClick={() => {
                      if (!busy) setShowPayment(false);
                    }}
                    disabled={busy}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-green-700 focus:ring-4 focus:ring-green-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center gap-2"
                    disabled={busy}
                    onClick={confirmPaymentAndCheckout}
                  >
                    {busy ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCardIcon />
                        Confirm Payment ₹{total.toLocaleString()}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Sales;
