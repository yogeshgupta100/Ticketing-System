import React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { cn } from "../../utils/cn";

interface FormProps {
  onSubmit: (data: any) => void;
  children: React.ReactNode;
  defaultValues?: any;
  className?: string;
}

export function Form({
  onSubmit,
  children,
  defaultValues,
  className,
}: FormProps) {
  const methods = useForm({
    defaultValues,
  });

  const handleSubmit = methods.handleSubmit(onSubmit);

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit} className={cn("space-y-6", className)}>
        {children}
      </form>
    </FormProvider>
  );
}

interface InputFieldProps {
  name: string;
  label: string;
  type?: "text" | "email" | "password" | "number" | "tel" | "url";
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  helperText?: string;
  error?: string;
}

export const InputField: React.FC<InputFieldProps> = ({
  name,
  label,
  type = "text",
  placeholder,
  required = false,
  disabled = false,
  className,
  helperText,
  error,
}) => {
  const {
    register,
    formState: { errors },
  } = useForm();
  const fieldError = (errors[name]?.message as string) || error;

  return (
    <div className="space-y-2">
      <label
        htmlFor={name}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <input
        {...register(name)}
        type={type}
        id={name}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400",
          fieldError
            ? "border-red-500"
            : "border-gray-300 dark:border-gray-600",
          disabled && "bg-gray-100 dark:bg-gray-700 cursor-not-allowed",
          className
        )}
        aria-invalid={fieldError ? "true" : "false"}
        aria-describedby={
          fieldError
            ? `${name}-error`
            : helperText
            ? `${name}-helper`
            : undefined
        }
      />

      {helperText && !fieldError && (
        <p
          id={`${name}-helper`}
          className="text-sm text-gray-500 dark:text-gray-400"
        >
          {helperText}
        </p>
      )}

      {fieldError && (
        <p
          id={`${name}-error`}
          className="text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          {fieldError}
        </p>
      )}
    </div>
  );
};

interface TextareaFieldProps {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  rows?: number;
  maxLength?: number;
  className?: string;
  helperText?: string;
  error?: string;
}

export const TextareaField: React.FC<TextareaFieldProps> = ({
  name,
  label,
  placeholder,
  required = false,
  disabled = false,
  rows = 4,
  maxLength,
  className,
  helperText,
  error,
}) => {
  const {
    register,
    formState: { errors },
  } = useForm();
  const fieldError = (errors[name]?.message as string) || error;

  return (
    <div className="space-y-2">
      <label
        htmlFor={name}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <textarea
        {...register(name)}
        id={name}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        maxLength={maxLength}
        className={cn(
          "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-vertical bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400",
          fieldError
            ? "border-red-500"
            : "border-gray-300 dark:border-gray-600",
          disabled && "bg-gray-100 dark:bg-gray-700 cursor-not-allowed",
          className
        )}
        aria-invalid={fieldError ? "true" : "false"}
        aria-describedby={
          fieldError
            ? `${name}-error`
            : helperText
            ? `${name}-helper`
            : undefined
        }
      />

      {helperText && !fieldError && (
        <p
          id={`${name}-helper`}
          className="text-sm text-gray-500 dark:text-gray-400"
        >
          {helperText}
        </p>
      )}

      {fieldError && (
        <p
          id={`${name}-error`}
          className="text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          {fieldError}
        </p>
      )}
    </div>
  );
};

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectFieldProps {
  name: string;
  label: string;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  helperText?: string;
  error?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  name,
  label,
  options,
  placeholder = "Select an option",
  required = false,
  disabled = false,
  className,
  helperText,
  error,
}) => {
  const {
    register,
    formState: { errors },
  } = useForm();
  const fieldError = (errors[name]?.message as string) || error;

  return (
    <div className="space-y-2">
      <label
        htmlFor={name}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <select
        {...register(name)}
        id={name}
        disabled={disabled}
        className={cn(
          "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
          fieldError
            ? "border-red-500"
            : "border-gray-300 dark:border-gray-600",
          disabled && "bg-gray-100 dark:bg-gray-700 cursor-not-allowed",
          className
        )}
        aria-invalid={fieldError ? "true" : "false"}
        aria-describedby={
          fieldError
            ? `${name}-error`
            : helperText
            ? `${name}-helper`
            : undefined
        }
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>

      {helperText && !fieldError && (
        <p
          id={`${name}-helper`}
          className="text-sm text-gray-500 dark:text-gray-400"
        >
          {helperText}
        </p>
      )}

      {fieldError && (
        <p
          id={`${name}-error`}
          className="text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          {fieldError}
        </p>
      )}
    </div>
  );
};

interface SubmitButtonProps {
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  variant?: "primary" | "secondary" | "danger";
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({
  children,
  loading = false,
  disabled = false,
  className,
  variant = "primary",
}) => {
  const variantClasses = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "bg-gray-600 hover:bg-gray-700 text-white",
    danger: "bg-red-600 hover:bg-red-700 text-white",
  };

  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className={cn(
        "px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
        variantClasses[variant],
        (disabled || loading) && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {loading ? (
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
};
