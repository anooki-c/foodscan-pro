"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "@/app/admin/admin.module.css";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "dashboard", exact: true },
  { href: "/admin/datasources", label: "食品数据源", icon: "database" },
  { href: "/admin/off", label: "OFF 更新", icon: "inventory_2" },
  { href: "/admin/ocr", label: "OCR 配置", icon: "document_scanner" },
  { href: "/admin/ai", label: "AI 配置", icon: "auto_awesome" },
  { href: "/admin/knowledge", label: "知识库", icon: "menu_book" },
  { href: "/admin/system", label: "系统状态", icon: "info" },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <>
      {NAV.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={styles.navItem}
            aria-current={active ? "page" : undefined}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 20 }}>
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
