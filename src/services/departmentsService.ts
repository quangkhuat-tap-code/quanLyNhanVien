// src/services/departmentsService.ts
import { apiFetch } from './api';

const API = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:5000';

export type DepartmentPayload = {
  tenPhong: string;
  maPhong: string;
  namThanhLap: number;
  trangThai: 'active' | 'inactive';
};

export const departmentsService = {
  // LẤY TẤT CẢ PHÒNG BAN
  list: async () => {
    return apiFetch<any[]>(`${API}/api/departments`);
  },

  // THÊM PHÒNG BAN MỚI
  create: async (data: DepartmentPayload) => {
    return apiFetch<any>(`${API}/api/departments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
  },
  
  // CẬP NHẬT PHÒNG BAN (Sử dụng PUT, truyền ID)
  update: async (id: string, data: DepartmentPayload) => {
    return apiFetch<any>(`${API}/api/departments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
  },

  // XÓA PHÒNG BAN
  delete: async (id: string) => {
    return apiFetch<any>(`${API}/api/departments/${id}`, {
        method: 'DELETE',
    });
  },
};

// src/services/departmentsService.ts (Ví dụ)

