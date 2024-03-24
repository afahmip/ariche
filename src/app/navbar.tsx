"use client";

import { cn } from "@/lib/utils";
import { History, Home, Plus, Settings, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname().replace("/", "");

  if (pathname === "record") return null;

  const wrapperClass = "flex flex-col items-center basis-1/5 py-2.5";
  const textIdleClass = "text-gray-400";
  const textActiveClass = "text-black";
  const iconIdleClass = "text-gray-400";
  const iconActiveClass = "text-black";

  return (
    <div className="fixed z-999 bottom-0 bg-white w-full border-t border-gray-200 flex">
      <Link href="/" className={wrapperClass}>
        <Home
          className={cn(
            "h-4 w-4",
            pathname === "" ? iconActiveClass : iconIdleClass
          )}
        />
        <p
          className={cn(
            "text-xs",
            pathname === "" ? textActiveClass : textIdleClass
          )}
        >
          Home
        </p>
      </Link>
      <Link href="/transactions" className={wrapperClass}>
        <History
          className={cn(
            "h-4 w-4",
            pathname === "transactions" ? iconActiveClass : iconIdleClass
          )}
        />
        <p
          className={cn(
            "text-xs",
            pathname === "transactions" ? textActiveClass : textIdleClass
          )}
        >
          History
        </p>
      </Link>
      <div className={cn(wrapperClass, "relative")}>
        <Link
          href="/record"
          className="flex items-center bg-[#0177FF] shadow-lg rounded-full absolute p-3.5 bottom-[1rem]"
        >
          <Plus className="h-8 w-8 text-white" />
        </Link>
      </div>
      <button className={wrapperClass}>
        <Wallet className="h-4 w-4 text-gray-400" />
        <p className="text-xs text-gray-400">Accounts</p>
      </button>
      <button className={wrapperClass}>
        <Settings className="h-4 w-4 text-gray-400" />
        <p className="text-xs text-gray-400">Settings</p>
      </button>
    </div>
  );
}
