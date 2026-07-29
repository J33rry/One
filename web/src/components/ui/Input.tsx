"use client";

import React from "react";
import clsx from "clsx";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-muted">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 text-faint pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={clsx(
              "w-full bg-surface-2 border border-border text-fg placeholder-faint text-sm rounded-lg px-3.5 py-2.5 transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              error && "border-danger/60 focus:border-danger focus:ring-danger/20",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 text-faint flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-danger mt-1">{error}</p>}
        {helperText && !error && <p className="text-xs text-faint mt-1">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className, id, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={textareaId} className="block font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-muted">
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          className={clsx(
            "w-full bg-surface-2 border border-border text-fg placeholder-faint text-sm rounded-lg px-3.5 py-2.5 transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 resize-none",
            error && "border-danger/60 focus:border-danger focus:ring-danger/20",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-danger mt-1">{error}</p>}
        {helperText && !error && <p className="text-xs text-faint mt-1">{helperText}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
