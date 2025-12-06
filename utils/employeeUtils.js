const db = require('../db');

// Hàm 1: SINH MÃ NHÂN VIÊN TỰ ĐỘNG
// Cú pháp: <Mã Phòng 3 ký tự><Mã Chức Vụ 1 ký tự><Thứ tự 4 số>
async function generateEmployeeCode(deptId, posId) {
    // 1. Lấy mã phòng (VD: PKD)
    const [deptRows] = await db.query("SELECT ma_phong FROM departments WHERE id = ?", [deptId]);
    const deptCode = deptRows[0]?.ma_phong || 'XXX';

    // 2. Lấy mã chức vụ (VD: T)
    const [posRows] = await db.query("SELECT ma_chuc_vu FROM positions WHERE id = ?", [posId]);
    const posCode = posRows[0]?.ma_chuc_vu || 'X';

    // 3. Đếm số nhân viên để lấy số thứ tự tiếp theo
    const [countRows] = await db.query("SELECT COUNT(*) as count FROM employees");
    const nextOrder = countRows[0].count + 1;
    const orderString = nextOrder.toString().padStart(4, '0');

    return `${deptCode}${posCode}${orderString}`;
}

// Hàm 2: TÍNH KHOẢNG CÁCH EUCLID (cho FaceID)
const euclideanDistance = (a, b) => {
    if (!a || !b || a.length !== b.length) return Infinity;
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
};

module.exports = {
    generateEmployeeCode,
    euclideanDistance
};