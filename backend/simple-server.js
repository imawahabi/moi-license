const http = require('http');

const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  res.setHeader('Content-Type', 'application/json');
  
  if (req.url === '/api/test') {
    res.writeHead(200);
    res.end(JSON.stringify({ message: 'Server is working!' }));
  } else if (req.url === '/api/employees') {
    res.writeHead(200);
    res.end(JSON.stringify([
      {
        id: 'emp-001',
        full_name: 'أحمد محمد الكندري',
        rank: 'رائد',
        file_number: '12345',
        category: 'ضابط',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]));
  } else if (req.url === '/api/licenses' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify([]));
  } else if (req.url === '/api/licenses' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { employee_id, license_type, license_date, hours } = data;
        
        if (!employee_id || !license_type || !license_date) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'البيانات المطلوبة مفقودة' }));
          return;
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
        
        res.writeHead(201);
        res.end(JSON.stringify(newLicense));
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🚀 Simple server running on port ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
});

// Keep the process alive
process.on('SIGINT', () => {
  console.log('\n👋 Server shutting down...');
  server.close(() => {
    process.exit(0);
  });
});
