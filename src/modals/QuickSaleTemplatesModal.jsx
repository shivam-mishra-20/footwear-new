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
  serverTimestamp,
} from "firebase/firestore";
import { BiPlus, BiTrash, BiEdit2, BiCheck, BiPackage } from "react-icons/bi";

function QuickSaleTemplatesModal({ onClose, onApplyTemplate }) {
  const [templates, setTemplates] = useState([]);
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchProduct, setSearchProduct] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState(null);

  // Load templates
  useEffect(() => {
    const q = query(
      collection(db, "SaleTemplates"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const templateList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTemplates(templateList);
    });
    return () => unsubscribe();
  }, []);

  // Load products
  useEffect(() => {
    const q = query(
      collection(db, "ProductsRegistered"),
      orderBy("name", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(productList);
    });
    return () => unsubscribe();
  }, []);

  const handleAddProduct = (product) => {
    const exists = selectedProducts.find((p) => p.id === product.id);
    if (exists) {
      setError("Product already added to template");
      setTimeout(() => setError(""), 3000);
      return;
    }

    setSelectedProducts([
      ...selectedProducts,
      {
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        price: product.price,
        quantity: 1,
      },
    ]);
    setSearchProduct("");
  };

  const handleUpdateQuantity = (productId, quantity) => {
    setSelectedProducts(
      selectedProducts.map((p) =>
        p.id === productId ? { ...p, quantity: Math.max(1, quantity) } : p
      )
    );
  };

  const handleRemoveProduct = (productId) => {
    setSelectedProducts(selectedProducts.filter((p) => p.id !== productId));
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      setError("Please enter a template name");
      return;
    }

    if (selectedProducts.length === 0) {
      setError("Please add at least one product");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const templateData = {
        name: templateName,
        products: selectedProducts,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, "SaleTemplates", editingId), {
          ...templateData,
          createdAt: templates.find((t) => t.id === editingId)?.createdAt,
        });
        setSuccess("Template updated successfully!");
      } else {
        await addDoc(collection(db, "SaleTemplates"), templateData);
        setSuccess("Template created successfully!");
      }

      setTimeout(() => {
        setShowAddTemplate(false);
        setTemplateName("");
        setSelectedProducts([]);
        setEditingId(null);
        setSuccess("");
      }, 1500);
    } catch (err) {
      setError("Failed to save template: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTemplate = (template) => {
    setEditingId(template.id);
    setTemplateName(template.name);
    setSelectedProducts(template.products);
    setShowAddTemplate(true);
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm("Are you sure you want to delete this template?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "SaleTemplates", templateId));
      setSuccess("Template deleted successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to delete template: " + err.message);
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleApplyTemplate = (template) => {
    onApplyTemplate(template.products);
    onClose();
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name?.toLowerCase().includes(searchProduct.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(searchProduct.toLowerCase())
  );

  const getTotalAmount = () => {
    return selectedProducts.reduce((sum, p) => sum + p.price * p.quantity, 0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <BiPackage className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                Quick Sale Templates
              </h2>
              <p className="text-white/90 text-sm">
                Save and reuse common product combinations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/20 rounded-xl"
            aria-label="Close modal"
          >
            <svg
              className="w-6 h-6"
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

        {/* Messages */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
            {success}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!showAddTemplate ? (
            <>
              {/* Templates List */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Saved Templates ({templates.length})
                </h3>
                <button
                  onClick={() => setShowAddTemplate(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
                >
                  <BiPlus className="w-5 h-5" />
                  New Template
                </button>
              </div>

              {templates.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BiPackage className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No Templates Yet
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Create your first template to speed up common sales
                  </p>
                  <button
                    onClick={() => setShowAddTemplate(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
                  >
                    <BiPlus className="w-5 h-5" />
                    Create Template
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-lg mb-1">
                            {template.name}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {template.products?.length || 0} product(s) • Total:
                            ₹
                            {template.products
                              ?.reduce(
                                (sum, p) => sum + p.price * p.quantity,
                                0
                              )
                              .toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditTemplate(template)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Template"
                          >
                            <BiEdit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Template"
                          >
                            <BiTrash className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Products in template */}
                      <div className="space-y-2 mb-3">
                        {template.products?.map((product, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm"
                          >
                            <span className="text-gray-700">
                              {product.name} × {product.quantity}
                            </span>
                            <span className="font-semibold text-gray-900">
                              ₹
                              {(
                                product.price * product.quantity
                              ).toLocaleString("en-IN")}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Apply button */}
                      <button
                        onClick={() => handleApplyTemplate(template)}
                        className="w-full py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <BiCheck className="w-5 h-5" />
                        Apply to Cart
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Add/Edit Template Form */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingId ? "Edit Template" : "Create New Template"}
                  </h3>
                  <button
                    onClick={() => {
                      setShowAddTemplate(false);
                      setTemplateName("");
                      setSelectedProducts([]);
                      setEditingId(null);
                    }}
                    className="text-gray-600 hover:text-gray-900 font-medium"
                  >
                    Back to List
                  </button>
                </div>

                {/* Template Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g., Running Shoes Combo"
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Add Products */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add Products
                  </label>
                  <input
                    type="text"
                    value={searchProduct}
                    onChange={(e) => setSearchProduct(e.target.value)}
                    placeholder="Search products by name or barcode..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                  />

                  {searchProduct && (
                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl">
                      {filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          onClick={() => handleAddProduct(product)}
                          className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center justify-between border-b border-gray-100 last:border-b-0"
                        >
                          <div>
                            <p className="font-medium text-gray-900">
                              {product.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {product.barcode}
                            </p>
                          </div>
                          <span className="font-semibold text-gray-900">
                            ₹{Number(product.price).toLocaleString("en-IN")}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Products */}
                {selectedProducts.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selected Products
                    </label>
                    <div className="space-y-2">
                      {selectedProducts.map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {product.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              ₹{Number(product.price).toLocaleString("en-IN")}{" "}
                              each
                            </p>
                          </div>
                          <input
                            type="number"
                            min="1"
                            value={product.quantity}
                            onChange={(e) =>
                              handleUpdateQuantity(
                                product.id,
                                parseInt(e.target.value) || 1
                              )
                            }
                            className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center"
                          />
                          <button
                            onClick={() => handleRemoveProduct(product.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <BiTrash className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Total */}
                    <div className="mt-4 p-4 bg-blue-50 rounded-xl flex items-center justify-between">
                      <span className="font-semibold text-gray-900">
                        Total Amount:
                      </span>
                      <span className="text-xl font-bold text-blue-600">
                        ₹{getTotalAmount().toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {showAddTemplate && (
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
            <button
              onClick={() => {
                setShowAddTemplate(false);
                setTemplateName("");
                setSelectedProducts([]);
                setEditingId(null);
              }}
              className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-xl transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveTemplate}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Saving..."
                : editingId
                ? "Update Template"
                : "Save Template"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default QuickSaleTemplatesModal;
