import React from "react";
import { useFormContext } from "react-hook-form";
import { cn } from "../../utils/cn";

interface FormFieldProps {
  name: string;
  label: string;
  type?: "text" | "email" | "password" | "textarea" | "select";
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
  className?: string;
  disabled?: boolean;
  rows?: number;
}

export const FormField: React.FC<FormFieldProps> = ({
  name,
  label,
  type = "text",
  placeholder,
  options = [],
  required = false,
  className,
  disabled = false,
  rows = 3,
}) => {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  const error = errors[name];

  const renderField = () => {
    switch (type) {
      case "textarea":
        return (
          <textarea
            {...register(name)}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            className={cn(
              "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400",
              error ? "border-red-500" : "border-gray-300 dark:border-gray-600",
              disabled && "bg-gray-100 dark:bg-gray-700 cursor-not-allowed",
              className
            )}
          />
        );

      case "select":
        return (
          <select
            {...register(name)}
            disabled={disabled}
            className={cn(
              "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
              error ? "border-red-500" : "border-gray-300 dark:border-gray-600",
              disabled && "bg-gray-100 dark:bg-gray-700 cursor-not-allowed",
              className
            )}
          >
            <option value="">Select {label}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <input
            {...register(name)}
            type={type}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400",
              error ? "border-red-500" : "border-gray-300 dark:border-gray-600",
              disabled && "bg-gray-100 dark:bg-gray-700 cursor-not-allowed",
              className
            )}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <label
        htmlFor={name}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {renderField()}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error.message as string}
        </p>
      )}
    </div>
  );
};
