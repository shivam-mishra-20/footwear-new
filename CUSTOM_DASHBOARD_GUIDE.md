# 🎨 Custom Dashboard Feature - Complete Guide

## Overview

You now have a fully customizable dashboard with drag-and-drop widgets, the ability to create custom data cards, and full control over what you see!

## 🚀 Features

### ✅ Pre-built Widgets

- **Total Stock** - View current inventory levels
- **Total Orders** - Track sales transactions
- **Total Revenue** - Monitor income
- **Products** - Count of products sold
- **Revenue Trend Chart** - 30-day revenue visualization
- **Top Products Table** - Best-selling items
- **Recent Invoices Table** - Latest transactions

### ✅ Widget Controls

- **Toggle Visibility** - Show/hide any widget with eye icon 👁️
- **Drag & Drop Reordering** - Rearrange widgets by dragging
- **Delete Custom Widgets** - Remove widgets you created
- **Reset to Defaults** - Restore original dashboard layout

### ✅ Custom Widget Creator

- **Stat Cards** - Create custom metric displays
- **Charts** - Build custom visualizations
- **Tables** - Display custom data tables
- **Text Displays** - Add informational text blocks

### ✅ Auto-Save

- All changes saved automatically to browser localStorage
- Persists across sessions
- No manual save button needed

## 📖 How to Use

### Accessing Customization Mode

1. Click the **"Customize Dashboard"** button (blue button with gear icon) in the top-right corner of your Dashboard
2. The customization panel will open

### Managing Existing Widgets

#### Toggle Widget Visibility

- Click the **eye icon** (👁️) to hide a widget
- Click again to show it (eye with slash means hidden)
- Hidden widgets won't appear on your dashboard

#### Reorder Widgets

1. **Click and hold** on any widget card in the customization panel
2. **Drag** it to your desired position
3. **Release** to drop it in the new position
4. The dashboard will automatically update with the new order

#### Delete Custom Widgets

- Click the **trash icon** (🗑️) next to custom widgets you created
- Confirmation ensures you don't accidentally delete
- Note: Pre-built widgets cannot be deleted, only hidden

#### Reset Everything

- Click **"Reset to Default"** button at the top of the widget list
- This restores the original dashboard configuration
- All custom widgets will be removed

### Creating Custom Widgets

#### Step 1: Open Creator

- Click the **"Create Custom Widget"** button at the bottom of the customization panel
- A modal will appear with configuration options

#### Step 2: Configure Widget

**Widget Name**

- Enter a descriptive name (e.g., "Today's Sales", "Low Stock Items")
- This appears as the widget title on your dashboard

**Widget Type**
Choose from 4 types:

- **📊 Stat Card** - Single number metric (like total stock)
- **📈 Chart** - Line graph visualization
- **📋 Table** - Data in rows and columns
- **📝 Text Display** - Static text or information

**Data Source**
Select where the data comes from:

- **Sales** - Transaction data
- **Products** - Product information
- **Inventory** - Stock levels
- **Returns** - Return/refund data
- **Gift Cards** - Voucher information

**Calculation** (for Stat Cards)

- **Sum** - Add all values together
- **Count** - Number of items
- **Average** - Mean value
- **Maximum** - Highest value
- **Minimum** - Lowest value

#### Step 3: Create

- Click **"Create Widget"** to add it to your dashboard
- The new widget appears at the bottom of your widget list
- You can immediately drag it to reorder

### Tips & Best Practices

1. **Start Simple**: Hide widgets you don't need before creating custom ones
2. **Group Related Widgets**: Place related metrics near each other
3. **Test Order**: Drag widgets around to find the best layout
4. **Use Custom Widgets**: Create specific metrics important to your business
5. **Regular Resets**: If dashboard feels cluttered, reset and start fresh

## 🏗️ Technical Details

### Architecture

**DashboardContext** (`src/context/DashboardContext.jsx`)

- Global state management for widgets
- Handles save/load from localStorage
- Provides methods for widget operations

**CustomizeDashboard Component** (`src/Pages/CustomizeDashboard.jsx`)

- Main customization interface
- Drag-and-drop functionality
- Widget creator modal

**DashboardWidgets** (`src/components/DashboardWidgets.jsx`)

- Reusable widget components
- Consistent styling across all widgets
- Flexible configuration options

### Data Persistence

```javascript
// Widgets saved to localStorage
localStorage.setItem("dashboardWidgets", JSON.stringify(widgets));
localStorage.setItem("customDashboardWidgets", JSON.stringify(customWidgets));
```

Automatically saves:

- Widget visibility states
- Widget order
- Custom widget configurations
- All changes in real-time

### Widget Structure

```javascript
{
  id: "unique-id",
  type: "stat" | "chart" | "table" | "custom",
  title: "Widget Title",
  enabled: true,
  order: 0,
  config: {
    // Custom configuration options
  }
}
```

## 🎯 Use Cases

### For Store Managers

1. **Focus on Sales**: Hide inventory widgets, show only sales and revenue
2. **Quick Overview**: Keep only stat cards visible for at-a-glance metrics
3. **Custom Metrics**: Create "Today's Revenue" or "This Week's Sales" widgets

### For Inventory Managers

1. **Stock Focus**: Prioritize inventory and stock-related widgets
2. **Low Stock Alerts**: Keep low stock widgets at the top
3. **Product Performance**: Show top products and inventory tables

### For Owners

1. **Complete View**: Enable all pre-built widgets
2. **Financial Focus**: Prioritize revenue and sales widgets
3. **Custom Reports**: Create custom widgets for specific KPIs

## 🔧 Customization API

### Available Methods (via useDashboard hook)

```javascript
const {
  widgets, // Array of default widgets
  customWidgets, // Array of custom widgets
  isCustomizing, // Boolean: customization mode active
  setIsCustomizing, // Toggle customization mode
  toggleWidget, // Show/hide widget by ID
  reorderWidgets, // Update widget order
  addCustomWidget, // Create new custom widget
  updateCustomWidget, // Modify existing custom widget
  deleteCustomWidget, // Remove custom widget
  resetToDefaults, // Restore default configuration
  getAllWidgets, // Get combined sorted widget list
} = useDashboard();
```

### Creating Custom Widgets Programmatically

```javascript
const newWidget = {
  title: "My Custom Metric",
  widgetType: "stat",
  dataSource: "sales",
  calculation: "sum",
  config: {
    showIcon: true,
    color: "blue",
  },
};

addCustomWidget(newWidget);
```

## 🎨 Styling & Theming

All widgets use consistent Tailwind CSS classes:

- Cards: `bg-white rounded-2xl shadow-lg`
- Borders: `border border-gray-100`
- Hover effects: `hover:shadow-xl hover:scale-[1.02]`

Color schemes available:

- **Blue** - Primary/default
- **Green** - Success/positive
- **Purple** - Special/featured
- **Orange** - Warning/attention

## 🚀 Future Enhancements

Planned features:

- [ ] Export/import dashboard configurations
- [ ] Share dashboard layouts with team
- [ ] More widget types (gauges, progress bars, etc.)
- [ ] Advanced filtering for custom widgets
- [ ] Time-based widget visibility (show only during business hours)
- [ ] Widget templates library
- [ ] Collaborative dashboard editing
- [ ] Mobile-optimized layouts

## 📝 Keyboard Shortcuts

- **Esc** - Close customization panel
- **Ctrl/Cmd + S** - Quick save (auto-saves anyway)
- **Ctrl/Cmd + R** - Reset to defaults (with confirmation)

## ❓ FAQ

**Q: Will my customizations sync across devices?**
A: Currently stored in browser localStorage. Same device only. Cloud sync coming soon!

**Q: Can I export my dashboard layout?**
A: Not yet, but this feature is planned for a future update.

**Q: How many custom widgets can I create?**
A: No limit! But we recommend keeping it under 20 for performance.

**Q: Can I customize widget colors?**
A: Custom colors are in the custom widget creator. More options coming soon!

**Q: What happens if I clear my browser data?**
A: Dashboard resets to defaults. Export feature will solve this in future.

## 🐛 Troubleshooting

**Widgets not saving?**

- Check browser localStorage is enabled
- Try clearing cache and reloading
- Check browser console for errors

**Drag and drop not working?**

- Ensure you're clicking and holding the widget card
- Try refreshing the page
- Check if browser supports HTML5 drag API

**Custom widgets not showing data?**

- Verify data source is configured correctly
- Check if there's data in the selected collection
- Review browser console for errors

## 📞 Support

For issues or feature requests:

1. Check this guide first
2. Review the browser console for errors
3. Document the issue with screenshots
4. Contact your development team

---

**Version**: 1.0.0  
**Last Updated**: January 3, 2026  
**Status**: ✅ Production Ready
