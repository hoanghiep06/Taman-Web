import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

export const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user } = useContext(AuthContext);
    const location = useLocation();

    // 1. Chưa đăng nhập => Trang Login
    if (!user) {
        return <Navigate to="/login" state={{from: location}} replace />;
    }

    // 2. Buộc đổi mật khẩu lần đầu (Sửa lại tên biến ở đây)
    if (user.mustChangePassword && location.pathname !== '/force-reset') {
        return <Navigate to="/force-reset" replace />;
    }

    // 3. Đổi mật khẩu và cố tình quay lại trang Reset
    if (!user.mustChangePassword && location.pathname === '/force-reset') {
        return <Navigate to={user.role === 'Staff' ? '/rooms' : '/dashboard'} replace />;
    }

    // 4. Kiểm tra quyền hạn có khớp với Route
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
}