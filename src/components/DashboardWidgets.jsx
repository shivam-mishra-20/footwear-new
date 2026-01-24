import React from "react";
import { BiBox, BiShoppingBag, BiRupee, BiPackage } from "react-icons/bi";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

// Reusable Widget Components for Custom Dashboard

export function StatWidget({
  title,
  value,
  icon: Icon,
  color = "blue",
  onClick,
}) {
  const colorClasses = {
    blue: {
      bg: "bg-white",
      text: "text-blue-600",
      iconBg: "bg-blue-100",
    },
    green: {
      bg: "bg-white",
      text: "text-green-600",
      iconBg: "bg-green-100",
    },
    purple: {
      bg: "bg-white",
      text: "text-purple-600",
      iconBg: "bg-purple-100",
    },
    orange: {
      bg: "bg-white",
      text: "text-orange-600",
      iconBg: "bg-orange-100",
    },
  };

  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <div
      onClick={onClick}
      className={`${
        colors.bg
      } rounded-2xl p-6 shadow-lg border border-gray-100 transition-all duration-200 hover:shadow-xl hover:scale-[1.02] ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className={`text-sm font-medium ${colors.text} mb-2`}>{title}</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">
            {typeof value === "number" &&
            title.toLowerCase().includes("revenue")
              ? `₹${value.toLocaleString()}`
              : typeof value === "number"
              ? value.toLocaleString()
              : value}
          </p>
        </div>
        <div className={`p-4 rounded-xl ${colors.iconBg} ${colors.text}`}>
          {Icon && <Icon className="w-8 h-8" />}
        </div>
      </div>
    </div>
  );
}

export function ChartWidget({ title, data, color = "blue" }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: "#6b7280" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color === "blue" ? "#3b82f6" : "#10b981"}
            strokeWidth={3}
            dot={{ fill: color === "blue" ? "#3b82f6" : "#10b981", r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TableWidget({ title, columns, data, onRowClick }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-8 text-center text-gray-500"
                >
                  No data available
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`${
                    onRowClick
                      ? "cursor-pointer hover:bg-blue-50"
                      : "hover:bg-gray-50"
                  } transition-colors`}
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={colIdx}
                      className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap"
                    >
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CustomStatWidget({ config, value }) {
  const { title, color = "blue", icon } = config;

  const getIcon = () => {
    switch (icon) {
      case "box":
        return BiBox;
      case "shopping":
        return BiShoppingBag;
      case "rupee":
        return BiRupee;
      case "package":
        return BiPackage;
      default:
        return BiBox;
    }
  };

  const Icon = getIcon();

  return <StatWidget title={title} value={value} icon={Icon} color={color} />;
}

export function EmptyWidget({ message = "No data available" }) {
  return (
    <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center">
      <div className="text-gray-400 mb-2">
        <BiPackage className="w-12 h-12 mx-auto" />
      </div>
      <p className="text-gray-600 font-medium">{message}</p>
      <p className="text-sm text-gray-500 mt-1">
        Configure this widget to display data
      </p>
    </div>
  );
}
