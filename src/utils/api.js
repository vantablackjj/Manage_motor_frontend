import axios from 'axios';

// Tự động lấy URL từ biến môi trường, mặc định là localhost nếu không có
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Thêm bộ lọc (Interceptor) để đính kèm Token vào từng yêu cầu
api.interceptors.request.use(
  (config) => {
    // Lấy Token từ bộ nhớ máy tính (localStorage)
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Bộ lọc phản hồi (Để xử lý trường hợp Token hết hạn)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Nếu bị từ chối do Token lỗi/hết hạn, đẩy người dùng về trang Đăng nhập
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
