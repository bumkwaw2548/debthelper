const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Serve static files จาก frontend/dist
app.use(express.static(path.join(__dirname, 'dist')));

// React Router — ทุก route ที่ไม่ใช่ไฟล์ ให้ส่ง index.html กลับไป
app.get('*', (req, res) => {
res.sendFile(path.join(__dirname, 'dist', 'index.html'));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

