import React, { useState, useEffect } from "react";
import { db } from "../../firebaseConfig";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  getDocs,
  updateDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import {
  BiSearch,
  BiArrowBack,
  BiCheck,
  BiX,
  BiPackage,
  BiRefresh,
} from "react-icons/bi";

function ReturnsRefunds() {
  const [returns, setReturns] = useState([]);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [returnReason, setReturnReason] = useState("");
  const [refundMethod, setRefundMethod] = useState("Original Payment");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTab, setSearchTab] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");

  // Load returns
  useEffect(() => {
    const q = query(collection(db, "Returns"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const returnsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setReturns(returnsList);
    });
    return () => unsubscribe();
  }, []);

  const handleSearchInvoice = async () => {
    if (!invoiceSearch.trim()) {
      setError("Please enter search criteria");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const searchTerm = invoiceSearch.trim().toLowerCase();

      // Get all sales to search through
      const q = query(collection(db, "Sales"));
      const querySnapshot = await getDocs(q);

      // Search by multiple criteria
      const matches = querySnapshot.docs.filter((d) => {
        const data = d.data();

        // Search by sale_id or doc id
        if (
          d.id.toLowerCase() === searchTerm ||
          data.sale_id?.toLowerCase() === searchTerm
        ) {
          return true;
        }

        // Search by customer name
        if (data.customer?.name?.toLowerCase().includes(searchTerm)) {
          return true;
        }

        // Search by customer phone
        if (data.customer?.phone?.includes(searchTerm)) {
          return true;
        }

        // Search by product name in items
        if (data.items && Array.isArray(data.items)) {
          return data.items.some(
            (item) =>
              item.name?.toLowerCase().includes(searchTerm) ||
              item.product_name?.toLowerCase().includes(searchTerm)
          );
        }

        return false;
      });

      if (matches.length === 0) {
        setError("No invoices found matching your search");
      } else if (matches.length === 1) {
        // Single match - select it
        setSelectedInvoice({ id: matches[0].id, ...matches[0].data() });
        setSearchTab(false);
      } else {
        // Multiple matches - show selection
        const matchList = matches.map((m) => ({
          id: m.id,
          ...m.data(),
        }));
        setSelectedInvoice({ multipleResults: true, results: matchList });
        setSearchTab(false);
      }
    } catch (err) {
      setError("Error searching: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleItem = (item, index) => {
    const exists = selectedItems.find((i) => i.index === index);
    if (exists) {
      setSelectedItems(selectedItems.filter((i) => i.index !== index));
    } else {
      setSelectedItems([
        ...selectedItems,
        { ...item, index, returnQty: item.quantity || 1 },
      ]);
    }
  };

  const handleUpdateReturnQty = (index, qty) => {
    setSelectedItems(
      selectedItems.map((item) =>
        item.index === index
          ? { ...item, returnQty: Math.min(Math.max(1, qty), item.quantity) }
          : item
      )
    );
  };

  const handleProcessReturn = async () => {
    if (selectedItems.length === 0) {
      setError("Please select at least one item to return");
      return;
    }

    if (!returnReason.trim()) {
      setError("Please provide a return reason");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await runTransaction(db, async (transaction) => {
        // Calculate refund amount
        const refundAmount = selectedItems.reduce(
          (sum, item) => sum + item.price * item.returnQty,
          0
        );

        // Create return record
        const returnData = {
          invoiceId: selectedInvoice.id,
          saleId: selectedInvoice.sale_id || selectedInvoice.id,
          customer: selectedInvoice.customer || {},
          items: selectedItems.map((item) => ({
            name: item.name,
            barcode: item.barcode,
            price: item.price,
            quantity: item.returnQty,
            originalQuantity: item.quantity,
          })),
          refundAmount,
          returnReason,
          refundMethod,
          status: "Pending",
          createdAt: serverTimestamp(),
          processedAt: null,
        };

        await addDoc(collection(db, "Returns"), returnData);

        // Restore stock for returned items
        for (const item of selectedItems) {
          const productRef = doc(
            db,
            "ProductsRegistered",
            item.productId || item.barcode
          );
          const productSnap = await transaction.get(productRef);

          if (productSnap.exists()) {
            const productData = productSnap.data();

            // If product has variants
            if (item.size && productData.variants) {
              const newVariants = { ...productData.variants };
              newVariants[item.size] =
                (parseInt(newVariants[item.size]) || 0) + item.returnQty;
              transaction.update(productRef, { variants: newVariants });
            } else {
              // Simple stock update
              const currentStock = parseInt(productData.stock) || 0;
              transaction.update(productRef, {
                stock: currentStock + item.returnQty,
              });
            }
          }
        }
      });

      setSuccess(
        "Return processed successfully! Refund: ₹" +
          selectedItems
            .reduce((sum, item) => sum + item.price * item.returnQty, 0)
            .toLocaleString("en-IN")
      );

      setTimeout(() => {
        setSelectedInvoice(null);
        setSelectedItems([]);
        setReturnReason("");
        setInvoiceSearch("");
        setSearchTab(true);
        setSuccess("");
      }, 2000);
    } catch (err) {
      setError("Failed to process return: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReturn = async (returnId) => {
    try {
      await updateDoc(doc(db, "Returns", returnId), {
        status: "Approved",
        processedAt: serverTimestamp(),
      });
      setSuccess("Return approved successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to approve return: " + err.message);
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleRejectReturn = async (returnId) => {
    if (!window.confirm("Are you sure you want to reject this return?")) {
      return;
    }

    try {
      await updateDoc(doc(db, "Returns", returnId), {
        status: "Rejected",
        processedAt: serverTimestamp(),
      });
      setSuccess("Return rejected");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to reject return: " + err.message);
      setTimeout(() => setError(""), 3000);
    }
  };

  const filteredReturns = returns.filter((r) => {
    if (filterStatus === "all") return true;
    return r.status?.toLowerCase() === filterStatus;
  });

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "bg-green-100 text-green-700";
      case "rejected":
        return "bg-red-100 text-red-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Returns & Refunds
          </h1>
          <p className="text-gray-600">
            Manage product returns and process refunds
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700">
            {success}
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Process New Return */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Process New Return
              </h2>

              {searchTab ? (
                <div>
                  {/* Search Invoice */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search Invoice
                    </label>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <BiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={invoiceSearch}
                          onChange={(e) => setInvoiceSearch(e.target.value)}
                          onKeyPress={(e) =>
                            e.key === "Enter" && handleSearchInvoice()
                          }
                          placeholder="Search by Invoice ID, Customer Name, Phone, or Product"
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <button
                        onClick={handleSearchInvoice}
                        disabled={loading}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                      >
                        {loading ? "Searching..." : "Search"}
                      </button>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">
                      How to Process a Return
                    </h3>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                      <li>Enter the invoice ID to search for the sale</li>
                      <li>Select the items to be returned</li>
                      <li>Specify the return reason and refund method</li>
                      <li>Process the return to update inventory</li>
                    </ol>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Multiple Results Selection */}
                  {selectedInvoice?.multipleResults ? (
                    <div>
                      <button
                        onClick={() => {
                          setSearchTab(true);
                          setSelectedInvoice(null);
                          setSelectedItems([]);
                        }}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
                      >
                        <BiArrowBack className="w-5 h-5" />
                        Back to Search
                      </button>

                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          Multiple Invoices Found (
                          {selectedInvoice.results.length})
                        </h3>
                        <div className="space-y-3">
                          {selectedInvoice.results.map((invoice) => (
                            <div
                              key={invoice.id}
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setSelectedItems([]);
                              }}
                              className="border border-gray-200 rounded-xl p-4 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all"
                            >
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <p className="text-sm text-gray-600">
                                    Invoice ID
                                  </p>
                                  <p className="font-semibold text-gray-900">
                                    {invoice.sale_id || invoice.id}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">
                                    Customer
                                  </p>
                                  <p className="font-semibold text-gray-900">
                                    {invoice.customer?.name || "Walk-in"}
                                  </p>
                                  {invoice.customer?.phone && (
                                    <p className="text-sm text-gray-500">
                                      {invoice.customer.phone}
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">Total</p>
                                  <p className="font-semibold text-gray-900">
                                    ₹
                                    {Number(invoice.total || 0).toLocaleString(
                                      "en-IN"
                                    )}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {invoice.created_at
                                      ?.toDate?.()
                                      ?.toLocaleDateString() || "-"}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-2">
                                <p className="text-xs text-gray-600">
                                  Products:
                                </p>
                                <p className="text-sm text-gray-800">
                                  {invoice.items
                                    ?.map(
                                      (item) => item.name || item.product_name
                                    )
                                    .join(", ") || "-"}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Invoice Details */}
                      <div className="mb-6">
                        <button
                          onClick={() => {
                            setSearchTab(true);
                            setSelectedInvoice(null);
                            setSelectedItems([]);
                          }}
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
                        >
                          <BiArrowBack className="w-5 h-5" />
                          Back to Search
                        </button>

                        <div className="bg-gray-50 rounded-xl p-4 mb-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-600">
                                Invoice ID
                              </p>
                              <p className="font-semibold text-gray-900">
                                {selectedInvoice?.sale_id ||
                                  selectedInvoice?.id}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Customer</p>
                              <p className="font-semibold text-gray-900">
                                {selectedInvoice?.customer?.name || "Walk-in"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Total</p>
                              <p className="font-semibold text-gray-900">
                                ₹
                                {Number(
                                  selectedInvoice?.total || 0
                                ).toLocaleString("en-IN")}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Date</p>
                              <p className="font-semibold text-gray-900">
                                {selectedInvoice?.created_at
                                  ?.toDate?.()
                                  ?.toLocaleDateString() || "-"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Items Selection */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Select Items to Return
                        </label>
                        <div className="space-y-2">
                          {selectedInvoice?.items?.map((item, idx) => {
                            const isSelected = selectedItems.find(
                              (i) => i.index === idx
                            );
                            return (
                              <div
                                key={idx}
                                className={`border rounded-xl p-4 cursor-pointer transition-all ${
                                  isSelected
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-200 hover:border-gray-300"
                                }`}
                                onClick={() => handleToggleItem(item, idx)}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                      <div
                                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                          isSelected
                                            ? "bg-blue-600 border-blue-600"
                                            : "border-gray-300"
                                        }`}
                                      >
                                        {isSelected && (
                                          <BiCheck className="w-4 h-4 text-white" />
                                        )}
                                      </div>
                                      <div>
                                        <p className="font-medium text-gray-900">
                                          {item.name}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                          ₹
                                          {Number(item.price).toLocaleString(
                                            "en-IN"
                                          )}{" "}
                                          × {item.quantity}
                                        </p>
                                      </div>
                                    </div>

                                    {isSelected && (
                                      <div className="mt-3 ml-8">
                                        <label className="block text-xs text-gray-600 mb-1">
                                          Return Quantity
                                        </label>
                                        <input
                                          type="number"
                                          min="1"
                                          max={item.quantity}
                                          value={
                                            selectedItems.find(
                                              (i) => i.index === idx
                                            )?.returnQty || 1
                                          }
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            handleUpdateReturnQty(
                                              idx,
                                              parseInt(e.target.value) || 1
                                            );
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                          className="w-24 px-3 py-1 border border-gray-300 rounded-lg"
                                        />
                                      </div>
                                    )}
                                  </div>
                                  <span className="font-semibold text-gray-900">
                                    ₹
                                    {(
                                      item.price * item.quantity
                                    ).toLocaleString("en-IN")}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Return Details */}
                      {selectedItems.length > 0 && (
                        <>
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Return Reason
                            </label>
                            <select
                              value={returnReason}
                              onChange={(e) => setReturnReason(e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">Select reason...</option>
                              <option value="Defective Product">
                                Defective Product
                              </option>
                              <option value="Wrong Size">Wrong Size</option>
                              <option value="Wrong Product">
                                Wrong Product
                              </option>
                              <option value="Changed Mind">Changed Mind</option>
                              <option value="Not as Described">
                                Not as Described
                              </option>
                              <option value="Other">Other</option>
                            </select>
                          </div>

                          <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Refund Method
                            </label>
                            <select
                              value={refundMethod}
                              onChange={(e) => setRefundMethod(e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="Original Payment">
                                Original Payment Method
                              </option>
                              <option value="Cash">Cash</option>
                              <option value="Store Credit">Store Credit</option>
                              <option value="Bank Transfer">
                                Bank Transfer
                              </option>
                            </select>
                          </div>

                          {/* Refund Summary */}
                          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-gray-700">
                                Items to Return:
                              </span>
                              <span className="font-semibold text-gray-900">
                                {selectedItems.reduce(
                                  (sum, item) => sum + item.returnQty,
                                  0
                                )}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-gray-900">
                                Total Refund:
                              </span>
                              <span className="text-xl font-bold text-blue-600">
                                ₹
                                {selectedItems
                                  .reduce(
                                    (sum, item) =>
                                      sum + item.price * item.returnQty,
                                    0
                                  )
                                  .toLocaleString("en-IN")}
                              </span>
                            </div>
                          </div>

                          {/* Process Button */}
                          <button
                            onClick={handleProcessReturn}
                            disabled={loading || !returnReason}
                            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            <BiCheck className="w-6 h-6" />
                            {loading ? "Processing..." : "Process Return"}
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Returns History */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Returns History
                </h2>
                <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
                  <button
                    onClick={() => setFilterStatus("all")}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      filterStatus === "all"
                        ? "bg-white text-gray-900 shadow"
                        : "text-gray-600"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterStatus("pending")}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      filterStatus === "pending"
                        ? "bg-white text-gray-900 shadow"
                        : "text-gray-600"
                    }`}
                  >
                    Pending
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredReturns.length === 0 ? (
                  <div className="text-center py-8">
                    <BiPackage className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No returns yet</p>
                  </div>
                ) : (
                  filteredReturns.map((returnItem) => (
                    <div
                      key={returnItem.id}
                      className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">
                            {returnItem.saleId}
                          </p>
                          <p className="text-xs text-gray-600">
                            {returnItem.createdAt
                              ?.toDate?.()
                              ?.toLocaleDateString() || "-"}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            returnItem.status
                          )}`}
                        >
                          {returnItem.status}
                        </span>
                      </div>

                      <div className="mb-2">
                        <p className="text-xs text-gray-600">
                          {returnItem.items?.length} item(s) • ₹
                          {Number(returnItem.refundAmount || 0).toLocaleString(
                            "en-IN"
                          )}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Reason: {returnItem.returnReason}
                        </p>
                      </div>

                      {returnItem.status === "Pending" && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleApproveReturn(returnItem.id)}
                            className="flex-1 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
                          >
                            <BiCheck className="w-4 h-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectReturn(returnItem.id)}
                            className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
                          >
                            <BiX className="w-4 h-4" />
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReturnsRefunds;
