import React, { createContext, useState, useEffect, useContext } from "react";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        const role = localStorage.getItem('user_role');
        const mustChangePassword = localStorage.getItem('must_change_password') === 'true';
        const facilityIdRaw = localStorage.getItem('facility_id');
        // facility_id có thể là null (ví dụ tài khoản Admin không gắn cơ sở cụ thể)
        const facilityId = facilityIdRaw && facilityIdRaw !== 'null' ? Number(facilityIdRaw) : null;

        if (token && role) {
            setUser({ role, mustChangePassword, facility_id: facilityId });
        }
        setLoading(false);
    }, []);

    const login = (tokenResponse) => {
        localStorage.setItem('access_token', tokenResponse.access_token);
        localStorage.setItem('user_role', tokenResponse.role);
        localStorage.setItem('must_change_password', String(tokenResponse.must_change_password));
        // Lưu facility_id — có thể null (Admin không thuộc cơ sở cụ thể), vẫn cần lưu để phân biệt
        // với trường hợp "chưa đăng nhập" khi đọc lại ở useEffect trên.
        localStorage.setItem('facility_id', tokenResponse.facility_id ?? 'null');

        const loggedUser = {
            role: tokenResponse.role,
            mustChangePassword: tokenResponse.must_change_password,
            facility_id: tokenResponse.facility_id ?? null,
        };
        setUser(loggedUser);
        return loggedUser;
    };

    const logout = () => {
        localStorage.clear();
        setUser(null);
    };

    const clearMustChangePasswordFlag = () => {
        localStorage.setItem('must_change_password', 'false');
        setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : null));
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, clearMustChangePasswordFlag }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth phải được sử dụng trong AuthProvider");
    }
    return context;
};