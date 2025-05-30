"use client";

import { Button } from "@/components/ui/button";
import { useTheme } from "./theme-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  MonitorIcon, 
  MoonIcon, 
  SunIcon, 
  Paintbrush, 
  Leaf,
  Coffee,
  Sunset,
  Palette,
  CloudMoon,
  Waves
} from "lucide-react";

export function ThemeSwitcher() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full">
          <SunIcon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <MoonIcon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <Palette className="absolute h-[1.2rem] w-[1.2rem] scale-0 transition-all blue:scale-100 purple:scale-100 green:scale-100 sunset:scale-100 forest:scale-100 ocean:scale-100 midnight:scale-100 coffee:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[180px] p-2">
        <h4 className="mb-2 px-2 text-sm font-semibold">Choose theme</h4>
        <DropdownMenuItem onClick={() => setTheme("light")} className="flex gap-2 items-center cursor-pointer">
          <SunIcon className="h-4 w-4" /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="flex gap-2 items-center cursor-pointer">
          <MoonIcon className="h-4 w-4" /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("blue")} className="flex gap-2 items-center cursor-pointer">
          <MonitorIcon className="h-4 w-4 text-blue-500" /> Blue
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("purple")} className="flex gap-2 items-center cursor-pointer">
          <Paintbrush className="h-4 w-4 text-purple-500" /> Purple
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("green")} className="flex gap-2 items-center cursor-pointer">
          <Leaf className="h-4 w-4 text-green-500" /> Green
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("sunset")} className="flex gap-2 items-center cursor-pointer">
          <Sunset className="h-4 w-4 text-orange-500" /> Sunset
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("forest")} className="flex gap-2 items-center cursor-pointer">
          <Leaf className="h-4 w-4 text-emerald-600" /> Forest
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("ocean")} className="flex gap-2 items-center cursor-pointer">
          <Waves className="h-4 w-4 text-cyan-500" /> Ocean
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("midnight")} className="flex gap-2 items-center cursor-pointer">
          <CloudMoon className="h-4 w-4 text-indigo-500" /> Midnight
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("coffee")} className="flex gap-2 items-center cursor-pointer">
          <Coffee className="h-4 w-4 text-amber-700" /> Coffee
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
