'use client';
import React, { useState, useEffect } from 'react';
import styles from '../styles/Home.module.css';


  useEffect(() => {
    // Tự động điều hướng đến trang home
    router.push('/pages/home');
  }, [router]);

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>Đang chuyển hướng...</h1>
      </main>
    </div>
  );
};

export default Home;