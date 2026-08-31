import styles from "../pages.module.css";

export default function SystemPage() {
  return (
    <div>
      <div className={styles.pageTitle}>
        <h1>系统版本与更新日志</h1>
        <p>所有版本信息与变更记录</p>
      </div>

      <div className={styles.card}>
        <h3>版本</h3>
        <div className={styles.statList}>
          <div className={styles.statLine}><span className={styles.k}>Web 版本</span><span className={styles.v}>V1.0.0</span></div>
          <div className={styles.statLine}><span className={styles.k}>数据库版本</span><span className={styles.v}>v2026-08-30</span></div>
          <div className={styles.statLine}><span className={styles.k}>知识库版本</span><span className={styles.v}>V2.1</span></div>
          <div className={styles.statLine}><span className={styles.k}>OCR 模型版本</span><span className={styles.v}>V3.2</span></div>
        </div>
      </div>

      <div className={`${styles.card} ${styles.sectionGap}`}>
        <h3>更新日志</h3>
        <div className={styles.statList}>
          <div className={styles.statLine}><span className={styles.k}>V1.0.0 · 2026-09-01</span><span className={styles.v}>接入真实 OFF API / OCR / AI</span></div>
          <div className={styles.statLine}><span className={styles.k}>V1.0.0-beta · 2026-08-31</span><span className={styles.v}>工程化落地 + 详情弹窗</span></div>
        </div>
      </div>
    </div>
  );
}
