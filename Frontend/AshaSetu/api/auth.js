// frontend/src/api/auth.js
import axios from 'axios';

// Update this with your backend URL
// For Android emulator use: http://10.0.2.2:5000
// For physical device use: http://YOUR_COMPUTER_IP:5000
const API_URL = 'http://10.0.2.2:5000/api/auth';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Register user
export const registerUser = async (userData) => {
  try {
    const response = await api.post('/register', userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Registration failed' };
  }
};

// Login user
export const loginUser = async (credentials) => {
  try {
    const response = await api.post('/login', credentials);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Login failed' };
  }
};

// Get user profile
export const getProfile = async (token) => {
  try {
    const response = await api.get('/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data.user;
  } catch (error) {
    console.error('Get profile error:', error);
    return null;
  }
};

// Update user profile
export const updateProfile = async (token, userData) => {
  try {
    const response = await api.put('/update', userData, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Update failed' };
  }
};

// Change password
export const changePassword = async (token, passwords) => {
  try {
    const response = await api.put('/change-password', passwords, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Password change failed' };
  }
};

export default api;