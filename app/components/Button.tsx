"use client";

import type { CSSProperties, ReactNode } from "react";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  style?: CSSProperties;
  className?: string;
  children: ReactNode;
}

export default function Button({
  variant = "primary",
  size = "lg",
  fullWidth,
  disabled,
  onClick,
  type = "button",
  style,
  className = "",
  children,
}: ButtonProps) {
  const cls = [
    styles.btn,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={cls}
      disabled={disabled}
      onClick={onClick}
      style={style}
    >
      {children}
    </button>
  );
}
