import axios from "axios";

const chatApi = axios.create({
  baseURL: "https://new.imporsuitpro.com/",
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});

export default chatApi;
