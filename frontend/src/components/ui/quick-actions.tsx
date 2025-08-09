"use client";

import * as React from "react";
import { useState, useTransition } from "react";

import { MoreHorizontal, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DropdownMenuContentProps } from "@radix-ui/react-dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface QuickActionsProps extends React.ComponentProps<typeof Button> {
  align?: DropdownMenuContentProps["align"];
  side?: DropdownMenuContentProps["side"];
  actions?: {
    id: string;
    label: string;
    icon: LucideIcon;
    variant?: "default" | "destructive";
    onClick?: () => Promise<void> | void;
  }[];
  deleteAction?: {
    title: string;
    /**
     * If set, an input field will require the user input to validate deletion
     */
    confirmationValue?: string;
    submitAction?: () => Promise<void>;
  };
}

export function QuickActions({
  align = "end",
  side,
  className,
  actions,
  deleteAction,
  children,
  ...props
}: QuickActionsProps) {
  const [value, setValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    const submitAction = deleteAction?.submitAction;
    if (!submitAction) return;

    try {
      startTransition(async () => {
        try {
          await submitAction();
          toast.success("Deleted successfully");
          setOpen(false);
          setValue(""); // Reset input value
        } catch (error) {
          console.error("Failed to delete:", error);
          
          // Extract error message
          let errorMessage = "Failed to delete";
          if (error instanceof Error) {
            errorMessage = error.message;
          } else if (typeof error === "string") {
            errorMessage = error;
          } else if (error && typeof error === "object" && "message" in error) {
            errorMessage = String(error.message);
          }
          
          toast.error(errorMessage);
          
          // Keep dialog open on error so user can retry
          // setOpen(false); // Don't close on error
        }
      });
    } catch (error) {
      // This catch handles any synchronous errors
      console.error("Synchronous error in delete:", error);
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {children ?? (
            <Button
              variant="ghost"
              className={className ?? "h-7 w-7 data-[state=open]:bg-accent"}
              {...props}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} side={side} className="w-36">
          {actions && actions.length > 0 && (
            <DropdownMenuGroup>
              {actions
                .filter((item) => item.id !== "delete")
                .map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      item.onClick?.();
                    }}
                    className={item.variant === "destructive" ? "text-destructive" : ""}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    <span>{item.label}</span>
                  </DropdownMenuItem>
                ))}
            </DropdownMenuGroup>
          )}
          {deleteAction && (
            <>
              {/* Add a separator only if actions exist */}
              {actions && actions.length > 0 ? <DropdownMenuSeparator /> : null}
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </AlertDialogTrigger>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {deleteAction && (
        <AlertDialogContent
          onCloseAutoFocus={(event) => {
            // Bug fix: prevent body becoming unclickable after closing
            event.preventDefault();
            document.body.style.pointerEvents = "";
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure about deleting `{deleteAction.title}`?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the entry
              from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteAction.confirmationValue ? (
            <form id="form-alert-dialog" className="space-y-0.5">
              <p className="text-muted-foreground text-xs">
                Please write &apos;
                <span className="font-semibold">
                  {deleteAction.confirmationValue}
                </span>
                &apos; to confirm
              </p>
              <Input 
                value={value} 
                onChange={(e) => setValue(e.target.value)}
                placeholder={deleteAction.confirmationValue}
              />
            </form>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={(e) => {
                e.stopPropagation();
                setValue(""); // Reset input value on cancel
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white shadow-sm hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60"
              disabled={
                (deleteAction.confirmationValue &&
                  value !== deleteAction.confirmationValue) ||
                isPending
              }
              form="form-alert-dialog"
              type="submit"
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
            >
              {isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  );
}
