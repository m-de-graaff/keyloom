import * as React from "react";
import clsx from "clsx";

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "primary" | "success" | "warning" | "danger";
};
export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const styles = {
    default: "bg-muted text-foreground",
    primary: "bg-primary text-primary-foreground",
    success: "bg-success text-white",
    warning: "bg-warning text-black",
    danger: "bg-danger text-white",
  }[variant];
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        styles,
        className
      )}
      {...props}
    />
  );
}
