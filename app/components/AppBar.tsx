"use client";

import Link from "next/link";
import styles from "./AppBar.module.css";

interface AppBarProps {
  title?: string;
  /** 显示返回按钮（否则显示 Logo） */
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
}

export default function AppBar({ title, showBack, onBack, right }: AppBarProps) {
  return (
    <header className={styles.appbar}>
      {showBack ? (
        <button className={styles.iconBtn} onClick={onBack} aria-label="返回">
          <span className="material-symbols-rounded" style={{ fontSize: 20 }}>
            arrow_back
          </span>
        </button>
      ) : (
        <Link href="/" className={styles.brand}>
          <span className={styles.brandMark}>
            <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
              science
            </span>
          </span>
          <span className={styles.brandName}>食品配料分析</span>
        </Link>
      )}
      {title && <span className={styles.title}>{title}</span>}
      {right ? (
        right
      ) : (
        <div style={{ width: 40 }} aria-hidden />
      )}
    </header>
  );
}
