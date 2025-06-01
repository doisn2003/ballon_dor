'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '../../styles/PageRouter.module.css';

const PageRouter = () => {
  const pathname = usePathname();
  const [pages, setPages] = useState([
    { path: '/pages/home', name: 'Trang chủ' },
    { path: '/pages/admin', name: 'Trang quản trị' },
    { path: '/pages/voted', name: 'Xác minh phiếu bầu' }
  ]);

  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>
        <img src="/ballonBall.png" alt="Ballon d'Or" className={styles.logoImage} />
        <span className={styles.logoText}>Ballon d'Or 2025</span>
      </div>
      <ul className={styles.navLinks}>
        {pages.map((page) => (
          <li key={page.path}>
            <Link href={page.path} 
              className={`${styles.navLink} ${pathname === page.path ? styles.active : ''}`}
            >
              {page.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default PageRouter; 