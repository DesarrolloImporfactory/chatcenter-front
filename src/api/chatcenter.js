import axios from "axios";

const chatApi = axios.create({
  baseURL: import.meta.env.VITE_socket + "/api/v1",
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});

export default chatApi;
