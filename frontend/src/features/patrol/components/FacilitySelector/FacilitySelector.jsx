import React, { useState, useEffect } from 'react';
import axiosClient from '../../../../api/axiosClient';
import styles from './FacilitySelector.module.css';

export const FacilitySelector = ({ selectedId, onChange }) => {
  const [facilities, setFacilities] = useState([]);

  useEffect(() => {
    // API lấy danh sách cơ sở (Backend đã có sẵn ở /api/admin/facilities)
    axiosClient.get('/api/admin/facilities')
      .then((res) => setFacilities(res))
      .catch(console.error);
  }, []);

  if (facilities.length === 0) return null;

  return (
    <div className={styles.tabContainer}>
      <button
        className={`${styles.tabBtn} ${selectedId === null ? styles.active : ''}`}
        onClick={() => onChange(null)}
      >
        Toàn bộ cơ sở
      </button>
      {facilities.map((fac) => (
        <button
          key={fac.id}
          className={`${styles.tabBtn} ${selectedId === fac.id ? styles.active : ''}`}
          onClick={() => onChange(fac.id)}
        >
          {fac.name}
        </button>
      ))}
    </div>
  );
};