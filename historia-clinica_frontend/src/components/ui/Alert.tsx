import React from "react";
import { AlertCircle, CheckCircle, AlertTriangle as AlertTriangleIcon, Info } from "lucide-react";

export type AlertType = "error" | "success" | "warning" | "info";

export interface AlertProps {
  type: AlertType;
  children: React.ReactNode;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({ type, children, className = "" }) => {
  const styles = {
    error: "bg-red-50 border-red-200 text-red-800",
    success: "bg-green-50 border-green-200 text-green-800",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
  };
  const Icon = { error: AlertCircle, success: CheckCircle, warning: AlertTriangleIcon, info: Info }[type];

  return (
    <div className={`p-4 mb-4 rounded-lg border text-sm flex items-start gap-3 ${styles[type]} ${className}`}>
      <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
      <div className="flex-1">{children}</div>
    </div>
  );
};