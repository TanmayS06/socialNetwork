import axios from "axios";

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL}/api/v1`,
  withCredentials: true,
});

api.defaults.headers.common["Accept"] = "application/json";

export default api;
