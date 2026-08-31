"use client";

import styles from "./CompositionRing.module.css";

export interface RingSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface CompositionRingProps {
  /** 环形图中心大数字 */
  centerNum: number;
  centerLabel: string;
  segments: RingSegment[];
}

const CIRCUMFERENCE = 2 * Math.PI * 52;

export default function CompositionRing({
  centerNum,
  centerLabel,
  segments,
}: CompositionRingProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let offset = 0;

  return (
    <div className={styles.wrap}>
      <div className={styles.ring}>
        <svg width="128" height="128" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r="52" fill="none" stroke="var(--ring-track)" strokeWidth="14" />
          {segments.map((seg) => {
            const len = (seg.value / total) * CIRCUMFERENCE;
            const el = (
              <circle
                key={seg.key}
                cx="64"
                cy="64"
                r="52"
                fill="none"
                stroke={seg.color}
                strokeWidth="14"
                strokeDasharray={`${len} ${CIRCUMFERENCE - len}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className={styles.center}>
          <span className={styles.num}>{centerNum}</span>
          <span className={styles.label}>{centerLabel}</span>
        </div>
      </div>
      <div className={styles.legend}>
        {segments.map((seg) => (
          <div key={seg.key} className={styles.legendRow}>
            <span className={styles.dot} style={{ background: seg.color }} />
            <span className={styles.name}>{seg.label}</span>
            <span className={styles.val}>{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
