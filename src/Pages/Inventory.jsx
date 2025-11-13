/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useMemo } from "react";
import { db } from "../../firebaseConfig";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
  updateDoc,
  setDoc,
  getDoc,
  runTransaction,
} from "firebase/firestore";
import ZXingBarcodeScanner from "./ZXingBarcodeScanner";
import { jsPDF } from "jspdf";
import { serverTimestamp } from "firebase/firestore";

// Icon Components (professional set via react-icons)
import {
  FiSearch,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiFileText,
  FiCheck,
} from "react-icons/fi";
import { TbScan } from "react-icons/tb";

const ScanIcon = ({ className = "w-4 h-4" }) => (
  <TbScan className={className} aria-hidden="true" />
);
const SearchIcon = ({ className = "w-5 h-5 text-gray-400" }) => (
  <FiSearch className={className} aria-hidden="true" />
);
const PlusIcon = ({ className = "w-5 h-5" }) => (
  <FiPlus className={className} aria-hidden="true" />
);
const EditIcon = ({ className = "w-4 h-4" }) => (
  <FiEdit2 className={className} aria-hidden="true" />
);
const DeleteIcon = ({ className = "w-4 h-4" }) => (
  <FiTrash2 className={className} aria-hidden="true" />
);
const InvoiceIcon = ({ className = "w-4 h-4" }) => (
  <FiFileText className={className} aria-hidden="true" />
);
const CheckIcon = ({ className = "w-4 h-4" }) => (
  <FiCheck className={className} aria-hidden="true" />
);

function Inventory() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [barcode, setBarcode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [size, setSize] = useState("");
  const [gender, setGender] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editId, setEditId] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceContent, setInvoiceContent] = useState("");
  const [invoicePhone, setInvoicePhone] = useState("");
  const [invoiceError, setInvoiceError] = useState("");
  const [invoiceSuccess, setInvoiceSuccess] = useState("");
  const [invoiceProduct, setInvoiceProduct] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, "ProductsRegistered"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [p.name, p.barcode, p.category, p.gender]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [products, search]);

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const docId = `${barcode}_${name}`;
      const existing = products.find((p) => p.barcode === barcode);
      if (!editId && existing) {
        setError("Product already registered.");
        setLoading(false);
        return;
      }
      const numericPrice = Number(price || 0);
      const numericStock = Number(stock || 0);
      if (Number.isNaN(numericPrice) || Number.isNaN(numericStock)) {
        setError("Price and Stock must be numbers.");
        setLoading(false);
        return;
      }
      if (editId) {
        await updateDoc(doc(db, "ProductsRegistered", editId), {
          barcode,
          name,
          description,
          size,
          gender,
          category,
          price: numericPrice,
          stock: numericStock,
        });
        setSuccess("Product updated successfully!");
      } else {
        await setDoc(doc(db, "ProductsRegistered", docId), {
          barcode,
          name,
          description,
          size,
          gender,
          category,
          price: numericPrice,
          stock: numericStock,
          createdAt: serverTimestamp(),
        });
        setSuccess("Product registered successfully!");
      }
      setBarcode("");
      setName("");
      setDescription("");
      setSize("");
      setGender("");
      setCategory("");
      setPrice("");
      setStock("");
      setEditId(null);
    } catch (err) {
      setError("Failed to register/update product.");
    }
    setLoading(false);
  };

  const handleEdit = (product) => {
    setEditId(product.id);
    setBarcode(product.barcode || "");
    setName(product.name || "");
    setDescription(product.description || "");
    setSize(product.size || "");
    setGender(product.gender || "");
    setCategory(product.category || "");
    setPrice(product.price || "");
    setStock(product.stock || "");
    setSuccess("");
    setError("");
  };

  const handleDelete = async (id) => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await deleteDoc(doc(db, "ProductsRegistered", id));
      await deleteDoc(doc(db, "SoldProducts", id));
      setSuccess("Product deleted successfully!");
      if (editId === id) {
        setEditId(null);
        setBarcode("");
        setName("");
        setDescription("");
        setSize("");
        setGender("");
        setCategory("");
        setPrice("");
        setStock("");
      }
    } catch {
      setError("Failed to delete product.");
    }
    setLoading(false);
  };

  const handleMarkAsSold = async (product) => {
    if (Number(product.stock) <= 0) {
      setError("Product is out of stock.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await runTransaction(db, async (transaction) => {
        const productRef = doc(db, "ProductsRegistered", product.id);
        const soldRef = doc(db, "SoldProducts", product.id);
        const productSnap = await transaction.get(productRef);
        const soldSnap = await transaction.get(soldRef);
        const currentStock = Number(productSnap.data().stock) || 0;
        if (currentStock <= 0) throw new Error("Product is out of stock.");
        const newStock = currentStock - 1;
        transaction.update(productRef, {
          sold: newStock === 0,
          stock: newStock,
        });
        let unitsSold = 1;
        if (soldSnap.exists()) {
          unitsSold = (soldSnap.data().units_sold || 0) + 1;
        }
        // Remove undefined fields to prevent Firestore invalid data errors
        const { id, ...rawProductData } = product;
        const sanitizedProductData = Object.fromEntries(
          Object.entries(rawProductData).filter(([, v]) => v !== undefined)
        );
        const priceNumber = Number(product.price || 0);
        const totalRevenue = unitsSold * priceNumber;
        transaction.set(soldRef, {
          ...sanitizedProductData,
          sold: newStock === 0,
          soldAt: serverTimestamp(),
          units_sold: unitsSold,
          total_revenue: totalRevenue,
        });
      });
      setSuccess("Product marked as sold!");
    } catch (err) {
      setError(err.message || "Failed to mark as sold.");
    }
    setLoading(false);
  };

  // Professional WhatsApp invoice message builder
  const buildWhatsAppMessage = (product) => {
    const lines = [
      `🧾 *Invoice Summary*`,
      `━━━━━━━━━━━━━━━━━━`,
      `*Store:* Shree Noble Footwear`,
      `*Date:* ${new Date().toLocaleString()}`,
      ``,
      `👟 *Product:* ${product?.name || "-"} (${product?.barcode || "N/A"})`,
      `📂 *Category:* ${product?.category || "-"} | ${
        product?.gender || ""
      } | Size: ${product?.size || "-"}`,
      `💰 *Price:* ₹${Number(product?.price || 0).toLocaleString("en-IN")}`,
      ``,
      `✅ Thank you for shopping with us!`,
      `Need assistance? Reply here – we're happy to help.`,
      `📍 Visit again: Shree Noble Footwear`,
      ``,
      `━━━━━━━━━━━━━━━━━━`,
    ];
    return lines.join("\n");
  };

  // ✅ Final, correct WhatsApp encoder (preserves emojis & line breaks)
  const encodeWhatsAppMessage = (text) => {
    return encodeURIComponent(text)
      .replace(/%EF%B8%8F/g, "") // strip emoji variation selectors
      .replace(/%0A/g, "%0D%0A"); // ensure WhatsApp line breaks
  };

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6 lg:p-2">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Inventory Management
          </h1>
          <p className="text-gray-600">
            Manage your products, track inventory, and generate invoices
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Add Product Form */}
          <div className="xl:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-xl">
                  <PlusIcon />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {editId ? "Edit Product" : "Add New Product"}
                </h2>
              </div>

              <form onSubmit={handleAddProduct} className="space-y-6">
                {/* Barcode Section */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900 flex items-center gap-2">
                    <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
                    Product Information
                  </h3>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Barcode
                      </label>
                      <input
                        type="text"
                        placeholder="Scan or enter barcode"
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                        required
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        className="px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
                        onClick={() => setShowScanner(true)}
                      >
                        <ScanIcon />
                        <span className="hidden sm:inline">Scan</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product Name
                      </label>
                      <input
                        type="text"
                        placeholder="Enter product name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        placeholder="Product description (optional)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Product Details */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900 flex items-center gap-2">
                    <div className="w-1 h-5 bg-green-500 rounded-full"></div>
                    Product Details
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Size
                      </label>
                      <input
                        type="number"
                        placeholder="Size"
                        value={size}
                        onChange={(e) => setSize(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category
                      </label>
                      <input
                        type="text"
                        placeholder="Product category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Gender
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {["Man", "Woman", "Kids"].map((genderOption) => (
                        <label
                          key={genderOption}
                          className={`flex items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                            gender === genderOption
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="gender"
                            value={genderOption}
                            checked={gender === genderOption}
                            onChange={(e) => setGender(e.target.value)}
                            className="sr-only"
                          />
                          <span className="font-medium text-sm">
                            {genderOption}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Pricing & Stock */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900 flex items-center gap-2">
                    <div className="w-1 h-5 bg-purple-500 rounded-full"></div>
                    Pricing & Inventory
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Price (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                        required
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stock Quantity
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                        required
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Alert Messages */}
                {(error || success) && (
                  <div className="space-y-2">
                    {error && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                        <p className="text-red-700 text-sm font-medium">
                          {error}
                        </p>
                      </div>
                    )}
                    {success && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                        <p className="text-green-700 text-sm font-medium">
                          {success}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-4 rounded-xl hover:from-blue-600 hover:to-blue-700 focus:ring-4 focus:ring-blue-200 focus:ring-offset-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckIcon />
                      {editId ? "Update Product" : "Add Product"}
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Product Table */}
          <div className="xl:col-span-7">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
              {/* Table Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Product Inventory
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                      {filteredProducts.length} product
                      {filteredProducts.length !== 1 ? "s" : ""} found
                    </p>
                  </div>
                  <div className="relative w-full sm:w-80">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <SearchIcon />
                    </div>
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Table Content */}
              <div className="overflow-x-auto">
                {filteredProducts.length > 0 ? (
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Code
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Details
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Stock
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredProducts.map((product) => (
                        <tr
                          key={product.id}
                          className="hover:bg-gray-50 transition-colors duration-150"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {product.barcode}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                                {product.name}
                              </div>
                              {product.description && (
                                <div className="text-xs text-gray-500 truncate max-w-[200px] mt-1">
                                  {product.description}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {product.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            <div className="flex flex-col space-y-1">
                              <span>Size: {product.size}</span>
                              <span className="capitalize">
                                {product.gender}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">
                              ₹{product.price}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
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
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleEdit(product)}
                                className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors duration-150 tooltip"
                                title="Edit Product"
                              >
                                <EditIcon />
                              </button>
                              <button
                                onClick={() => {
                                  const invoiceId = `INV-${
                                    product.barcode || product.id
                                  }-${new Date()
                                    .toISOString()
                                    .slice(0, 19)
                                    .replace(/[:T]/g, "")}`;
                                  const content = `Invoice ID: ${invoiceId}\nDate: ${new Date().toLocaleString()}\n\nItem: ${
                                    product.name || ""
                                  }\nCode: ${
                                    product.barcode || ""
                                  }\nCategory: ${
                                    product.category || ""
                                  }\nSize: ${product.size || ""}\nGender: ${
                                    product.gender || ""
                                  }\nPrice: ₹${
                                    product.price || "0"
                                  }\nQuantity: 1\nTotal: ₹${
                                    product.price || "0"
                                  }\n\nThank you for your purchase!`;
                                  setInvoiceProduct(product);
                                  setInvoiceContent(content);
                                  setInvoicePhone("");
                                  setInvoiceError("");
                                  setInvoiceSuccess("");
                                  setShowInvoiceModal(true);
                                }}
                                className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors duration-150"
                                title="Generate Invoice"
                              >
                                <InvoiceIcon />
                              </button>
                              <button
                                onClick={() => handleDelete(product.id)}
                                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-150"
                                title="Delete Product"
                              >
                                <DeleteIcon />
                              </button>
                              <button
                                onClick={() => handleMarkAsSold(product)}
                                disabled={Number(product.stock) <= 0}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-150 ${
                                  Number(product.stock) <= 0
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    : "bg-green-100 text-green-700 hover:bg-green-200"
                                }`}
                              >
                                {Number(product.stock) <= 0
                                  ? "Out of Stock"
                                  : "Mark Sold"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <SearchIcon />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No products found
                    </h3>
                    <p className="text-gray-500 text-center max-w-md">
                      {search
                        ? "Try adjusting your search terms"
                        : "Start by adding your first product to the inventory"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Barcode Scanner Modal */}
        {showScanner && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
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
                <div className="rounded-xl overflow-hidden bg-black">
                  <ZXingBarcodeScanner
                    onResult={(code) => setBarcode(code)}
                    onClose={() => setShowScanner(false)}
                    width="100%"
                    height={250}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Modal */}
        {showInvoiceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">
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

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      WhatsApp Number
                    </label>
                    <input
                      type="text"
                      placeholder="Enter recipient phone with country code (e.g. 919876543210)"
                      value={invoicePhone}
                      onChange={(e) => setInvoicePhone(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
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
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 font-mono text-sm resize-none"
                    />
                  </div>

                  {(invoiceError || invoiceSuccess) && (
                    <div className="space-y-2">
                      {invoiceError && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                          <p className="text-red-700 text-sm font-medium">
                            {invoiceError}
                          </p>
                        </div>
                      )}
                      {invoiceSuccess && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                          <p className="text-green-700 text-sm font-medium">
                            {invoiceSuccess}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 justify-end">
                    <button
                      className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors duration-200"
                      onClick={() => {
                        setShowInvoiceModal(false);
                        setInvoiceError("");
                        setInvoiceSuccess("");
                      }}
                    >
                      Close
                    </button>
                    <button
                      className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2"
                      onClick={() => {
                        setInvoiceError("");
                        setInvoiceSuccess("");
                        try {
                          if (invoiceProduct) {
                            // Generate branded single-item invoice
                            const doc = new jsPDF({ unit: "pt", format: "a4" });
                            const pageWidth = doc.internal.pageSize.getWidth();
                            const fmt = (n) =>
                              new Intl.NumberFormat("en-IN").format(
                                Number(n || 0)
                              );
                            // Header
                            doc.setFillColor(243, 248, 255);
                            doc.rect(0, 0, pageWidth, 90, "F");
                            doc.setTextColor(17, 24, 39);
                            doc.setFont("helvetica", "bold");
                            doc.setFontSize(22);
                            doc.text("SHREE NOBLE FOOTWEAR", 40, 42);
                            doc.setFont("helvetica", "normal");
                            doc.setFontSize(10);
                            doc.text(
                              "contact@noblefootwear.com | +91-XXXXXXXXXX",
                              40,
                              60
                            );
                            const invId = `INV-${
                              invoiceProduct.barcode || invoiceProduct.id || "-"
                            }-${new Date().toISOString().slice(0, 10)}`;
                            doc.setFontSize(14);
                            doc.text("TAX INVOICE", 40, 110);
                            doc.setFontSize(11);
                            doc.text(`Invoice No: ${invId}`, 40, 130);
                            doc.text(
                              `Date: ${new Date().toLocaleString()}`,
                              40,
                              146
                            );
                            // Table
                            let y = 170;
                            const colItem = 50,
                              colQty = pageWidth - 260,
                              colPrice = pageWidth - 200,
                              colAmt = pageWidth - 40;
                            doc.setFillColor(240, 245, 255);
                            doc.rect(40, y, pageWidth - 80, 26, "F");
                            doc.setFontSize(11);
                            doc.text("Item", colItem, y + 17);
                            doc.text("Qty", colQty - 10, y + 17, {
                              align: "right",
                            });
                            doc.text("Price", colPrice, y + 17, {
                              align: "right",
                            });
                            doc.text("Amount", colAmt, y + 17, {
                              align: "right",
                            });
                            y += 34;
                            const qty = 1;
                            const price = Number(invoiceProduct.price || 0);
                            const amt = qty * price;
                            doc.setFontSize(10);
                            doc.text(
                              `${invoiceProduct.name || "Product"} (${
                                invoiceProduct.barcode || "-"
                              })`,
                              colItem,
                              y
                            );
                            doc.text(String(qty), colQty - 10, y, {
                              align: "right",
                            });
                            doc.text(`₹${fmt(price)}`, colPrice, y, {
                              align: "right",
                            });
                            doc.text(`₹${fmt(amt)}`, colAmt, y, {
                              align: "right",
                            });
                            y += 20;
                            doc.setDrawColor(220);
                            doc.line(40, y, pageWidth - 40, y);
                            y += 18;
                            const labelRight = colAmt - 120,
                              totalRight = colAmt;
                            doc.setFontSize(11);
                            doc.text("Subtotal", labelRight, y, {
                              align: "right",
                            });
                            doc.text(`₹${fmt(amt)}`, totalRight, y, {
                              align: "right",
                            });
                            y += 16;
                            doc.setFontSize(12);
                            doc.text("Total", labelRight, y, {
                              align: "right",
                            });
                            doc.text(`₹${fmt(amt)}`, totalRight, y, {
                              align: "right",
                            });
                            y += 30;
                            doc.setFontSize(9);
                            doc.text(
                              "Thank you for your purchase! Exchange within 7 days with original bill.",
                              40,
                              y
                            );
                            const fileName = `${(
                              invoiceProduct.name || "invoice"
                            )
                              .toString()
                              .replace(/\s+/g, "_")}_${Date.now()}.pdf`;
                            doc.save(fileName);
                          } else {
                            // Fallback to free-text PDF
                            const doc = new jsPDF({ unit: "pt", format: "a4" });
                            const lines = (invoiceContent || "").split("\n");
                            let top = 40;
                            const left = 40;
                            const lh = 14;
                            doc.setFontSize(12);
                            lines.forEach((ln) => {
                              doc.text(ln, left, top);
                              top += lh;
                              if (top > 820) {
                                doc.addPage();
                                top = 40;
                              }
                            });
                            doc.save(`invoice_${Date.now()}.pdf`);
                          }
                          setInvoiceSuccess(
                            "PDF generated. You can also attach it on WhatsApp."
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
                      className="px-6 py-3 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors duration-200 flex items-center gap-2"
                      onClick={async () => {
                        setInvoiceError("");
                        setInvoiceSuccess("");
                        const digits = (invoicePhone || "").replace(/\D/g, "");
                        if (!digits) {
                          setInvoiceError("Please enter a valid phone number.");
                          return;
                        }
                        try {
                          const msg = invoiceProduct
                            ? buildWhatsAppMessage(invoiceProduct)
                            : invoiceContent || "";
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
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                      Send to WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Inventory;
