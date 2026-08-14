// src/features/patrol/PatrolRouter.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { RoomSelectionPage } from './pages/RoomSelectionPage';
import { AdminShiftOverviewPage } from './pages/AdminShiftOverviewPage';

export const PatrolRouter = () => {
  const { user } = useAuth();
  const userRole = user?.role;

  // 1. Nhóm Quản trị & Giám sát ca trực
  const ADMIN_ROLES = ['Admin', 'Manager'];

  // 2. Nhóm Tác nghiệp đi tuần & Kiểm kê trực tiếp
  const PATROL_ROLES = ['Coordinator', 'Caregiver'];

  // ── PHÂN NHÁNH ĐIỀU HƯỚNG THEO ROLE ──

  // Quản trị viên -> Mở Bảng giám sát tổng quan ca trực & Showcase ảnh
  if (ADMIN_ROLES.includes(userRole)) {
    return <AdminShiftOverviewPage />;
  }

  // Điều dưỡng / Điều phối viên -> Mở Sảnh chọn phòng để tác nghiệp
  if (PATROL_ROLES.includes(userRole)) {
    return <RoomSelectionPage />;
  }

  // Các vai trò khác (Kế toán, Bếp, Gia đình, Khách...) -> Đá về Dashboard chính
  return <Navigate to="/dashboard" replace />;
};