console.log('Starting test server...');

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// Basic employees endpoint
app.get('/api/employees', (req, res) => {
  res.json([
    {
      id: 'emp-001',
      full_name: 'أحمد محمد الكندري',
      rank: 'رائد',
      file_number: '12345',
      category: 'ضابط',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]);
});

// Basic licenses endpoint
app.get('/api/licenses', (req, res) => {
  res.json([]);
});

// Add license endpoint
app.post('/api/licenses', (req, res) => {
  console.log('Received license data:', req.body);
  
  const { employee_id, license_type, license_date, hours } = req.body;
  
  if (!employee_id || !license_type || !license_date) {
    return res.status(400).json({ error: 'البيانات المطلوبة مفقودة' });
  }
  
  const date = new Date(license_date);
  const newLicense = {
    id: 'lic-' + Date.now(),
    employee_id,
    license_type,
    license_date,
    hours: hours || null,
    month: date.getMonth() + 1,
    year: date.getFullYear(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    full_name: 'أحمد محمد الكندري',
    rank: 'رائد',
    file_number: '12345',
    category: 'ضابط'
  };
  
  console.log('Returning license:', newLicense);
  res.status(201).json(newLicense);
});

app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
});

console.log('Test server setup complete');
