// backendhi/routes/positionRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/positions (Lấy danh sách)
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM positions");
        res.json(rows.map(r => ({...r, id: r.id.toString()})));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/positions (Thêm)
router.post('/', async (req, res) => {
    const { maChucVu, tenChucVu, capDo, moTa, trangThai, quyenHan = [] } = req.body;
    try {
        const quyenHanJson = JSON.stringify(quyenHan);
        
        const sql = `INSERT INTO positions (ma_chuc_vu, ten_chuc_vu, cap_do, mo_ta, trang_thai, quyen_han) VALUES (?, ?, ?, ?, ?, ?)`;
        const [result] = await db.query(sql, [maChucVu, tenChucVu, capDo, moTa, trangThai, quyenHanJson]);
        
        res.json({ id: result.insertId.toString(), maChucVu, tenChucVu, message: "Thêm thành công" }); 
        
    } catch (err) {
        if (err.errno === 1062) {
             return res.status(409).json({ error: "Lỗi trùng lặp: Mã chức vụ đã được sử dụng." });
        }
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/positions/:id (Sửa/Cập nhật)
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { maChucVu, tenChucVu, capDo, moTa, trangThai, quyenHan = [] } = req.body;
    try {
        const quyenHanJson = JSON.stringify(quyenHan);

        const sql = `UPDATE positions SET ma_chuc_vu = ?, ten_chuc_vu = ?, cap_do = ?, mo_ta = ?, trang_thai = ?, quyen_han = ? WHERE id = ?`;
        const [result] = await db.query(sql, [maChucVu, tenChucVu, capDo, moTa, trangThai, quyenHanJson, id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Không tìm thấy chức vụ để cập nhật." });
        }
        res.json({ success: true, message: "Cập nhật thành công" });
    } catch (err) {
         if (err.errno === 1062) {
             return res.status(409).json({ error: "Lỗi trùng lặp: Mã chức vụ đã được sử dụng." });
        }
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/positions/:id (Xóa)
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query("DELETE FROM positions WHERE id = ?", [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Không tìm thấy chức vụ để xóa." });
        }
        res.json({ success: true, message: "Đã xóa chức vụ" });
    } catch (err) {
        if (err.errno === 1451) {
            return res.status(409).json({ error: "Lỗi: Không thể xóa vì có nhân viên đang giữ chức vụ này." });
        }
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;