import * as React from "react";
import clsx from "clsx";

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {}
export function Label({ className, ...props }: LabelProps) {
  return (
    <label
      className={clsx(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    />
  );
}
