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
  FiEdit2,
  FiCheck,
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
const EditIcon = ({ className = "w-4 h-4" }) => (
  <FiEdit2 className={className} aria-hidden="true" />
);
const CheckIcon = ({ className = "w-4 h-4" }) => (
  <FiCheck className={className} aria-hidden="true" />
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
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceContent, setInvoiceContent] = useState("");
  const [invoicePhone, setInvoicePhone] = useState("");
  const [invoiceError, setInvoiceError] = useState("");
  const [invoiceSuccess, setInvoiceSuccess] = useState("");
  const [editingItemId, setEditingItemId] = useState(null);
  const [expandedProducts, setExpandedProducts] = useState(new Set());

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

  const toggleProductExpansion = (productId) => {
    setExpandedProducts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const addToCartWithSize = (product, sizeKey, qty = 1) => {
    const variants = product.variants || {};
    const variant = variants[sizeKey];

    if (!variant) return;

    const cartItem = {
      id: `${product.id}_${sizeKey}`,
      productId: product.id,
      name: product.name,
      barcode: product.barcode,
      category: product.category,
      gender: product.gender,
      size: sizeKey,
      price: variant.price,
      stock: variant.stock,
    };

    addToCart(cartItem, qty);
  };

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
      const originalPrice = Number(p.price || 0);
      return [
        ...prev,
        {
          id: p.id,
          productId: p.productId || p.id, // Keep productId for variants
          name: p.name,
          barcode: p.barcode,
          mrp: originalPrice, // Maximum Retail Price (can be edited)
          price: originalPrice, // Selling Price (can be edited)
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

  const updateItemPrice = (id, newPrice) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.id === id) {
          const price = Number(newPrice) || 0;
          return { ...i, price };
        }
        return i;
      })
    );
  };

  const updateItemMrp = (id, newMrp) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.id === id) {
          const mrp = Number(newMrp) || 0;
          return { ...i, mrp };
        }
        return i;
      })
    );
  };

  const removeFromCart = (id) =>
    setCart((prev) => prev.filter((i) => i.id !== id));

  const mrpTotal = useMemo(
    () => cart.reduce((s, i) => s + i.mrp * i.qty, 0),
    [cart]
  );

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
        // ===== PHASE 1: ALL READS FIRST =====

        // Group cart items by productId to handle variants
        const productUpdates = new Map();
        cart.forEach((line) => {
          const productId = line.productId || line.id;
          if (!productUpdates.has(productId)) {
            productUpdates.set(productId, []);
          }
          productUpdates.get(productId).push(line);
        });

        // Get all unique product refs
        const productRefs = Array.from(productUpdates.keys()).map((id) =>
          doc(db, "ProductsRegistered", id)
        );

        // Read all products
        const productSnaps = await Promise.all(
          productRefs.map((r) => tx.get(r))
        );

        // Read all SoldProducts
        const soldRefs = cart.map((line) =>
          doc(db, "SoldProducts", `${line.productId || line.id}_${line.size}`)
        );
        const soldSnaps = await Promise.all(soldRefs.map((r) => tx.get(r)));

        // ===== PHASE 2: VALIDATE AND PREPARE UPDATES =====

        const productUpdatesToWrite = [];

        // Validate and prepare stock updates
        for (let i = 0; i < productSnaps.length; i++) {
          const pSnap = productSnaps[i];
          const productId = productRefs[i].id;
          const items = productUpdates.get(productId);

          if (!pSnap.exists()) {
            throw new Error(`Product missing: ${items[0].name}`);
          }

          const productData = pSnap.data();
          const variants = productData.variants || {};
          let hasVariants = Object.keys(variants).length > 0;

          // Check and update each variant
          items.forEach((line) => {
            if (hasVariants && variants[line.size]) {
              const currentStock = Number(variants[line.size].stock || 0);
              if (currentStock < line.qty) {
                throw new Error(
                  `Insufficient stock for ${line.name} (Size: ${line.size})`
                );
              }
              variants[line.size].stock = currentStock - line.qty;
            } else if (!hasVariants) {
              // Legacy product without variants
              const currentStock = Number(productData.stock || 0);
              if (currentStock < line.qty) {
                throw new Error(`Insufficient stock for ${line.name}`);
              }
              productUpdatesToWrite.push({
                ref: productRefs[i],
                data: { stock: currentStock - line.qty },
                isLegacy: true,
              });
            }
          });

          // Prepare variant update if product has them
          if (hasVariants) {
            productUpdatesToWrite.push({
              ref: productRefs[i],
              data: { variants },
              isLegacy: false,
            });
          }
        }

        // ===== PHASE 3: ALL WRITES =====

        // Write product stock updates
        productUpdatesToWrite.forEach(({ ref, data }) => {
          tx.update(ref, data);
        });

        // Write SoldProducts updates
        cart.forEach((line, idx) => {
          const sSnap = soldSnaps[idx];
          const prevUnits = sSnap.exists()
            ? Number(sSnap.data().units_sold || 0)
            : 0;
          const newUnits = prevUnits + line.qty;
          const totalRevenue = newUnits * Number(line.price || 0);

          tx.set(soldRefs[idx], {
            barcode: line.barcode,
            name: line.name,
            category: line.category,
            size: line.size,
            gender: line.gender,
            price: line.price,
            units_sold: newUnits,
            total_revenue: totalRevenue,
            last_sold_at: serverTimestamp(),
          });
        });

        // Write Sales record
        const saleRef = doc(db, "Sales", saleId);
        const paidAmount =
          paymentMethod === "Cash" ? Number(cashReceived) : Number(total);
        const change =
          paymentMethod === "Cash"
            ? Math.max(0, paidAmount - Number(total))
            : 0;

        // Calculate discounts
        const itemDiscountTotal = cart.reduce((sum, i) => {
          const itemDiscount =
            (Number(i.mrp || 0) - Number(i.price || 0)) * i.qty;
          return sum + itemDiscount;
        }, 0);

        tx.set(saleRef, {
          sale_id: saleId,
          created_at: serverTimestamp(),
          customer,
          note,
          items: cart.map((i) => ({
            id: i.id,
            name: i.name,
            barcode: i.barcode,
            mrp: i.mrp,
            price: i.price,
            qty: i.qty,
            size: i.size,
          })),
          mrpTotal: mrpTotal,
          itemDiscountTotal: itemDiscountTotal,
          discountPercent: 0,
          totalDiscount: itemDiscountTotal,
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
      setEditingItemId(null);
      setMsg({ type: "success", text: "Sale completed successfully." });
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Checkout failed" });
    }
    setBusy(false);
  };

  // Build WhatsApp invoice message
  const buildWhatsAppMessage = () => {
    const lines = [
      `🧾 *Invoice Summary*`,
      `━━━━━━━━━━━━━━━━━━`,
      `*Store:* Shree Noble Footwear`,
      `*Date:* ${new Date().toLocaleString()}`,
      ``,
      `*Customer:* ${customer.name || "Walk-in Customer"}`,
      customer.phone ? `*Phone:* ${customer.phone}` : "",
      ``,
      `*Items:*`,
    ];
    cart.forEach((item, idx) => {
      const itemTotal = Number(item.price || 0) * Number(item.qty || 0);
      const itemName = item.size
        ? `${item.name} (Size: ${item.size})`
        : item.name;
      let itemLine = `${idx + 1}. ${itemName} × ${item.qty}`;
      if (item.itemDiscount > 0) {
        itemLine += ` (₹${item.mrp} - ₹${item.itemDiscount})`;
      }
      itemLine += ` = ₹${itemTotal.toLocaleString("en-IN")}`;
      lines.push(itemLine);
    });
    lines.push(``, `━━━━━━━━━━━━━━━━━━`);

    // Calculate savings
    const cartMrpTotal = cart.reduce((s, i) => s + i.mrp * i.qty, 0);
    const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const totalSavings = cartMrpTotal - cartTotal;

    if (totalSavings > 0) {
      lines.push(`🎉 *You Saved: ₹${totalSavings.toLocaleString("en-IN")}*`);
      lines.push(``);
    }

    lines.push(
      `💰 *Total: ₹${total.toLocaleString("en-IN")}*`,
      ``,
      `✅ Thank you for shopping with us!`,
      `Need assistance? Reply here – we're happy to help.`,
      `📍 Visit again: Shree Noble Footwear`
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
  const openInvoiceModal = () => {
    const invoiceText = buildWhatsAppMessage();
    setInvoiceContent(invoiceText);
    setInvoicePhone(customer.phone || "");
    setInvoiceError("");
    setInvoiceSuccess("");
    setShowInvoiceModal(true);
  };

  // Generate PDF from cart
  const generateInvoicePdf = () => {
    const sale = {
      sale_id: `INV-${Date.now()}`,
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

    // Header with branding
    doc.setFillColor(243, 248, 255);
    doc.rect(0, 0, pageWidth, 90, "F");
    doc.setTextColor(17, 24, 39);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("SHREE NOBLE FOOTWEAR", 40, 42);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("contact@noblefootwear.com | +91-XXXXXXXXXX", 40, 60);

    y = 110;
    doc.setFontSize(14);
    doc.text("TAX INVOICE", 40, y);
    doc.setFontSize(11);
    doc.text(`Invoice No: ${sale.sale_id}`, 40, y + 20);
    doc.text(`Date: ${new Date().toLocaleString()}`, 40, y + 36);

    // Customer details
    y += 60;
    doc.setFontSize(12);
    doc.text("Bill To:", 40, y);
    y += 16;
    doc.setFontSize(11);
    doc.text(`${sale.customer?.name || "Walk-in Customer"}`, 40, y);
    y += 14;
    if (sale.customer?.phone) {
      doc.text(`Phone: ${sale.customer.phone}`, 40, y);
      y += 16;
    }

    // Items table
    y += 6;
    const colItemLeft = 50;
    const colQtyRight = pageWidth - 260;
    const colPriceRight = pageWidth - 200;
    const colAmountRight = pageWidth - 40;
    doc.setFillColor(240, 245, 255);
    doc.rect(40, y, pageWidth - 80, 26, "F");
    doc.setFontSize(11);
    doc.text("Item", colItemLeft, y + 17);
    textRight("Qty", colQtyRight, y + 17);
    textRight("Price", colPriceRight, y + 17);
    textRight("Amount", colAmountRight, y + 17);
    y += 34;

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

    // Totals
    y += 8;
    doc.setDrawColor(200);
    doc.line(40, y, pageWidth - 40, y);
    y += 16;
    const totalsRight = colAmountRight;
    const labelRight = totalsRight - 140;
    doc.setFontSize(11);

    // Calculate values
    const cartMrpTotal = cart.reduce((s, i) => s + i.mrp * i.qty, 0);
    const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

    if (cartMrpTotal > cartTotal) {
      textRight("MRP Total", labelRight, y);
      doc.setTextColor(156, 163, 175); // gray
      drawCurrency(fmtINR(cartMrpTotal), totalsRight, y);
      doc.setTextColor(17, 24, 39); // back to gray
      y += 14;
    }

    if (cartMrpTotal > sale.total) {
      y += 4;
      doc.setDrawColor(220);
      doc.line(labelRight - 20, y, pageWidth - 40, y);
      y += 14;
    }

    doc.setFontSize(12);
    textRight("Total", labelRight, y);
    drawCurrency(fmtINR(sale.total), totalsRight, y);
    y += 20;

    // Footer
    y += 8;
    doc.setDrawColor(220);
    doc.line(40, y, pageWidth - 40, y);
    y += 16;
    doc.setFontSize(9);
    doc.text(
      "Thank you for your business! Exchange within 7 days with original bill.",
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
                                Sizes
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Total Stock
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Price Range
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {filtered.map((product) => {
                              const variants = product.variants || {};
                              const variantKeys = Object.keys(variants);
                              const hasVariants = variantKeys.length > 0;
                              const isExpanded = expandedProducts.has(
                                product.id
                              );

                              // Calculate totals
                              const totalStock = hasVariants
                                ? variantKeys.reduce(
                                    (sum, key) =>
                                      sum + Number(variants[key]?.stock || 0),
                                    0
                                  )
                                : Number(product.stock || 0);

                              const prices = hasVariants
                                ? variantKeys.map((key) =>
                                    Number(variants[key]?.price || 0)
                                  )
                                : [Number(product.price || 0)];
                              const minPrice = Math.min(...prices);
                              const maxPrice = Math.max(...prices);
                              const priceDisplay =
                                minPrice === maxPrice
                                  ? `₹${minPrice}`
                                  : `₹${minPrice} - ₹${maxPrice}`;

                              return (
                                <React.Fragment key={product.id}>
                                  {/* Main Product Row */}
                                  <tr className="hover:bg-gray-50 transition-colors duration-150">
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
                                          {product.category} • {product.gender}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                      {hasVariants ? (
                                        <button
                                          onClick={() =>
                                            toggleProductExpansion(product.id)
                                          }
                                          className="flex items-center justify-center gap-1 mx-auto text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                                        >
                                          <span>
                                            {variantKeys.length} size
                                            {variantKeys.length !== 1
                                              ? "s"
                                              : ""}
                                          </span>
                                          <svg
                                            className={`w-4 h-4 transition-transform ${
                                              isExpanded ? "rotate-180" : ""
                                            }`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M19 9l-7 7-7-7"
                                            />
                                          </svg>
                                        </button>
                                      ) : (
                                        <span className="text-sm text-gray-500">
                                          {product.size || "N/A"}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                      <span
                                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                          totalStock <= 0
                                            ? "bg-red-100 text-red-800"
                                            : totalStock <= 10
                                            ? "bg-yellow-100 text-yellow-800"
                                            : "bg-green-100 text-green-800"
                                        }`}
                                      >
                                        {totalStock}
                                      </span>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                      <div className="text-sm font-semibold text-gray-900">
                                        {priceDisplay}
                                      </div>
                                    </td>
                                  </tr>

                                  {/* Expanded Size Variants */}
                                  {isExpanded &&
                                    hasVariants &&
                                    variantKeys.map((sizeKey) => {
                                      const variant = variants[sizeKey];
                                      const stock = Number(variant?.stock || 0);

                                      return (
                                        <tr
                                          key={`${product.id}-${sizeKey}`}
                                          className="bg-green-50"
                                        >
                                          <td className="px-4 py-3 pl-12 text-sm text-gray-500">
                                            —
                                          </td>
                                          <td className="px-4 py-3">
                                            <div className="text-sm font-medium text-gray-700">
                                              Size: {sizeKey}
                                            </div>
                                          </td>
                                          <td className="px-4 py-3 text-center text-sm text-gray-600">
                                            —
                                          </td>
                                          <td className="px-4 py-3 text-center">
                                            <span
                                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                                stock <= 0
                                                  ? "bg-red-100 text-red-800"
                                                  : stock <= 5
                                                  ? "bg-yellow-100 text-yellow-800"
                                                  : "bg-green-100 text-green-800"
                                              }`}
                                            >
                                              {stock}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-3">
                                              <div className="text-sm font-semibold text-gray-900">
                                                ₹{variant?.price}
                                              </div>
                                              <button
                                                className={`p-2 rounded-lg font-medium transition-all duration-150 ${
                                                  stock <= 0
                                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                    : "bg-green-100 text-green-700 hover:bg-green-200 hover:scale-105"
                                                }`}
                                                disabled={stock <= 0}
                                                onClick={() =>
                                                  addToCartWithSize(
                                                    product,
                                                    sizeKey,
                                                    1
                                                  )
                                                }
                                              >
                                                {stock <= 0 ? (
                                                  <span className="text-xs px-2">
                                                    Out
                                                  </span>
                                                ) : (
                                                  <PlusIcon className="w-4 h-4" />
                                                )}
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile & Tablet: card list (visible below lg) */}
                      <div className="lg:hidden space-y-2 p-2 sm:p-3">
                        {filtered.map((product) => {
                          const variants = product.variants || {};
                          const variantKeys = Object.keys(variants);
                          const hasVariants = variantKeys.length > 0;
                          const isExpanded = expandedProducts.has(product.id);

                          const totalStock = hasVariants
                            ? variantKeys.reduce(
                                (sum, key) =>
                                  sum + Number(variants[key]?.stock || 0),
                                0
                              )
                            : Number(product.stock || 0);

                          return (
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
                                      {product.category} • {product.gender}
                                    </div>
                                    <div className="truncate">
                                      Code: {product.barcode}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <span
                                    className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                                      totalStock <= 0
                                        ? "bg-red-100 text-red-800"
                                        : totalStock <= 10
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-green-100 text-green-800"
                                    }`}
                                  >
                                    {totalStock}
                                  </span>
                                </div>
                              </div>

                              {hasVariants && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                  <button
                                    onClick={() =>
                                      toggleProductExpansion(product.id)
                                    }
                                    className="w-full flex items-center justify-between text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                                  >
                                    <span>
                                      {variantKeys.length} size
                                      {variantKeys.length !== 1 ? "s" : ""}{" "}
                                      available
                                    </span>
                                    <svg
                                      className={`w-4 h-4 transition-transform ${
                                        isExpanded ? "rotate-180" : ""
                                      }`}
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 9l-7 7-7-7"
                                      />
                                    </svg>
                                  </button>

                                  {isExpanded && (
                                    <div className="mt-2 space-y-2">
                                      {variantKeys.map((sizeKey) => {
                                        const variant = variants[sizeKey];
                                        const stock = Number(
                                          variant?.stock || 0
                                        );

                                        return (
                                          <div
                                            key={sizeKey}
                                            className="flex items-center justify-between bg-green-50 rounded-lg p-2"
                                          >
                                            <div className="flex items-center gap-3">
                                              <div className="text-sm font-medium text-gray-700">
                                                Size {sizeKey}
                                              </div>
                                              <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                  stock <= 0
                                                    ? "bg-red-100 text-red-800"
                                                    : stock <= 5
                                                    ? "bg-yellow-100 text-yellow-800"
                                                    : "bg-green-100 text-green-800"
                                                }`}
                                              >
                                                {stock}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <div className="text-sm font-semibold text-gray-900">
                                                ₹{variant?.price}
                                              </div>
                                              <button
                                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 ${
                                                  stock <= 0
                                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                    : "bg-green-100 text-green-700 hover:bg-green-200 active:scale-95"
                                                }`}
                                                disabled={stock <= 0}
                                                onClick={() =>
                                                  addToCartWithSize(
                                                    product,
                                                    sizeKey,
                                                    1
                                                  )
                                                }
                                              >
                                                <PlusIcon className="w-4 h-4" />
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
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
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              {item.mrp !== item.price && (
                                <div className="text-xs text-gray-400 line-through">
                                  ₹{(item.mrp * item.qty).toLocaleString()}
                                </div>
                              )}
                              <div className="text-sm sm:text-base font-semibold text-gray-900 whitespace-nowrap">
                                ₹{(item.price * item.qty).toLocaleString()}
                              </div>
                            </div>
                            <button
                              className="w-7 h-7 text-blue-600 hover:bg-blue-50 active:scale-95 rounded-lg transition-all duration-150 flex items-center justify-center flex-shrink-0"
                              onClick={() =>
                                setEditingItemId(
                                  editingItemId === item.id ? null : item.id
                                )
                              }
                              title="Edit Price"
                            >
                              {editingItemId === item.id ? (
                                <CheckIcon className="w-3.5 h-3.5" />
                              ) : (
                                <EditIcon className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Price editing section */}
                        {editingItemId === item.id && (
                          <div className="mb-2 p-2 bg-blue-50 rounded-lg">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  MRP (₹)
                                </label>
                                <input
                                  type="number"
                                  value={item.mrp}
                                  onChange={(e) =>
                                    updateItemMrp(
                                      item.id,
                                      Number(e.target.value) || 0
                                    )
                                  }
                                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="MRP"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  SRP (₹)
                                </label>
                                <input
                                  type="number"
                                  value={item.price}
                                  onChange={(e) =>
                                    updateItemPrice(
                                      item.id,
                                      Number(e.target.value) || 0
                                    )
                                  }
                                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="Selling Price"
                                />
                              </div>
                            </div>
                          </div>
                        )}

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
                  <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-100 space-y-2">
                    {mrpTotal > total && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">MRP Total</span>
                        <span className="font-medium text-gray-400 line-through">
                          ₹{mrpTotal.toLocaleString()}
                        </span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-gray-100">
                      <div className="flex justify-between items-center">
                        <span className="text-base sm:text-lg font-semibold text-gray-900">
                          Total
                        </span>
                        <span className="text-lg sm:text-xl font-bold text-green-600">
                          ₹{total.toLocaleString()}
                        </span>
                      </div>
                      {mrpTotal > total && (
                        <div className="text-xs text-right text-green-600 mt-1">
                          You saved: ₹{(mrpTotal - total).toLocaleString()}
                        </div>
                      )}
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
                    onClick={openInvoiceModal}
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

        {/* Invoice Modal */}
        {showInvoiceModal && (
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
                        generateInvoicePdf();
                        setInvoiceSuccess(
                          "PDF generated. You can also share it on WhatsApp."
                        );
                      } catch (err) {
                        setInvoiceError("Failed to generate PDF.");
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
                        const msg = invoiceContent || buildWhatsAppMessage();
                        const waUrl = `https://api.whatsapp.com/send?phone=${digits}&text=${encodeWhatsAppMessage(
                          msg
                        )}`;
                        window.open(waUrl, "_blank");
                        setInvoiceSuccess(
                          "WhatsApp opened with invoice. Please complete send in WhatsApp."
                        );
                      } catch (err) {
                        setInvoiceError("Failed to open WhatsApp.");
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
