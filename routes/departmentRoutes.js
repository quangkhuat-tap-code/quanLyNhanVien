// backendhi/routes/departmentRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/departments (Lấy danh sách)
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM departments");
        res.json(rows.map(r => ({...r, id: r.id.toString()})));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/departments (Thêm)
router.post('/', async (req, res) => {
    const { maPhong, tenPhong, namThanhLap, trangThai } = req.body;
    try {
        const sql = `INSERT INTO departments (ma_phong, ten_phong, nam_thanh_lap, trang_thai) VALUES (?, ?, ?, ?)`;
        const [result] = await db.query(sql, [maPhong, tenPhong, namThanhLap, trangThai]);
        res.json({ id: result.insertId.toString(), maPhong, tenPhong, message: "Thêm thành công" });
    } catch (err) {
        if (err.errno === 1062) {
             return res.status(409).json({ error: "Lỗi trùng lặp: Mã phòng ban đã được sử dụng." });
        }
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/departments/:id (Sửa/Cập nhật)
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { maPhong, tenPhong, namThanhLap, trangThai } = req.body;
    try {
        const sql = `UPDATE departments SET ma_phong = ?, ten_phong = ?, nam_thanh_lap = ?, trang_thai = ? WHERE id = ?`;
        const [result] = await db.query(sql, [maPhong, tenPhong, namThanhLap, trangThai, id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Không tìm thấy phòng ban để cập nhật." });
        }
        res.json({ success: true, message: "Cập nhật thành công" });
    } catch (err) {
        if (err.errno === 1062) {
             return res.status(409).json({ error: "Lỗi trùng lặp: Mã phòng ban đã được sử dụng." });
        }
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/departments/:id (Xóa)
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query("DELETE FROM departments WHERE id = ?", [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Không tìm thấy phòng ban để xóa." });
        }
        res.json({ success: true, message: "Đã xóa phòng ban" });
    } catch (err) {
        // Lỗi 1451: Cannot delete or update a parent row: a foreign key constraint fails
        if (err.errno === 1451) {
            return res.status(409).json({ error: "Lỗi: Không thể xóa vì có nhân viên đang thuộc phòng ban này." });
        }
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;