"use client"

import { useState } from "react"
import Link from "next/link"
import type { ProductData, ProductVariantData } from "@upds/services"
import {
  DataTable,
  DataTableColumnHeader,
  type ColumnDef,
  Badge,
  Button,
  Input,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@upds/ui"
import {
  PRODUCT_CATEGORY_LABELS,
  GARMENT_TYPE_LABELS,
  WAREHOUSE_AREA_LABELS,
} from "@upds/validators"
import { Eye, Search } from "lucide-react"
import { InitialStockButton } from "./initial-stock-button"

function getSingleActiveVariant(product: ProductData): ProductVariantData | null {
  const activeVariants = product.variants.filter((variant) => variant.is_active)
  if (activeVariants.length !== 1) return null

  const [variant] = activeVariants
  return variant ?? null
}

const columns: ColumnDef<ProductData>[] = [
  {
    accessorKey: "sku",
    header: ({ column }) => <DataTableColumnHeader column={column} title="SKU" />,
    cell: ({ row }) => (
      <span className="font-mono">{row.getValue("sku")}</span>
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("name")}</span>
    ),
  },
  {
    accessorKey: "category",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Categoria" />,
    cell: ({ row }) => {
      const category = row.getValue("category") as string
      return (
        <Badge variant="outline">
          {PRODUCT_CATEGORY_LABELS[category as keyof typeof PRODUCT_CATEGORY_LABELS]}
        </Badge>
      )
    },
  },
  {
    accessorKey: "garment_type",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
    cell: ({ row }) => {
      const type = row.getValue("garment_type") as string | null
      return (
        <span>
          {type
            ? GARMENT_TYPE_LABELS[type as keyof typeof GARMENT_TYPE_LABELS]
            : "\u2014"}
        </span>
      )
    },
  },
  {
    accessorKey: "warehouse_area",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Area" />,
    cell: ({ row }) => {
      const area = row.getValue("warehouse_area") as string
      return (
        <span>
          {WAREHOUSE_AREA_LABELS[area as keyof typeof WAREHOUSE_AREA_LABELS]}
        </span>
      )
    },
  },
  {
    accessorKey: "min_stock",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Stock Min" className="justify-end" />
    ),
    cell: ({ row }) => (
      <span className="text-right tabular-nums block">
        {row.getValue("min_stock")}
      </span>
    ),
  },
  {
    accessorKey: "is_active",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => {
      const isActive = row.getValue("is_active") as boolean
      return (
        <Badge variant={isActive ? "default" : "secondary"}>
          {isActive ? "Activo" : "Inactivo"}
        </Badge>
      )
    },
  },
  {
    id: "actions",
    size: 240,
    enableSorting: false,
    cell: ({ row }) => {
      const product = row.original
      const singleVariant = getSingleActiveVariant(product)

      return (
        <div className="flex items-center justify-end gap-2">
          {product.is_active && singleVariant ? (
            <InitialStockButton
              productVariantId={singleVariant.id}
              productLabel={`${product.sku}-${singleVariant.sku_suffix}`}
            />
          ) : product.is_active ? (
            <Link href={`/products/${product.id}`}>
              <Button variant="outline" size="sm">Elegir variante</Button>
            </Link>
          ) : null}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href={`/products/${product.id}`}>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Ver detalles</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )
    },
  },
]

interface ProductsTableProps {
  products: ProductData[]
}

export function ProductsTable({ products }: ProductsTableProps) {
  const [search, setSearch] = useState("")

  const filtered = products.filter(
    (p) =>
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <DataTable
      columns={columns}
      data={filtered}
      toolbar={
        <div className="flex items-center gap-2 px-1">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por SKU o nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
      }
    />
  )
}
