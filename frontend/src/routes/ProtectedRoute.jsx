import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

export const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user } = useContext(AuthContext);
    const location = useLocation();

    // 1. Chưa đăng nhập => Trang Login
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 2. Bắt buộc đổi mật khẩu lần đầu
    // Áp dụng cho TẤT CẢ role, không phân biệt Admin/Manager/Doctor/...
    if (user.mustChangePassword && location.pathname !== '/force-reset') {
        return <Navigate to="/force-reset" replace />;
    }

    // 3. Đã đổi mật khẩu nhưng cố truy cập lại trang force-reset
    if (!user.mustChangePassword && location.pathname === '/force-reset') {
        return <Navigate to="/dashboard" replace />;
    }

    // 4. Kiểm tra quyền hạn
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
};