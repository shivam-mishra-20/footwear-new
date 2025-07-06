/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
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

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const docId = `${barcode}_${name}`;
      // Check if a product with the same barcode already exists
      const existing = products.find((p) => p.barcode === barcode);
      if (!editId && existing) {
        setError("Product already registered.");
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
          price,
          stock,
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
          price,
          stock,
          createdAt: new Date(),
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
        // Update ProductsRegistered
        transaction.update(productRef, {
          sold: newStock === 0,
          stock: newStock,
        });
        // Update or create SoldProducts
        let unitsSold = 1;
        if (soldSnap.exists()) {
          unitsSold = (soldSnap.data().units_sold || 0) + 1;
        }
        const { id, ...productData } = product;
        const totalRevenue = unitsSold * Number(product.price || 0);
        transaction.set(soldRef, {
          ...productData,
          sold: newStock === 0,
          soldAt: new Date(),
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

  return (
    <div className="flex gap-8 w-full">
      {/* Add Product Form */}
      <div className="flex-1 max-w-lg">
        <h2 className="text-2xl font-bold mb-6">Add New Product</h2>
        <form onSubmit={handleAddProduct}>
          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-2">General Information</h3>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                placeholder="Scan/Enter Barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-200"
                required
              />
              <button
                type="button"
                className="bg-blue-500 text-white px-3 py-2 rounded-lg font-medium hover:bg-blue-700"
                onClick={() => setShowScanner(true)}
              >
                Scan Barcode
              </button>
            </div>
            {showScanner && (
              <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
                <div className="bg-white rounded-xl p-4 shadow-lg relative w-full max-w-md">
                  <ZXingBarcodeScanner
                    onResult={(code) => setBarcode(code)}
                    onClose={() => setShowScanner(false)}
                    width="100%"
                    height={250}
                  />
                </div>
              </div>
            )}
            <input
              type="text"
              placeholder="Product Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mb-4 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-200"
              required
            />
            <textarea
              placeholder="Product Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full mb-4 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-200 min-h-[70px]"
            />
          </div>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <label className="block font-semibold mb-1">Size</label>
              <input
                type="number"
                placeholder="Pick Size"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-200"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block font-semibold mb-1">Gender</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="gender"
                    value="Man"
                    checked={gender === "Man"}
                    onChange={(e) => setGender(e.target.value)}
                  />{" "}
                  Man
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="gender"
                    value="Woman"
                    checked={gender === "Woman"}
                    onChange={(e) => setGender(e.target.value)}
                  />{" "}
                  Woman
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="gender"
                    value="Kids"
                    checked={gender === "Kids"}
                    onChange={(e) => setGender(e.target.value)}
                  />{" "}
                  Kids
                </label>
              </div>
            </div>
          </div>
          <div className="mb-4">
            <label className="block font-semibold mb-1">Category</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Product Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-200"
                required
              />
              <button
                type="button"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
                tabIndex={-1}
              >
                Add Category
              </button>
            </div>
          </div>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <label className="block font-semibold mb-1">Price</label>
              <input
                type="number"
                placeholder="Price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-200"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block font-semibold mb-1">Stock</label>
              <input
                type="number"
                placeholder="Stock"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-200"
                required
              />
            </div>
          </div>
          {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
          {success && (
            <div className="text-green-600 text-sm mb-2">{success}</div>
          )}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 text-lg hover:bg-blue-700 disabled:opacity-60"
            disabled={loading}
          >
            <span className="text-2xl">&#10003;</span>{" "}
            {loading ? "Adding..." : "Add Product"}
          </button>
        </form>
      </div>
      {/* Product Table */}
      <div className="flex-1">
        <div className="flex items-center mb-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search code/item"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-4 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl shadow border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-blue-50">
              <tr>
                <th className="px-4 py-2 font-semibold">Code</th>
                <th className="px-4 py-2 font-semibold">Item</th>
                <th className="px-4 py-2 font-semibold">Category</th>
                <th className="px-4 py-2 font-semibold">Size</th>
                <th className="px-4 py-2 font-semibold">Gender</th>
                <th className="px-4 py-2 font-semibold">&#8377;Amt</th>
                <th className="px-4 py-2 font-semibold">Stock</th>
                <th className="px-4 py-2 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <tr key={p.id} className="border-t hover:bg-blue-50">
                  <td className="px-4 py-2">{p.barcode}</td>
                  <td className="px-4 py-2">{p.name}</td>
                  <td className="px-4 py-2">{p.category}</td>
                  <td className="px-4 py-2">{p.size}</td>
                  <td className="px-4 py-2">{p.gender}</td>
                  <td className="px-4 py-2">{p.price}</td>
                  <td className="px-4 py-2">{p.stock}</td>
                  <td className="px-4 py-2 flex gap-2">
                    <button
                      className="p-1 hover:bg-blue-100 rounded"
                      onClick={() => handleEdit(p)}
                    >
                      Edit
                    </button>
                    <button
                      className="p-1 hover:bg-red-100 rounded"
                      onClick={() => handleDelete(p.id)}
                    >
                      Delete
                    </button>
                    <button
                      className="p-1 hover:bg-green-100 rounded"
                      onClick={() => handleMarkAsSold(p)}
                      disabled={Number(p.stock) <= 0}
                    >
                      {Number(p.stock) <= 0 ? "Out of Stock" : "Mark as Sold"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Inventory;
