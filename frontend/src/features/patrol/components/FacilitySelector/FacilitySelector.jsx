import React, { useState, useEffect } from 'react';
import axiosClient from '../../../../api/axiosClient';
import styles from './FacilitySelector.module.css';

export const FacilitySelector = ({ selectedId, onChange }) => {
  const [facilities, setFacilities] = useState([]);

  useEffect(() => {

    axiosClient.get('/admin/facilities')
      .then((res) => {
        setFacilities(Array.isArray(res) ? res : (res?.data || []));
      })
      .catch((err) => {
        console.error("Lỗi lấy danh sách cơ sở:", err);
      });
  }, []);

  return (
    <div className={styles.tabContainer}>
      <button
        type="button"
        className={`${styles.tabBtn} ${selectedId === null ? styles.active : ''}`}
        onClick={() => onChange(null)}
      >
        🌐 Toàn bộ cơ sở
      </button>
      {facilities.map((fac) => (
        <button
          key={fac.id}
          type="button"
          className={`${styles.tabBtn} ${selectedId === fac.id ? styles.active : ''}`}
          onClick={() => onChange(fac.id)}
        >
          🏢 {fac.name}
        </button>
      ))}
    </div>
  );
};