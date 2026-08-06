import React, { createContext, useState, useEffect, useContext } from "react";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        const role = localStorage.getItem('user_role');
        const mustChangePassword = localStorage.getItem('must_change_password') === 'true';

        if (token && role) {
            // Sửa lại thành mustChangePassword (2 chữ s)
            setUser({ role, mustChangePassword });
        }
        setLoading(false);
    }, []);

    const login = (tokenResponse) => {
        localStorage.setItem('access_token', tokenResponse.access_token);
        localStorage.setItem('user_role', tokenResponse.role);
        localStorage.setItem('must_change_password', String(tokenResponse.must_change_password))
        
        const loggedUser = {
            role: tokenResponse.role,
            mustChangePassword: tokenResponse.must_change_password, // Sửa tại đây
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
        setUser((prev) => (prev ? { ...prev, mustChangePassword: false} : null)); // Sửa tại đây
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, clearMustChangePasswordFlag}}>
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