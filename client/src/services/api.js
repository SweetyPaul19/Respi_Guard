import axios from "axios";

// const API_BASE = "http://localhost:5000/api";
const API_BASE = import.meta.env.VITE_API_BASE;


export const getAdvisory = async (payload) => {
  const res = await axios.post(`${API_BASE}/get-advisory`, payload);
  return res.data;
};

export const askDoctor = async (payload) => {
  const res = await axios.post(`${API_BASE}/ask-doctor`, payload);
  return res.data;
};

export const saveUserProfile = async (payload) => {
  const res = await axios.post(`${API_BASE}/users/profile`, payload);
  return res.data;
};

export const sendSOSAlert = async (payload) => {
  const res = await axios.post(`${API_BASE}/sos-alert`, payload);
  return res.data;
}; 