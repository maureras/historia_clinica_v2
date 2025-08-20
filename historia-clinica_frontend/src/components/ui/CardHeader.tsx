import React from "react";

export const CardHeader: React.FC<{
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}> = ({ title, icon: Icon }) => (
  <div className="p-6 border-b border-slate-200 flex items-center gap-4">
    <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg shadow">
      <Icon className="w-6 h-6 text-white" />
    </div>
    <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
  </div>
);