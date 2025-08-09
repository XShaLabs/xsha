import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type {
  ColumnDef,
  ColumnFiltersState,
  Row,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";

// Extend the ColumnMeta interface to include custom className properties
declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    headerClassName?: string;
    cellClassName?: string;
  }
}
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Fragment } from "react";
import type { DataTableActionBarProps } from "./data-table-action-bar";
import type { DataTablePaginationProps } from "./data-table-pagination";
import type { DataTableToolbarProps } from "./data-table-toolbar";

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  rowComponent?: React.ReactNode;
  toolbarComponent?: React.ComponentType<DataTableToolbarProps<TData>>;
  actionBar?: React.ComponentType<DataTableActionBarProps<TData>>;
  paginationComponent?: React.ComponentType<DataTablePaginationProps<TData>>;
  onRowClick?: (row: Row<TData>) => void;
  defaultSorting?: SortingState;
  defaultColumnVisibility?: VisibilityState;
  defaultColumnFilters?: ColumnFiltersState;
  loading?: boolean;

  /** access the state from the parent component */
  columnFilters?: ColumnFiltersState;
  setColumnFilters?: React.Dispatch<React.SetStateAction<ColumnFiltersState>>;
  sorting?: SortingState;
  setSorting?: React.Dispatch<React.SetStateAction<SortingState>>;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  rowComponent,
  toolbarComponent,
  actionBar,
  paginationComponent,
  onRowClick,
  defaultSorting = [],
  defaultColumnVisibility = {},
  defaultColumnFilters = [],
  loading = false,
  columnFilters,
  setColumnFilters,
  sorting,
  setSorting,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(defaultColumnVisibility);
  const [internalColumnFilters, setInternalColumnFilters] =
    React.useState<ColumnFiltersState>(defaultColumnFilters);
  const [internalSorting, setInternalSorting] =
    React.useState<SortingState>(defaultSorting);

  // Use controlled or uncontrolled column filters
  const columnFiltersState = columnFilters ?? internalColumnFilters;
  const setColumnFiltersState = setColumnFilters ?? setInternalColumnFilters;
  const sortingState = sorting ?? internalSorting;
  const setSortingState = setSorting ?? setInternalSorting;

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting: sortingState,
      columnVisibility,
      rowSelection,
      columnFilters: columnFiltersState,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSortingState,
    onColumnFiltersChange: setColumnFiltersState,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getExpandedRowModel: getExpandedRowModel(),
    // @ts-expect-error as we have an id in the data
    getRowCanExpand: (row) => Boolean(row.original.id),
  });

  return (
    <div className="grid gap-2">
      {toolbarComponent
        ? React.createElement(toolbarComponent, { table })
        : null}
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className={header.column.columnDef.meta?.headerClassName}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading ? (
            // Show skeleton rows when loading
            Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={`skeleton-${index}`}>
                {columns.map((_, columnIndex) => (
                  <TableCell key={`skeleton-cell-${index}-${columnIndex}`}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <Fragment key={row.id}>
                <TableRow
                  data-state={
                    (row.getIsSelected() || row.getIsExpanded()) && "selected"
                  }
                  onClick={() => onRowClick?.(row)}
                  className="data-[state=selected]:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cell.column.columnDef.meta?.cellClassName}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
                {row.getIsExpanded() && rowComponent}
              </Fragment>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {paginationComponent
        ? React.createElement(paginationComponent, { table })
        : null}
      {actionBar ? React.createElement(actionBar, { table }) : null}
    </div>
  );
}
