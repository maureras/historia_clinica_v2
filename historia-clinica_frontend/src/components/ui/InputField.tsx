import React from "react";

export interface InputFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string | React.ReactNode;
  className?: string;
  containerClassName?: string;
  /** Icono a la izquierda del input (por ej. Search de lucide-react) */
  icon?: React.ComponentType<{ className?: string }>;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  icon: Icon,
  className = "",
  containerClassName = "",
  ...props
}) => {
  return (
    <div className={`flex flex-col gap-1 ${containerClassName}`}>
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        )}
        <input
          {...props}
          className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
            Icon ? "pl-8" : ""
          } ${className}`}
        />
      </div>
    </div>
  );
};