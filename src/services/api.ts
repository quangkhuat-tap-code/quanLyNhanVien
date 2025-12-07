
// src/services/api.ts
export const apiFetch = async <T>(input: RequestInfo, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, init);
  
  // 1. Xử lý lỗi (HTTP Status codes 4xx, 5xx)
  if (!response.ok) {
    // Cố gắng đọc JSON lỗi từ server, nếu thất bại thì dùng lỗi chung
    const errorBody = await response.json().catch(() => ({ message: 'Lỗi API không xác định.' }));
    throw new Error(errorBody.error || errorBody.message || 'API error');
  }

  // 2. Xử lý phản hồi thành công (HTTP Status codes 2xx)
  
  // Lấy Content-Type và Content-Length
  const contentType = response.headers.get("content-type");
  const contentLength = response.headers.get("content-length");

  // Nếu là HTTP 204 No Content, hoặc không có Content-Type, hoặc Content-Length = 0
  const isNoContent = response.status === 204 || 
                      (contentLength !== null && contentLength === '0') || 
                      !contentType;
  
  if (isNoContent) {
     return {} as T; // Trả về object rỗng an toàn, tránh lỗi json()
  }
  
  // Nếu có nội dung, đọc JSON
  return response.json() as Promise<T>;
};