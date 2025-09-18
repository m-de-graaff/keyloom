import * as React from "react";
import clsx from "clsx";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50";
    const sizes = {
      sm: "h-8 px-3 text-sm",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-base",
    }[size];
    const variants = {
      default: "bg-muted text-foreground hover:opacity-90",
      primary: "bg-primary text-primary-foreground hover:opacity-90",
      ghost: "bg-transparent hover:bg-muted",
      outline: "border border-border hover:bg-muted",
      danger: "bg-danger text-white hover:opacity-90",
    }[variant];
    return (
      <button
        ref={ref}
        className={clsx(base, sizes, variants, className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
