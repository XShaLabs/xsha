import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Fragment } from "react";
import { Link } from "react-router-dom";

interface NavBreadcrumbProps {
  items: (
    | {
        type: "link";
        label: string;
        href: string;
      }
    | {
        type: "page";
        label: string;
      }
  )[];
}

export function NavBreadcrumb({ items }: NavBreadcrumbProps) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, i) => (
          <Fragment key={i}>
            <BreadcrumbItem>
              {item.type === "link" ? (
                <BreadcrumbLink className="hidden md:block" asChild>
                  <Link to={item.href}>{item.label}</Link>
                </BreadcrumbLink>
              ) : null}
              {item.type === "page" ? (
                <BreadcrumbPage className="hidden md:block max-w-[120px] truncate lg:max-w-[200px]">
                  {item.label}
                </BreadcrumbPage>
              ) : null}
            </BreadcrumbItem>
            {i < items.length - 1 && (
              <BreadcrumbSeparator className="hidden md:block" />
            )}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
