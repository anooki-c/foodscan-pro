"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./TabBar.module.css";

const TABS = [
  { key: "home", href: "/", icon: "home", label: "首页" },
  { key: "history", href: "/history", icon: "history", label: "历史" },
  { key: "compare", href: "/compare", icon: "compare_arrows", label: "对比" },
  { key: "settings", href: "/settings", icon: "person", label: "我的" },
];

export default function TabBar() {
  const pathname = usePathname();
  return (
    <nav className={styles.wrap}>
      <div className={styles.bar}>
        {TABS.map((tab) => {
          const active =
            tab.key === "home" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={`${styles.tab} ${active ? styles.active : ""}`}
              aria-label={tab.label}
            >
              <span className="material-symbols-rounded">{tab.icon}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
