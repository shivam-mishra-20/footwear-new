import React, { createContext, useContext, useState, useEffect } from "react";

const DashboardContext = createContext();

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within DashboardProvider");
  }
  return context;
};

// Default widget configurations
const DEFAULT_WIDGETS = [
  { id: "stock", type: "stat", title: "Total Stock", enabled: true, order: 0 },
  {
    id: "orders",
    type: "stat",
    title: "Total Orders",
    enabled: true,
    order: 1,
  },
  {
    id: "revenue",
    type: "stat",
    title: "Total Revenue",
    enabled: true,
    order: 2,
  },
  { id: "products", type: "stat", title: "Products", enabled: true, order: 3 },
  {
    id: "revenueChart",
    type: "chart",
    title: "Revenue Trend",
    enabled: true,
    order: 4,
  },
  {
    id: "topProducts",
    type: "table",
    title: "Top Products",
    enabled: true,
    order: 5,
  },
  {
    id: "recentInvoices",
    type: "table",
    title: "Recent Invoices",
    enabled: true,
    order: 6,
  },
];

export const DashboardProvider = ({ children }) => {
  const [widgets, setWidgets] = useState(() => {
    const saved = localStorage.getItem("dashboardWidgets");
    return saved ? JSON.parse(saved) : DEFAULT_WIDGETS;
  });

  const [customWidgets, setCustomWidgets] = useState(() => {
    const saved = localStorage.getItem("customDashboardWidgets");
    return saved ? JSON.parse(saved) : [];
  });

  const [isCustomizing, setIsCustomizing] = useState(false);

  useEffect(() => {
    localStorage.setItem("dashboardWidgets", JSON.stringify(widgets));
  }, [widgets]);

  useEffect(() => {
    localStorage.setItem(
      "customDashboardWidgets",
      JSON.stringify(customWidgets)
    );
  }, [customWidgets]);

  const toggleWidget = (widgetId) => {
    // Check if it's a custom widget
    const isCustom = widgetId.startsWith("custom-");

    if (isCustom) {
      setCustomWidgets((prev) =>
        prev.map((w) => (w.id === widgetId ? { ...w, enabled: !w.enabled } : w))
      );
    } else {
      setWidgets((prev) =>
        prev.map((w) => (w.id === widgetId ? { ...w, enabled: !w.enabled } : w))
      );
    }
  };

  const reorderWidgets = (newOrder) => {
    // Split into default and custom widgets
    const defaultWidgets = newOrder.filter((w) => !w.id.startsWith("custom-"));
    const customs = newOrder.filter((w) => w.id.startsWith("custom-"));

    setWidgets(defaultWidgets);
    setCustomWidgets(customs);
  };

  const addCustomWidget = (widget) => {
    const newWidget = {
      ...widget,
      id: `custom-${Date.now()}`,
      type: "custom",
      enabled: true,
      order: widgets.length + customWidgets.length,
    };
    setCustomWidgets((prev) => [...prev, newWidget]);
    return newWidget;
  };

  const updateCustomWidget = (widgetId, updates) => {
    setCustomWidgets((prev) =>
      prev.map((w) => (w.id === widgetId ? { ...w, ...updates } : w))
    );
  };

  const deleteCustomWidget = (widgetId) => {
    setCustomWidgets((prev) => prev.filter((w) => w.id !== widgetId));
  };

  const resetToDefaults = () => {
    setWidgets(DEFAULT_WIDGETS);
    setCustomWidgets([]);
  };

  const getAllWidgets = () => {
    return [...widgets, ...customWidgets].sort((a, b) => a.order - b.order);
  };

  return (
    <DashboardContext.Provider
      value={{
        widgets,
        customWidgets,
        isCustomizing,
        setIsCustomizing,
        toggleWidget,
        reorderWidgets,
        addCustomWidget,
        updateCustomWidget,
        deleteCustomWidget,
        resetToDefaults,
        getAllWidgets,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};
