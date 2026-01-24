import React, { useState, useEffect } from "react";
import { db } from "../../firebaseConfig";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  where,
  getDocs,
} from "firebase/firestore";
import {
  BiGift,
  BiPlus,
  BiSearch,
  BiTrash,
  BiCheck,
  BiCopy,
} from "react-icons/bi";

function GiftCardsVouchers() {
  const [giftCards, setGiftCards] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [giftCardCode, setGiftCardCode] = useState("");
  const [giftCardAmount, setGiftCardAmount] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Load gift cards
  useEffect(() => {
    const q = query(collection(db, "GiftCards"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cards = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setGiftCards(cards);
    });
    return () => unsubscribe();
  }, []);

  const generateGiftCardCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "GC";
    for (let i = 0; i < 10; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateGiftCard = async () => {
    if (!giftCardAmount || parseFloat(giftCardAmount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const code = giftCardCode || generateGiftCardCode();

      // Check if code already exists
      const q = query(collection(db, "GiftCards"), where("code", "==", code));
      const existingCards = await getDocs(q);

      if (!existingCards.empty) {
        setError("Gift card code already exists");
        setLoading(false);
        return;
      }

      const giftCardData = {
        code,
        amount: parseFloat(giftCardAmount),
        balance: parseFloat(giftCardAmount),
        status: "Active",
        recipientName: recipientName || null,
        recipientEmail: recipientEmail || null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        createdAt: serverTimestamp(),
        usedAt: null,
        transactions: [],
      };

      await addDoc(collection(db, "GiftCards"), giftCardData);

      setSuccess("Gift card created successfully!");
      setShowCreateModal(false);
      setGiftCardCode("");
      setGiftCardAmount("");
      setExpiryDate("");
      setRecipientName("");
      setRecipientEmail("");

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to create gift card: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateCard = async (cardId) => {
    if (
      !window.confirm("Are you sure you want to deactivate this gift card?")
    ) {
      return;
    }

    try {
      await updateDoc(doc(db, "GiftCards", cardId), {
        status: "Deactivated",
      });
      setSuccess("Gift card deactivated");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to deactivate gift card: " + err.message);
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (!window.confirm("Are you sure you want to delete this gift card?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "GiftCards", cardId));
      setSuccess("Gift card deleted");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to delete gift card: " + err.message);
      setTimeout(() => setError(""), 3000);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess("Code copied to clipboard!");
    setTimeout(() => setSuccess(""), 2000);
  };

  const filteredCards = giftCards.filter((card) => {
    const matchesSearch =
      card.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.recipientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.recipientEmail?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterStatus === "all" || card.status?.toLowerCase() === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-700";
      case "used":
        return "bg-gray-100 text-gray-700";
      case "expired":
        return "bg-red-100 text-red-700";
      case "deactivated":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const isExpired = (expiryDate) => {
    if (!expiryDate) return false;
    const expiry = expiryDate.toDate
      ? expiryDate.toDate()
      : new Date(expiryDate);
    return expiry < new Date();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Gift Cards & Vouchers
              </h1>
              <p className="text-gray-600">
                Create and manage gift cards for your customers
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-lg"
            >
              <BiPlus className="w-5 h-5" />
              Create Gift Card
            </button>
          </div>
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

        {/* Filters and Search */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <BiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by code, recipient name or email..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus("all")}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  filterStatus === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus("active")}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  filterStatus === "active"
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setFilterStatus("used")}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  filterStatus === "used"
                    ? "bg-gray-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Used
              </button>
            </div>
          </div>
        </div>

        {/* Gift Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCards.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-2xl shadow-lg border border-gray-100">
              <BiGift className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Gift Cards Found
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm
                  ? "No gift cards match your search"
                  : "Create your first gift card to get started"}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
                >
                  <BiPlus className="w-5 h-5" />
                  Create Gift Card
                </button>
              )}
            </div>
          ) : (
            filteredCards.map((card) => {
              const expired = isExpired(card.expiryDate);
              const actualStatus = expired ? "Expired" : card.status;

              return (
                <div
                  key={card.id}
                  className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden"
                >
                  {/* Decorative Elements */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full -ml-12 -mb-12"></div>

                  {/* Status Badge */}
                  <div className="flex justify-between items-start mb-4">
                    <BiGift className="w-8 h-8" />
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                        actualStatus
                      )}`}
                    >
                      {actualStatus}
                    </span>
                  </div>

                  {/* Gift Card Code */}
                  <div className="mb-4">
                    <p className="text-sm text-white/80 mb-1">Gift Card Code</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold tracking-wider">
                        {card.code}
                      </p>
                      <button
                        onClick={() => copyToClipboard(card.code)}
                        className="p-1 hover:bg-white/20 rounded transition-colors"
                        title="Copy code"
                      >
                        <BiCopy className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white/80">Balance</p>
                        <p className="text-3xl font-bold">
                          ₹{Number(card.balance || 0).toLocaleString("en-IN")}
                        </p>
                      </div>
                      {card.balance < card.amount && (
                        <div className="text-right">
                          <p className="text-xs text-white/80">Original</p>
                          <p className="text-sm font-semibold">
                            ₹{Number(card.amount || 0).toLocaleString("en-IN")}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recipient Info */}
                  {(card.recipientName || card.recipientEmail) && (
                    <div className="mb-4 pb-4 border-t border-white/20 pt-4">
                      {card.recipientName && (
                        <p className="text-sm text-white/90">
                          To: {card.recipientName}
                        </p>
                      )}
                      {card.recipientEmail && (
                        <p className="text-xs text-white/70">
                          {card.recipientEmail}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Expiry Date */}
                  {card.expiryDate && (
                    <p className="text-xs text-white/80 mb-4">
                      {expired ? "Expired" : "Expires"}:{" "}
                      {card.expiryDate.toDate
                        ? card.expiryDate.toDate().toLocaleDateString()
                        : new Date(card.expiryDate).toLocaleDateString()}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {card.status === "Active" && !expired && (
                      <button
                        onClick={() => handleDeactivateCard(card.id)}
                        className="flex-1 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                      >
                        Deactivate
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteCard(card.id)}
                      className="flex-1 py-2 bg-red-500/50 hover:bg-red-500/70 rounded-lg text-sm font-medium transition-colors"
                    >
                      Delete
                    </button>
                  </div>

                  {/* Created Date */}
                  <p className="text-xs text-white/60 mt-4">
                    Created:{" "}
                    {card.createdAt?.toDate
                      ? card.createdAt.toDate().toLocaleDateString()
                      : "-"}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Create Gift Card Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-4 flex justify-between items-center rounded-t-2xl">
                <h3 className="text-xl font-bold text-white">
                  Create Gift Card
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-white/80 hover:text-white"
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

              {/* Body */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gift Card Code (Optional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={giftCardCode}
                      onChange={(e) =>
                        setGiftCardCode(e.target.value.toUpperCase())
                      }
                      placeholder="Auto-generate if left empty"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => setGiftCardCode(generateGiftCardCode())}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium"
                    >
                      Generate
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    value={giftCardAmount}
                    onChange={(e) => setGiftCardAmount(e.target.value)}
                    placeholder="Enter amount"
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recipient Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Enter recipient name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recipient Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="Enter recipient email"
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateGiftCard}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <BiCheck className="w-5 h-5" />
                  {loading ? "Creating..." : "Create Gift Card"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GiftCardsVouchers;
