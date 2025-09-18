import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import clsx from "clsx";

export const Avatar = AvatarPrimitive.Root;
export const AvatarFallback: React.FC<
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
> = ({ className, ...props }) => (
  <AvatarPrimitive.Fallback
    className={clsx(
      "flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium",
      className
    )}
    {...props}
  />
);
export const AvatarImage: React.FC<
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
> = ({ className, ...props }) => (
  <AvatarPrimitive.Image
    className={clsx("h-8 w-8 rounded-full object-cover", className)}
    {...props}
  />
);
