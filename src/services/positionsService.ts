// src/services/positionsService.ts
import { apiFetch } from './api';
import type { NewPositionData } from '../components/ui/AddPositionModal';
import type { PositionEditData } from '../components/ui/EditPositionModal';


const API = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:5000';

// Kiểu dữ liệu trả về từ API (dùng tên cột MySQL)
export type PositionApiResult = {
  id: number;
  ma_chuc_vu: string;
  ten_chuc_vu: string;
  mo_ta: string;
  cap_do: string;
  trang_thai: 'active' | 'inactive';
};

export const positionsService = {
  // 1. LẤY TẤT CẢ CHỨC VỤ
  list: async () => {
    return apiFetch<PositionApiResult[]>(`${API}/api/positions`);
  },

  // 2. THÊM CHỨC VỤ MỚI
  create: async (data: NewPositionData) => {
    return apiFetch<any>(`${API}/api/positions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
  },
  
  // 3. CẬP NHẬT CHỨC VỤ
  update: async (id: string, data: PositionEditData & { capDo?: string, moTa?: string }) => {
    return apiFetch<any>(`${API}/api/positions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
  },

  // 4. XÓA CHỨC VỤ
  delete: async (id: string) => {
    return apiFetch<any>(`${API}/api/positions/${id}`, {
        method: 'DELETE',
    });
  },
};

