// app/api/backend.js
import axios from "axios";

const instance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000/api",
  timeout: 50000,
});

export default instance;
