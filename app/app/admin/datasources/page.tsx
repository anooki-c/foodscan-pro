import styles from "../pages.module.css";

export default function DatasourcesPage() {
  return (
    <div>
      <div className={styles.pageTitle}>
        <h1>食品数据源</h1>
        <p>配置查询顺序与启用状态，优先级数字小的先查</p>
      </div>

      <div className={styles.card}>
        <div className={styles.tableWrap}>
          <table className={styles.data}>
            <thead>
              <tr>
                <th>名称</th>
                <th>类型</th>
                <th>优先级</th>
                <th>状态</th>
                <th>版本</th>
                <th>更新时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Open Food Facts</td><td>OFF 公开 API</td><td>1</td>
                <td><span className={`${styles.tag} ${styles.tagOn}`}>启用</span></td>
                <td>v2026-08-30</td><td>2026-08-30 03:00</td>
                <td><button className={styles.btnSm}>编辑</button><button className={styles.btnSm}>测试连接</button></td>
              </tr>
              <tr>
                <td>自建内部库</td><td>自定义</td><td>2</td>
                <td><span className={`${styles.tag} ${styles.tagOn}`}>启用</span></td>
                <td>v1.2</td><td>2026-08-28</td>
                <td><button className={styles.btnSm}>编辑</button><button className={styles.btnSm}>测试连接</button></td>
              </tr>
              <tr>
                <td>备选供应商 API</td><td>第三方</td><td>3</td>
                <td><span className={`${styles.tag} ${styles.tagOff}`}>停用</span></td>
                <td>—</td><td>—</td>
                <td><button className={styles.btnSm}>编辑</button><button className={styles.btnSm}>启用</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
