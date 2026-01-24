import React, { useState, useEffect } from "react";
import { db } from "../../firebaseConfig";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { BiPackage, BiError } from "react-icons/bi";

function LowStockModal({ onClose, threshold = 10 }) {
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "ProductsRegistered"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const products = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        let totalStock = 0;
        const variants = [];

        // Check if product has variants
        if (data.variants && typeof data.variants === "object") {
          Object.entries(data.variants).forEach(([size, stock]) => {
            const stockValue = parseInt(stock) || 0;
            totalStock += stockValue;

            if (stockValue <= threshold) {
              variants.push({
                size,
                stock: stockValue,
                isLow: true,
              });
            }
          });
        } else {
          // No variants, check main stock
          totalStock = parseInt(data.stock) || 0;
        }

        // Add product if any variant is low or total stock is low
        if (totalStock <= threshold || variants.length > 0) {
          products.push({
            id: doc.id,
            ...data,
            totalStock,
            lowVariants: variants,
          });
        }
      });

      setLowStockProducts(products);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [threshold]);

  const getStockLevelColor = (stock) => {
    if (stock === 0) return "text-red-600 bg-red-50";
    if (stock <= 5) return "text-orange-600 bg-orange-50";
    return "text-yellow-600 bg-yellow-50";
  };

  const getStockLevelLabel = (stock) => {
    if (stock === 0) return "Out of Stock";
    if (stock <= 5) return "Critical";
    return "Low Stock";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <BiError className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Low Stock Alert</h2>
              <p className="text-white/90 text-sm">
                Products running low on inventory
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
          ) : lowStockProducts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BiPackage className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                All Good! 🎉
              </h3>
              <p className="text-gray-600">
                All products are well-stocked. No low stock items found.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Banner */}
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
                <BiError className="w-6 h-6 text-orange-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-orange-900">
                    {lowStockProducts.length} product(s) need attention
                  </p>
                  <p className="text-sm text-orange-700">
                    Consider restocking these items soon to avoid stockouts
                  </p>
                </div>
              </div>

              {/* Product List */}
              <div className="grid gap-4">
                {lowStockProducts.map((product) => (
                  <div
                    key={product.id}
                    className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-lg mb-1">
                          {product.name}
                        </h4>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>Code: {product.barcode}</span>
                          {product.category && (
                            <>
                              <span>•</span>
                              <span>{product.category}</span>
                            </>
                          )}
                          {product.gender && (
                            <>
                              <span>•</span>
                              <span>{product.gender}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStockLevelColor(
                          product.totalStock
                        )}`}
                      >
                        {getStockLevelLabel(product.totalStock)}
                      </div>
                    </div>

                    {/* Variants Display */}
                    {product.lowVariants && product.lowVariants.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">
                          Low Stock Sizes:
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {product.lowVariants.map((variant) => (
                            <div
                              key={variant.size}
                              className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                            >
                              <span className="text-sm font-medium text-gray-700">
                                Size {variant.size}
                              </span>
                              <span
                                className={`text-sm font-semibold ${
                                  variant.stock === 0
                                    ? "text-red-600"
                                    : variant.stock <= 5
                                    ? "text-orange-600"
                                    : "text-yellow-600"
                                }`}
                              >
                                {variant.stock}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                        <span className="text-sm font-medium text-gray-700">
                          Total Stock:
                        </span>
                        <span className="text-lg font-bold text-orange-600">
                          {product.totalStock} units
                        </span>
                      </div>
                    )}

                    {/* Price Info */}
                    {product.price && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <span className="text-sm text-gray-600">
                          Price:{" "}
                          <span className="font-semibold text-gray-900">
                            ₹{Number(product.price).toLocaleString("en-IN")}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-xl transition-colors duration-150"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default LowStockModal;
