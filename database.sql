-- SQL SCRIPT HOÀN CHỈNH CHO DỰ ÁN HR PRO (Node.js + MySQL)
-- File này tạo Database, các bảng, ràng buộc, và dữ liệu khởi tạo (Seed Data).

-- TÊN DATABASE
CREATE DATABASE IF NOT EXISTS hr_pro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hr_pro;

-- 1. Bảng PHÒNG BAN (departments)
CREATE TABLE IF NOT EXISTS departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ten_phong VARCHAR(100) NOT NULL,
    ma_phong CHAR(3) NOT NULL UNIQUE, -- Mã 3 ký tự (VD: PDT)
    nam_thanh_lap INT,
    trang_thai ENUM('active', 'inactive') DEFAULT 'active'
);

-- 2. Bảng CHỨC VỤ (positions)
-- Bao gồm cột quyen_han (JSON) đã được thêm trong quá trình phát triển
CREATE TABLE IF NOT EXISTS positions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ten_chuc_vu VARCHAR(100) NOT NULL,
    ma_chuc_vu CHAR(1) NOT NULL UNIQUE, -- Mã 1 ký tự (VD: T)
    mo_ta TEXT,
    cap_do VARCHAR(50),
    trang_thai ENUM('active', 'inactive') DEFAULT 'active',
    quyen_han JSON -- Lưu mảng quyền hạn
);

-- 3. Bảng NHÂN VIÊN (employees)
CREATE TABLE IF NOT EXISTS employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) UNIQUE, -- Mã nhân viên tự sinh (VD: PDTT0001)
    name VARCHAR(100) NOT NULL,
    dept_id INT,             -- Khóa ngoại đến departments
    position_id INT,         -- Khóa ngoại đến positions
    salary DECIMAL(15, 2) DEFAULT 0, 
    status ENUM('active', 'inactive') DEFAULT 'active',
    photo LONGTEXT,          -- Lưu ảnh Base64
    tai_khoan VARCHAR(50) UNIQUE, -- Tài khoản đăng nhập/chấm công (UNIQUE)
    mat_khau VARCHAR(255),
    face_embedding JSON,     -- Vector khuôn mặt (dùng cho Face-API.js)
    has_face_registered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dept_id) REFERENCES departments(id) ON DELETE RESTRICT, -- KHÔNG cho xóa phòng ban nếu còn NV
    FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE RESTRICT -- KHÔNG cho xóa chức vụ nếu còn NV
);

-- 4. Bảng CHẤM CÔNG (attendance)
-- Lỗi logic cũ đã được fix bằng cách lưu cặp checkin/checkout trong cùng một hàng
CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT,
    checkin_time DATETIME,
    checkout_time DATETIME NULL,
    total_hours FLOAT DEFAULT 0, 
    date_log DATE,             
    distance FLOAT NULL,       -- Khoảng cách nhận diện khuôn mặt
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE -- Xóa NV thì xóa lịch sử chấm công
);

-- ==========================================================
-- DỮ LIỆU KHỞI TẠO (SEED DATA)
-- Cần thiết để chức năng Thêm Nhân viên hoạt động (lấy mã phòng/chức vụ)
-- ==========================================================

-- Thêm Phòng ban
INSERT INTO departments (ten_phong, ma_phong, nam_thanh_lap, trang_thai) 
VALUES 
('Phòng Kinh Doanh', 'PKD', 2020, 'active'),
('Phòng Nhân Sự', 'PNS', 2019, 'active'),
('Phòng Kỹ Thuật', 'PKT', 2021, 'active'),
('Phòng Marketing', 'PMK', 2022, 'active');

-- Thêm Chức vụ
INSERT INTO positions (ten_chuc_vu, ma_chuc_vu, cap_do, mo_ta, trang_thai, quyen_han) 
VALUES 
('Giám đốc điều hành', 'G', 'ADMIN', 'Quản lý toàn bộ hoạt động công ty', 'active', '["Toàn quyền hệ thống", "Duyệt ngân sách"]'),
('Trưởng phòng', 'T', 'MANAGER', 'Quản lý nhân sự và KPI phòng ban', 'active', '["Quản lý nhân viên", "Duyệt công", "Xem báo cáo"]'),
('Nhân viên', 'N', 'STAFF', 'Thực hiện các công việc chuyên môn', 'active', '["Xem hồ sơ cá nhân", "Chấm công"]'),
('Thực tập sinh', 'S', 'INTERN', 'Hỗ trợ các công việc của phòng ban', 'active', '["Chấm công"]');