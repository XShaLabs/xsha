import { cn } from "@/lib/utils";

export function PageHeader({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-2 px-6 py-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function PageHeaderHeading({
  children,
  className,
  ...props
}: React.ComponentProps<"h1">) {
  return (
    <h1
      className={cn("text-2xl font-semibold text-foreground", className)}
      {...props}
    >
      {children}
    </h1>
  );
}

export function PageHeaderDescription({
  children,
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    >
      {children}
    </p>
  );
}

export function PageHeaderActions({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center gap-2", className)}
      {...props}
    >
      {children}
    </div>
  );
}
