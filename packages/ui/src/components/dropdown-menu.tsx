"use client";
import * as React from "react";
import * as DM from "@radix-ui/react-dropdown-menu";
import clsx from "clsx";

export const DropdownMenu = DM.Root;
export const DropdownMenuTrigger = DM.Trigger;
export const DropdownMenuPortal = DM.Portal;
export const DropdownMenuGroup = DM.Group;
export const DropdownMenuLabel = DM.Label;
export const DropdownMenuSeparator = (props: any) => (
  <DM.Separator className="-mx-1 my-1 h-px bg-muted" {...props} />
);
export const DropdownMenuContent: React.FC<
  React.ComponentPropsWithoutRef<typeof DM.Content>
> = ({ className, ...props }) => (
  <DM.Portal>
    <DM.Content
      className={clsx(
        "z-[1200] min-w-[10rem] overflow-hidden rounded-md border bg-background p-1 shadow-md",
        className
      )}
      {...props}
    />
  </DM.Portal>
);
export const DropdownMenuItem: React.FC<
  React.ComponentPropsWithoutRef<typeof DM.Item>
> = ({ className, ...props }) => (
  <DM.Item
    className={clsx(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-muted/60 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  />
);
