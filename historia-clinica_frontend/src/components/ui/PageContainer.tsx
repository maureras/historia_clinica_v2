import React from "react";

export const PageContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-slate-50 p-4 font-sans">{children}</div>
);