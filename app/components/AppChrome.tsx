"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

type AppChromeProps = {
  children: ReactNode;
};

export default function AppChrome({ children }: AppChromeProps) {
  const pathname = usePathname();
  const isLoginRoute = pathname === "/users/login";

  if (isLoginRoute) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <>
      <div className="flex flex-row flex-1">
        <Sidebar />
        <main className="flex-1">{children}</main>
      </div>
    </>
  );
}
