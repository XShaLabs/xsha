import { cn } from "@/lib/utils";

export function PageContent({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-1 flex-col gap-4 px-6 py-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function PageSection({
  children,
  className,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      className={cn("flex flex-col gap-4", className)}
      {...props}
    >
      {children}
    </section>
  );
}

export function PageGrid({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3", className)}
      {...props}
    >
      {children}
    </div>
  );
}
