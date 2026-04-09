import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "approve" | "reject" | "info" | "ghost" | "outline";
  size?: "sm" | "md";
}

export default function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  const variants: Record<string, string> = {
    primary: "bg-acca-yellow text-gray-900 hover:bg-acca-yellow-hover",
    approve: "bg-green-700 text-white hover:bg-green-800",
    reject: "bg-red-600 text-white hover:bg-red-700",
    info: "bg-gray-800 text-white hover:bg-gray-900",
    ghost: "bg-transparent text-gray-600 hover:bg-sage-100",
    outline:
      "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
  };

  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}
