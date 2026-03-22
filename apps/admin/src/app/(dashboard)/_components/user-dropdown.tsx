"use client";

import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@upds/ui";
import { ChevronDown, LogOut } from "lucide-react";
import { USER_ROLE_LABELS, type UserRole } from "@upds/validators";
import { signOut } from "next-auth/react";

interface UserDropdownProps {
  fullName: string;
  email: string;
  role: string;
}

export function UserDropdown({ fullName, email, role }: UserDropdownProps) {
  const roleLabel =
    USER_ROLE_LABELS[role as UserRole] ?? role;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-upds-navy text-sm font-semibold text-white">
            {fullName
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>
          <span className="hidden text-sm font-medium md:inline-block">
            {fullName}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{fullName}</p>
            <p className="text-xs text-muted-foreground">{email}</p>
            <Badge variant="secondary" className="mt-1 w-fit text-xs">
              {roleLabel}
            </Badge>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-red-600 focus:text-red-600"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
