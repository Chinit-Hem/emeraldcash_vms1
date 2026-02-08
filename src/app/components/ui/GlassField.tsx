"use client";

import React, { forwardRef } from "react";

interface GlassFieldProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLSelectElement> {
  label: string;
  error?: string;
  required?: boolean;
  helperText?: string;
  as?: "input" | "select" | "textarea";
  children?: React.ReactNode; // For select options
}

export const GlassField = forwardRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, GlassFieldProps>(
  ({ label, error, required, helperText, as = "input", children, className = "", id, ...props }, ref) => {
    const fieldId = id || `field-${label.toLowerCase().replace(/\s+/g, "-")}`;
    const errorId = error ? `${fieldId}-error` : undefined;
    const helperId = helperText ? `${fieldId}-helper` : undefined;

    const baseInputStyles = `
      w-full h-11 px-4
      bg-white/5 dark:bg-white/5
      border border-white/20 dark:border-white/20
      shadow-inner
      rounded-xl
      text-gray-900 dark:text-white
      placeholder:text-gray-400 dark:placeholder:text-gray-500
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400/60
      disabled:opacity-50 disabled:cursor-not-allowed
    `;

    const errorStyles = error
      ? "border-red-400/60 ring-2 ring-red-400/40 bg-red-500/5 dark:bg-red-500/5"
      : "";

    const inputStyles = `${baseInputStyles} ${errorStyles} ${className}`;

    return (
      <div className="w-full">
        <label
          htmlFor={fieldId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>

        {as === "select" ? (
          <select
            ref={ref as React.Ref<HTMLSelectElement>}
            id={fieldId}
            className={`${inputStyles} appearance-none cursor-pointer`}
            aria-invalid={!!error}
            aria-describedby={errorId || helperId}
            {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}
          >
            {children}
          </select>
        ) : as === "textarea" ? (
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            id={fieldId}
            className={`${inputStyles} h-auto min-h-[88px] py-3 resize-y`}
            aria-invalid={!!error}
            aria-describedby={errorId || helperId}
            {...(props as unknown as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}

          />
        ) : (
          <input
            ref={ref as React.Ref<HTMLInputElement>}
            id={fieldId}
            className={inputStyles}
            aria-invalid={!!error}
            aria-describedby={errorId || helperId}
            {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
          />
        )}

        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </p>
        )}

        {helperText && !error && (
          <p id={helperId} className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

GlassField.displayName = "GlassField";
