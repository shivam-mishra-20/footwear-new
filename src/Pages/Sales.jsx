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

// Professional icon wrappers
import {
  FiSearch,
  FiPlus,
  FiMinus,
  FiTrash2,
  FiShoppingCart,
  FiCreditCard,
  FiFileText,
} from "react-icons/fi";
import { TbScan } from "react-icons/tb";
const SearchIcon = ({ className = "w-5 h-5 text-gray-400" }) => (
  <FiSearch className={className} aria-hidden="true" />
);
const ScanIcon = ({ className = "w-5 h-5" }) => (
  <TbScan className={className} aria-hidden="true" />
);
const PlusIcon = ({ className = "w-4 h-4" }) => (
  <FiPlus className={className} aria-hidden="true" />
);
const MinusIcon = ({ className = "w-4 h-4" }) => (
  <FiMinus className={className} aria-hidden="true" />
);
const TrashIcon = ({ className = "w-4 h-4" }) => (
  <FiTrash2 className={className} aria-hidden="true" />
);
const ShoppingCartIcon = ({ className = "w-5 h-5" }) => (
  <FiShoppingCart className={className} aria-hidden="true" />
);
const CreditCardIcon = ({ className = "w-5 h-5" }) => (
  <FiCreditCard className={className} aria-hidden="true" />
);
const DocumentIcon = ({ className = "w-5 h-5" }) => (
  <FiFileText className={className} aria-hidden="true" />
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
    // UPI and Card validations intentionally removed — paymentRef is optional
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
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 lg:p-6">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg sm:rounded-xl">
              <ShoppingCartIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="truncate">Point of Sale</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Process sales, manage cart, and complete transactions
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Product Selection Panel */}
          <div className="lg:col-span-8 order-2 lg:order-1">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100">
              {/* Search Header */}
              <div className="p-3 sm:p-4 lg:p-6 border-b border-gray-100">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <SearchIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                    </div>
                    <input
                      className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                      placeholder="Search products..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <button
                    className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg sm:rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base"
                    onClick={() => setShowScanner(true)}
                  >
                    <ScanIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    <span className="font-medium">Scan</span>
                  </button>
                </div>
              </div>

              {/* Products Table/List */}
              <div className="overflow-hidden">
                <div className="max-h-[50vh] sm:max-h-96 overflow-y-auto">
                  {filtered.length > 0 ? (
                    <>
                      {/* Desktop / Tablet: table (visible lg and up) */}
                      <div className="hidden lg:block">
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

                      {/* Mobile & Tablet: card list (visible below lg) */}
                      <div className="lg:hidden space-y-2 p-2 sm:p-3">
                        {filtered.map((product) => (
                          <div
                            key={product.id}
                            className="bg-white border border-gray-100 rounded-lg sm:rounded-xl p-3 sm:p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm sm:text-base font-medium text-gray-900 truncate">
                                  {product.name}
                                </div>
                                <div className="text-xs sm:text-sm text-gray-500 mt-1 space-y-0.5">
                                  <div className="truncate">
                                    {product.category} • Size: {product.size}
                                  </div>
                                  <div className="truncate">
                                    Code: {product.barcode}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <span
                                  className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                                    Number(product.stock) <= 0
                                      ? "bg-red-100 text-red-800"
                                      : Number(product.stock) <= 5
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-green-100 text-green-800"
                                  }`}
                                >
                                  {product.stock}
                                </span>
                                <div className="text-sm sm:text-base font-semibold text-gray-900">
                                  ₹{product.price}
                                </div>
                                <button
                                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition-all duration-150 ${
                                    Number(product.stock) <= 0
                                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                      : "bg-green-100 text-green-700 hover:bg-green-200 active:scale-95"
                                  }`}
                                  disabled={Number(product.stock) <= 0}
                                  onClick={() => addToCart(product, 1)}
                                >
                                  <PlusIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 sm:py-12 px-4">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                        <SearchIcon className="w-6 h-6 sm:w-8 sm:h-8" />
                      </div>
                      <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                        No products found
                      </h3>
                      <p className="text-sm sm:text-base text-gray-500 text-center">
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
          <div className="lg:col-span-4 order-1 lg:order-2">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 lg:sticky lg:top-4">
              {/* Cart Header */}
              <div className="p-3 sm:p-4 lg:p-6 border-b border-gray-100">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <div className="p-1 sm:p-1.5 bg-green-100 rounded-lg">
                    <ShoppingCartIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <span className="truncate">Shopping Cart</span>
                  {cart.length > 0 && (
                    <span className="ml-auto px-2 py-0.5 sm:py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full whitespace-nowrap">
                      {cart.length}
                    </span>
                  )}
                </h3>
              </div>

              {/* Cart Items */}
              <div className="p-3 sm:p-4 lg:p-6">
                <div className="space-y-2 sm:space-y-3 max-h-[40vh] sm:max-h-64 lg:max-h-72 overflow-y-auto">
                  {cart.length === 0 ? (
                    <div className="text-center py-6 sm:py-8">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                        <ShoppingCartIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <p className="text-gray-500 text-xs sm:text-sm">
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
                        className="p-2.5 sm:p-3 border border-gray-100 rounded-lg sm:rounded-xl hover:border-gray-200 transition-colors duration-150"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm sm:text-base font-medium text-gray-900 truncate">
                              {item.name}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate">
                              Code: {item.barcode}
                            </div>
                          </div>
                          <div className="text-sm sm:text-base font-semibold text-gray-900 whitespace-nowrap">
                            ₹{item.price * item.qty}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <button
                              className="w-8 h-8 sm:w-9 sm:h-9 bg-gray-100 hover:bg-gray-200 active:scale-95 rounded-lg transition-all duration-150 flex items-center justify-center"
                              onClick={() => updateQty(item.id, item.qty - 1)}
                              aria-label="Decrease quantity"
                            >
                              <MinusIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                            <input
                              className="w-12 sm:w-14 text-center text-sm border border-gray-200 rounded-lg py-1.5 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              value={item.qty}
                              onChange={(e) =>
                                updateQty(item.id, Number(e.target.value) || 0)
                              }
                              inputMode="numeric"
                            />
                            <button
                              className="w-8 h-8 sm:w-9 sm:h-9 bg-gray-100 hover:bg-gray-200 active:scale-95 rounded-lg transition-all duration-150 flex items-center justify-center"
                              onClick={() => updateQty(item.id, item.qty + 1)}
                              aria-label="Increase quantity"
                            >
                              <PlusIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                          <button
                            className="w-8 h-8 sm:w-9 sm:h-9 text-red-500 hover:bg-red-50 active:scale-95 rounded-lg transition-all duration-150 flex items-center justify-center"
                            onClick={() => removeFromCart(item.id)}
                            aria-label="Remove item"
                          >
                            <TrashIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Total */}
                {cart.length > 0 && (
                  <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-100">
                    <div className="flex justify-between items-center mb-3 sm:mb-4">
                      <span className="text-base sm:text-lg font-semibold text-gray-900">
                        Total
                      </span>
                      <span className="text-lg sm:text-xl font-bold text-green-600">
                        ₹{total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Customer Information */}
                <div className="space-y-3 sm:space-y-4 mt-4 sm:mt-6">
                  <h4 className="text-sm sm:text-base font-medium text-gray-900">
                    Customer Information
                  </h4>
                  <div className="space-y-2 sm:space-y-3">
                    <input
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                      placeholder="Customer name (optional)"
                      value={customer.name}
                      onChange={(e) =>
                        setCustomer({ ...customer, name: e.target.value })
                      }
                    />
                    <input
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                      placeholder="Phone number (optional)"
                      value={customer.phone}
                      onChange={(e) =>
                        setCustomer({ ...customer, phone: e.target.value })
                      }
                      inputMode="tel"
                    />
                    <textarea
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white resize-none"
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
                    className={`mt-3 sm:mt-4 p-3 sm:p-4 rounded-lg sm:rounded-xl ${
                      msg.type === "error"
                        ? "bg-red-50 border border-red-200 text-red-700"
                        : "bg-green-50 border border-green-200 text-green-700"
                    }`}
                  >
                    <p className="text-xs sm:text-sm font-medium">{msg.text}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
                  <button
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold py-2.5 sm:py-3 rounded-lg sm:rounded-xl hover:from-green-600 hover:to-green-700 focus:ring-4 focus:ring-green-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl active:scale-95 flex items-center justify-center gap-2 text-sm sm:text-base"
                    disabled={busy || cart.length === 0}
                    onClick={checkout}
                  >
                    <CreditCardIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    {busy ? "Processing..." : "Checkout"}
                  </button>
                  <button
                    className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 text-white font-medium rounded-lg sm:rounded-xl hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center flex-shrink-0"
                    disabled={cart.length === 0}
                    onClick={generateInvoicePdf}
                    title="Generate Invoice"
                  >
                    <DocumentIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Barcode Scanner Modal */}
        {showScanner && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-lg">
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                    Scan Barcode
                  </h3>
                  <button
                    onClick={() => setShowScanner(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-150 active:scale-95"
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
                <div className="rounded-lg sm:rounded-xl overflow-hidden bg-black h-64 sm:h-80">
                  <ZXingBarcodeScanner
                    onResult={handleScan}
                    onClose={() => setShowScanner(false)}
                    height={320}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Method Modal */}
        {showPayment && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                    Payment Method
                  </h3>
                  <div className="text-xs sm:text-sm text-gray-500 font-medium">
                    Total: ₹{total.toLocaleString()}
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6">
                  {["Cash", "UPI", "Card", "Other"].map((method) => (
                    <button
                      key={method}
                      className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 font-medium transition-all duration-150 text-sm sm:text-base active:scale-95 ${
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
                  <div className="mb-4 sm:mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cash Received
                    </label>
                    <input
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter amount received"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      inputMode="decimal"
                    />
                    {Number(cashReceived) >= total && (
                      <div className="mt-2 p-2.5 sm:p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-xs sm:text-sm text-green-700 font-medium">
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
                  <div className="mb-4 sm:mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Reference
                    </label>
                    <input
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                      placeholder={
                        paymentMethod === "UPI"
                          ? "Enter UPI transaction ID"
                          : paymentMethod === "Card"
                          ? "Enter last 4 digits"
                          : "Payment reference"
                      }
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                    />
                  </div>
                )}

                {/* Payment Error */}
                {paymentError && (
                  <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg sm:rounded-xl">
                    <p className="text-red-700 text-xs sm:text-sm font-medium">
                      {paymentError}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
                  <button
                    className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-100 text-gray-700 font-medium rounded-lg sm:rounded-xl hover:bg-gray-200 transition-colors duration-200 text-sm sm:text-base active:scale-95"
                    onClick={() => {
                      if (!busy) setShowPayment(false);
                    }}
                    disabled={busy}
                  >
                    Cancel
                  </button>
                  <button
                    className="w-full sm:flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg sm:rounded-xl hover:from-green-600 hover:to-green-700 focus:ring-4 focus:ring-green-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl active:scale-95 flex items-center justify-center gap-2 text-sm sm:text-base"
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
                        <CreditCardIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="truncate">
                          Confirm ₹{total.toLocaleString()}
                        </span>
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
