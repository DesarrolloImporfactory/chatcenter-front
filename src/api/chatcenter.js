import axios from "axios";

const chatApi = axios.create({
  baseURL: import.meta.env.VITE_socket + "/api/v1",
});

// Interceptor para añadir token dinámicamente antes de cada request
chatApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default chatApi;
