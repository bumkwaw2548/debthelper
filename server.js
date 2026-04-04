const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// 1. Serve static files จากโฟลเดอร์ dist
app.use(express.static(path.join(__dirname, 'dist')));

// 2. React Router — แก้ไขจุดที่ปิดวงเล็บผิด
app.get('*', (req, res) => {
 res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
}); // <-- เพิ่มปีกกาและวงเล็บปิดตรงนี้ค่ะ

// 3. เริ่มทำงาน Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});