"use client";

import { useEffect } from "react";
import styles from "./BottomSheet.module.css";

interface BottomSheetProps {
  open: boolean;
  title?: string;
  sub?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  /** 底部操作区 */
  footer?: React.ReactNode;
}

export default function BottomSheet({
  open,
  title,
  sub,
  onClose,
  children,
  footer,
}: BottomSheetProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      window.addEventListener("keydown", handler);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.handle} />
        {title && <h3 className={styles.title}>{title}</h3>}
        {sub && <div className={styles.sub}>{sub}</div>}
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
}
