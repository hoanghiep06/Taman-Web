import axios from 'axios';

const axiosClient = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// TỰ động đính kèm Token vào đầu request
axiosClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
    (response) => response.data,
    (error) => {
        if (error.response) {
            const { status, data } = error.response

            if (status === 401) {
                localStorage.clear()
                window.location.href = '/login';
            }

            if (status === 403){
                alert(data.detail || 'Bạn không thể truy cập vào mục này')
            }
        }
        return Promise.reject(error);
    }
);

export default axiosClient;
