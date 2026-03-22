"use client";

import { useState } from "react";
import {
  Button,
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@upds/ui";
import { Menu } from "lucide-react";
import { SidebarNav, type NavSection } from "./sidebar-nav";

interface MobileSidebarProps {
  sections: NavSection[];
}

export function MobileSidebar({ sections }: MobileSidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 bg-upds-navy p-0 text-white">
        <SheetTitle className="sr-only">Menu de navegacion</SheetTitle>
        <div className="flex h-16 items-center border-b border-upds-navy-400/20 px-6">
          <span className="text-lg font-bold tracking-tight">
            UPDS Inventario
          </span>
        </div>
        <div onClick={() => setOpen(false)}>
          <SidebarNav sections={sections} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
