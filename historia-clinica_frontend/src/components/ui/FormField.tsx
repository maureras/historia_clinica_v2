import React from "react";

export interface FormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  value,
  onChange,
  multiline = false,
  rows = 3,
  placeholder = "",
  className = "",
}) => (
  <div className={className}>
    <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>
    {multiline ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all outline-none bg-slate-50"
      />
    ) : (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all outline-none bg-slate-50"
      />
    )}
  </div>
);