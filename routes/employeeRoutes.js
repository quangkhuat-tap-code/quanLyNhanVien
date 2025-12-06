// backendhi/routes/employeeRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { generateEmployeeCode, euclideanDistance } = require('../utils/employeeUtils');
const { differenceInMinutes } = require('date-fns');

// --- HÀM HỖ TRỢ LẤY ID TỪ TÊN (Giữ nguyên) ---
async function getDeptPosIds(deptName, posName) {
    const [dRows] = await db.query("SELECT id FROM departments WHERE ten_phong = ?", [deptName]);
    const [pRows] = await db.query("SELECT id FROM positions WHERE ten_chuc_vu = ?", [posName]);
    
    if (dRows.length === 0 || pRows.length === 0) {
        return { error: "Phòng ban hoặc chức vụ không tồn tại trong hệ thống." };
    }
    return { deptId: dRows[0].id, positionId: pRows[0].id };
}


// --- API: QUẢN LÝ NHÂN VIÊN ---

// GET /api/employees (Lấy danh sách)
router.get('/employees', async (req, res) => {
    try {
        const sql = `
            SELECT e.*, d.ten_phong as dept, p.ten_chuc_vu as position 
            FROM employees e
            LEFT JOIN departments d ON e.dept_id = d.id
            LEFT JOIN positions p ON e.position_id = p.id
            ORDER BY e.created_at DESC
        `;
        const [rows] = await db.query(sql);
        
        const data = rows.map(emp => ({
            ...emp,
            id: emp.id.toString(),
            has_face_registered: !!emp.has_face_registered
        }));
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/employees (Thêm mới - Kèm SINH MÃ TỰ ĐỘNG)
router.post('/employees', async (req, res) => {
    const { name, dept, position, salary, taiKhoan, matKhau, photo, status='active' } = req.body;
    
    try {
        const { deptId, positionId, error } = await getDeptPosIds(dept, position);
        if (error) return res.status(400).json({ error });

        const newCode = await generateEmployeeCode(deptId, positionId);

        const sql = `INSERT INTO employees (code, name, dept_id, position_id, salary, tai_khoan, mat_khau, photo, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const [result] = await db.query(sql, [newCode, name, deptId, positionId, salary, taiKhoan, matKhau, photo, status]);

        res.json({ id: result.insertId.toString(), code: newCode, message: "Thêm thành công" });
    } catch (err) {
        if (err.errno === 1062) return res.status(409).json({ error: "Lỗi trùng lặp: Tài khoản nhân viên đã tồn tại." });
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/employees/:id (Cập nhật)
router.put('/employees/:id', async (req, res) => {
    const { id } = req.params;
    const { name, dept, position, salary, taiKhoan, matKhau, status } = req.body;
    
    try {
        const { deptId, positionId, error } = await getDeptPosIds(dept, position);
        if (error) return res.status(400).json({ error });

        const sql = `UPDATE employees SET name=?, dept_id=?, position_id=?, salary=?, status=?, tai_khoan=?, mat_khau=? WHERE id=?`;
        const [result] = await db.query(sql, [name, deptId, positionId, salary, status, taiKhoan, matKhau, id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Không tìm thấy nhân viên để cập nhật." });
        }
        res.json({ success: true, message: "Cập nhật thành công" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/employees/:id (Xóa)
router.delete('/employees/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM attendance WHERE employee_id = ?", [id]);
        
        const [result] = await db.query("DELETE FROM employees WHERE id = ?", [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Không tìm thấy nhân viên để xóa." });
        }
        res.json({ success: true, message: "Đã xóa nhân viên" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/employees/login (Đăng nhập cho chấm công)
router.post('/employees/login', async (req, res) => {
    const { taiKhoan, matKhau } = req.body;

    try {
        const sql = `SELECT id FROM employees WHERE tai_khoan = ? AND mat_khau = ? LIMIT 1`;
        const [rows] = await db.query(sql, [taiKhoan, matKhau]);

        if (rows.length === 0) {
            return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu." });
        }

        res.json({ success: true, employeeId: rows[0].id.toString() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- API: ĐĂNG KÝ FACEID ---

// POST /api/enroll-face
router.post('/enroll-face', async (req, res) => {
    const { employeeId, embedding, snapshot } = req.body;
    try {
        await db.query(
            "UPDATE employees SET face_embedding = ?, photo = ?, has_face_registered = 1 WHERE id = ?",
            [JSON.stringify(embedding), snapshot, employeeId]
        );
        res.json({ success: true, employeeId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- API: CHẤM CÔNG (FIX LỖI NHẬN DIỆN KHUÔN MẶT) ---
router.post('/checkin', async (req, res) => {
    // ĐẶT NGƯỠNG AN TOÀN TỐI ĐA ĐỂ ĐẢM BẢO NHẬN DIỆN CHO BÀI TẬP LỚN
    const { embedding, type, threshold = 0.8 } = req.body; 

    try {
        // 1. Nhận diện khuôn mặt
        const [users] = await db.query("SELECT id, face_embedding FROM employees WHERE has_face_registered = 1");
        let bestMatch = null;
        let minDistance = Infinity;

        for (const user of users) {
            // FIX LỖI JSON PARSING
            let dbEmbedding = user.face_embedding;
            if (typeof dbEmbedding === 'string') {
                try {
                    dbEmbedding = JSON.parse(dbEmbedding);
                } catch (e) {
                    continue; 
                }
            }
            
            if (Array.isArray(dbEmbedding) && dbEmbedding.length > 0) {
                const dist = euclideanDistance(embedding, dbEmbedding);
                if (dist < minDistance) {
                    minDistance = dist;
                    bestMatch = user;
                }
            }
        }

        if (!bestMatch || minDistance > threshold) {
            return res.status(400).json({ error: `Không nhận diện được khuôn mặt khớp. Khoảng cách gần nhất là ${minDistance.toFixed(3)}.` });
        }

        // 2. Logic Check-in/Check-out
        const empId = bestMatch.id;
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        if (type === 'checkin') {
            const [existing] = await db.query(
                "SELECT id FROM attendance WHERE employee_id = ? AND date_log = ? AND checkout_time IS NULL",
                [empId, today]
            );

            if (existing.length > 0) {
                return res.status(400).json({ error: "Bạn chưa Check-out ca làm việc trước đó!" });
            }
            await db.query(
                "INSERT INTO attendance (employee_id, checkin_time, date_log) VALUES (?, ?, ?)",
                [empId, now, today]
            );

        } else { // Check-out
            const [openSession] = await db.query(
                "SELECT id, checkin_time FROM attendance WHERE employee_id = ? AND date_log = ? AND checkout_time IS NULL ORDER BY checkin_time DESC LIMIT 1",
                [empId, today]
            );

            if (openSession.length === 0) {
                return res.status(400).json({ error: "Không tìm thấy lượt Check-in hợp lệ để Check-out." });
            }

            const sessionId = openSession[0].id;
            const checkinTime = new Date(openSession[0].checkin_time);
            
            const minutes = differenceInMinutes(now, checkinTime);
            const hours = parseFloat((minutes / 60).toFixed(2));

            await db.query(
                "UPDATE attendance SET checkout_time = ?, total_hours = ? WHERE id = ?",
                [now, hours, sessionId]
            );
        }

        res.json({
            employeeId: empId.toString(),
            type,
            distance: minDistance,
            timestamp: now,
            source: 'remote'
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// GET /api/payroll-report (TÍNH LƯƠNG THEO CÔNG THỨC 40 GIỜ)
router.get('/payroll-report', async (req, res) => {
    const { month, year } = req.query; 

    if (!month || !year) return res.status(400).json({ error: "Vui lòng cung cấp tháng và năm." });

    try {
        const [employees] = await db.query("SELECT id, name, code, salary FROM employees");
        const payrollData = [];

        for (const emp of employees) {
            const sqlSumHours = `
                SELECT SUM(total_hours) as total 
                FROM attendance 
                WHERE employee_id = ? 
                AND MONTH(date_log) = ? 
                AND YEAR(date_log) = ?
            `;
            const [rows] = await db.query(sqlSumHours, [emp.id, month, year]);
            const totalHours = rows[0].total || 0;

            const baseSalary = Number(emp.salary);
            let finalSalary = 0;
            let overtimePay = 0;
            let overtimeHours = 0;
            const standardHours = 40; 

            if (totalHours <= standardHours) {
                finalSalary = baseSalary;
            } else {
                overtimeHours = totalHours - standardHours;
                const hourlyRate = baseSalary / standardHours; 
                overtimePay = overtimeHours * hourlyRate * 1.5; 
                finalSalary = baseSalary + overtimePay;
            }

            payrollData.push({
                employeeId: emp.id,
                code: emp.code,
                name: emp.name,
                baseSalary: baseSalary,
                totalHours: totalHours,
                overtimeHours: overtimeHours,
                overtimePay: overtimePay,
                finalSalary: finalSalary
            });
        }

        res.json(payrollData);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// GET /api/employees/:id/face (Kiểm tra trạng thái đăng ký khuôn mặt)
router.get('/employees/:id/face', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query("SELECT has_face_registered FROM employees WHERE id = ?", [id]);
        if (rows.length === 0) return res.status(404).json({ registered: false });
        
        res.json({ registered: !!rows[0].has_face_registered }); 
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/attendance/:employeeId/open-session (Lấy phiên làm việc chưa check-out)
router.get('/attendance/:employeeId/open-session', async (req, res) => {
    const { employeeId } = req.params;
    const today = new Date().toISOString().split('T')[0];

    try {
        const [rows] = await db.query(
            "SELECT id, checkin_time FROM attendance WHERE employee_id = ? AND date_log = ? AND checkout_time IS NULL ORDER BY checkin_time DESC LIMIT 1",
            [employeeId, today]
        );

        if (rows.length === 0) {
            return res.json({ open: false });
        }

        res.json({
            open: true,
            sessionId: rows[0].id.toString(),
            checkInTime: rows[0].checkin_time, // TRẢ VỀ THỜI GIAN CHECK-IN CHÍNH XÁC
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;