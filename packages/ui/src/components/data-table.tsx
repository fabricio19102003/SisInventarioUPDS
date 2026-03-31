"use client"

import {
  type ColumnDef,
  type SortingState,
  type PaginationState,
  type OnChangeFn,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"
import * as React from "react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table"
import { DataTablePagination } from "./data-table-pagination"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  /** Content rendered above the table (filters, search, actions) */
  toolbar?: React.ReactNode
  /** Content rendered when data is empty */
  emptyState?: React.ReactNode
  /** Server-side pagination: total row count from server */
  rowCount?: number
  /** Server-side pagination: controlled pagination state */
  pagination?: PaginationState
  /** Server-side pagination: callback when pagination changes */
  onPaginationChange?: OnChangeFn<PaginationState>
  /** Client-side pagination: page size (default: 10) */
  pageSize?: number
  /** Hide pagination controls */
  hidePagination?: boolean
}

export function DataTable<TData, TValue>({
  columns,
  data,
  toolbar,
  emptyState,
  rowCount,
  pagination: controlledPagination,
  onPaginationChange,
  pageSize = 10,
  hidePagination = false,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

  const isServerSide = controlledPagination !== undefined

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      rowSelection,
      ...(isServerSide ? { pagination: controlledPagination } : {}),
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(!isServerSide ? { getPaginationRowModel: getPaginationRowModel() } : {}),
    ...(isServerSide
      ? {
          manualPagination: true,
          rowCount,
          onPaginationChange,
        }
      : {}),
    initialState: {
      pagination: { pageIndex: 0, pageSize },
    },
  })

  return (
    <div className="space-y-4">
      {toolbar}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.column.columnDef.size ? `${header.column.columnDef.size}px` : undefined }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {emptyState ?? "No hay resultados."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {!hidePagination && (table.getPageCount() > 1 || isServerSide) && (
        <DataTablePagination table={table} />
      )}
    </div>
  )
}

export type { ColumnDef, SortingState, PaginationState } from "@tanstack/react-table"
