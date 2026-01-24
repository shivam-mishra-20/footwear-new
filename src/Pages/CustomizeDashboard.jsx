import React, { useState } from "react";
import { useDashboard } from "../context/DashboardContext";
import {
  FiX,
  FiMove,
  FiEye,
  FiEyeOff,
  FiPlus,
  FiTrash2,
  FiEdit2,
  FiRotateCcw,
  FiSave,
} from "react-icons/fi";

function CustomizeDashboard({ onClose }) {
  const {
    customWidgets,
    toggleWidget,
    reorderWidgets,
    deleteCustomWidget,
    resetToDefaults,
    getAllWidgets,
  } = useDashboard();

  const [draggedItem, setDraggedItem] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const allWidgets = getAllWidgets();
  const enabledCount = allWidgets.filter((w) => w.enabled).length;

  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === index) return;

    const newWidgets = [...allWidgets];
    const draggedWidget = newWidgets[draggedItem];
    newWidgets.splice(draggedItem, 1);
    newWidgets.splice(index, 0, draggedWidget);

    // Update order property
    const reordered = newWidgets.map((w, i) => ({ ...w, order: i }));

    // Update the complete reordered list
    reorderWidgets(reordered);

    setDraggedItem(index);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const getWidgetIcon = (type) => {
    switch (type) {
      case "stat":
        return "📊";
      case "chart":
        return "📈";
      case "table":
        return "📋";
      case "custom":
        return "✨";
      default:
        return "📦";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                Customize Dashboard
              </h2>
              <p className="text-sm text-gray-600">
                Drag to reorder, toggle visibility, or create custom widgets
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiX className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Stats */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-600 font-medium mb-1">
                Active Widgets
              </p>
              <p className="text-2xl font-bold text-blue-900">{enabledCount}</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <p className="text-sm text-purple-600 font-medium mb-1">
                Custom Widgets
              </p>
              <p className="text-2xl font-bold text-purple-900">
                {customWidgets.length}
              </p>
            </div>
          </div>

          {/* Widget List */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">
                Dashboard Widgets
              </h3>
              <button
                onClick={resetToDefaults}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiRotateCcw className="w-4 h-4" />
                Reset to Default
              </button>
            </div>

            {allWidgets.map((widget, index) => (
              <div
                key={widget.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`border rounded-xl p-4 transition-all ${
                  draggedItem === index
                    ? "opacity-50 border-blue-500 shadow-lg"
                    : widget.enabled
                    ? "border-gray-200 bg-white hover:border-blue-300 hover:shadow-md"
                    : "border-gray-200 bg-gray-50 opacity-60"
                } cursor-move`}
              >
                <div className="flex items-center gap-4">
                  {/* Drag Handle */}
                  <div className="text-gray-400 hover:text-gray-600">
                    <FiMove className="w-5 h-5" />
                  </div>

                  {/* Widget Info */}
                  <div className="flex-1 flex items-center gap-3">
                    <span className="text-2xl">
                      {getWidgetIcon(widget.type)}
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {widget.title}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {widget.type} Widget
                        {widget.type === "custom" && " • Custom Created"}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {widget.type === "custom" && (
                      <button
                        onClick={() => deleteCustomWidget(widget.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete widget"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => toggleWidget(widget.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        widget.enabled
                          ? "text-green-600 hover:bg-green-50"
                          : "text-gray-400 hover:bg-gray-100"
                      }`}
                      title={widget.enabled ? "Hide widget" : "Show widget"}
                    >
                      {widget.enabled ? (
                        <FiEye className="w-5 h-5" />
                      ) : (
                        <FiEyeOff className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Create Custom Widget Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 text-gray-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-3"
          >
            <FiPlus className="w-6 h-6" />
            <span className="font-semibold">Create Custom Widget</span>
          </button>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Changes are saved automatically
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
            >
              <FiSave className="w-4 h-4" />
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Create Custom Widget Modal */}
      {showCreateModal && (
        <CreateWidgetModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}

function CreateWidgetModal({ onClose }) {
  const { addCustomWidget } = useDashboard();
  const [widgetName, setWidgetName] = useState("");
  const [widgetType, setWidgetType] = useState("stat");
  const [dataSource, setDataSource] = useState("");
  const [calculation, setCalculation] = useState("sum");

  const handleCreate = () => {
    if (!widgetName.trim()) {
      alert("Please enter a widget name");
      return;
    }

    const newWidget = {
      title: widgetName,
      widgetType: widgetType,
      dataSource: dataSource,
      calculation: calculation,
      config: {
        showIcon: true,
        color: "blue",
      },
    };

    addCustomWidget(newWidget);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">
              Create Custom Widget
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Widget Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Widget Name
            </label>
            <input
              type="text"
              value={widgetName}
              onChange={(e) => setWidgetName(e.target.value)}
              placeholder="e.g., Today's Sales"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Widget Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Widget Type
            </label>
            <select
              value={widgetType}
              onChange={(e) => setWidgetType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="stat">📊 Stat Card</option>
              <option value="chart">📈 Chart</option>
              <option value="table">📋 Table</option>
              <option value="text">📝 Text Display</option>
            </select>
          </div>

          {/* Data Source */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Source
            </label>
            <select
              value={dataSource}
              onChange={(e) => setDataSource(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select data source...</option>
              <option value="sales">Sales</option>
              <option value="products">Products</option>
              <option value="inventory">Inventory</option>
              <option value="returns">Returns</option>
              <option value="giftcards">Gift Cards</option>
            </select>
          </div>

          {/* Calculation Type */}
          {widgetType === "stat" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Calculation
              </label>
              <select
                value={calculation}
                onChange={(e) => setCalculation(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="sum">Sum (Total)</option>
                <option value="count">Count (Number of items)</option>
                <option value="average">Average</option>
                <option value="max">Maximum</option>
                <option value="min">Minimum</option>
              </select>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              💡 <strong>Tip:</strong> Custom widgets will display real-time
              data from your selected source with the chosen calculation method.
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            Create Widget
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomizeDashboard;
