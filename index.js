require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
// db.js không cần require ở đây, chỉ cần ở các route file

// Import các route module
const departmentRoutes = require('./routes/departmentRoutes');
const positionRoutes = require('./routes/positionRoutes');
const employeeRoutes = require('./routes/employeeRoutes'); 

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// --- ĐĂNG KÝ CÁC ROUTE VỚI EXPRESS ---
app.use('/api/departments', departmentRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api', employeeRoutes);

// --- CÁC API CƠ BẢN ĐỂ CHECK KẾT NỐI ---
app.get('/', (req, res) => {
    res.json({ message: 'HR Pro Backend 2 is running modularly!' });
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`HR Pro Backend running on port ${PORT}`);
});

