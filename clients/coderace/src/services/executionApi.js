import axios from 'axios';
import { BACKEND_URL } from '../utils/backendUrl.js';

const API_URL = import.meta.env.VITE_API_URL || BACKEND_URL;

export const executeCode = async (payload) => {
  const { data } = await axios.post(`${API_URL}/api/code/execute`, payload);
  return data;
};