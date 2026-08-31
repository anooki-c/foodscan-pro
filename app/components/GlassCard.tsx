import type { CSSProperties, ReactNode } from "react";
import styles from "./GlassCard.module.css";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}

/** 玻璃质感卡片（对应 mockup 中的透明玻璃卡片） */
export default function GlassCard({ children, className = "", style, onClick }: GlassCardProps) {
  return (
    <div className={`${styles.card} ${className}`.trim()} style={style} onClick={onClick}>
      {children}
    </div>
  );
}
