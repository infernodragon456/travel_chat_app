"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Languages } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LanguageToggle() {
  const router = useRouter();
  const pathname = usePathname();

  const changeLocale = (locale: string) => {
    const newPath = `/${locale}/${pathname.split("/").slice(2).join("/")}`;
    router.replace(newPath);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Languages className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Toggle language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => changeLocale("en")}>
          English
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeLocale("ja")}>
          日本語 (Japanese)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
