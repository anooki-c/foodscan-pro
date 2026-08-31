import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import styles from "./admin.module.css";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.page}>
      <header className={styles.appbar}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>
            <span className="material-symbols-rounded" style={{ fontSize: 18 }}>science</span>
          </span>
          <span className={styles.brandName}>食品配料分析</span>
          <span className={styles.adminTag}>ADMIN</span>
        </div>
        <Link href="/" className={styles.backBtn}>
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>arrow_back</span>
          返回前台
        </Link>
      </header>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <AdminNav />
        </aside>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
