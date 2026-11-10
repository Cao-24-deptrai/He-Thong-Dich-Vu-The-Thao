const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const { MongoClient } = require('mongodb');

const mongoPath = 'C:\\Users\\LENOVO\\.cache\\mongodb-binaries\\mongod-x64-win32-7.0.24.exe';
const dbPath = path.resolve(__dirname, '../.data/db');

if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(dbPath, { recursive: true });
}

async function initReplicaSet() {
  const uri = 'mongodb://127.0.0.1:27017/?directConnection=true';
  let retries = 10;
  while (retries > 0) {
    try {
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });
      await client.connect();
      try {
        await client.db('admin').command({ replSetInitiate: {} });
        console.log('✅ Replica set rs0 initiated successfully!');
      } catch (err) {
        if (err.codeName === 'AlreadyInitialized' || err.message.includes('already initialized')) {
          console.log('ℹ️ Replica set rs0 already initialized.');
        } else {
          console.log('⚠️ ReplSet initiate note:', err.message);
        }
      }
      await client.close();
      return;
    } catch (e) {
      retries--;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

// Kiểm tra xem cổng 27017 đã có dịch vụ MongoDB nào chạy chưa
const socket = new net.Socket();
socket.setTimeout(1000);

socket.on('connect', async () => {
  console.log('✅ MongoDB đã đang chạy sẵn tại mongodb://127.0.0.1:27017');
  socket.destroy();
  await initReplicaSet();
});

socket.on('error', () => {
  console.log('🚀 Khởi động MongoDB Replica Set (rs0) cục bộ tại cổng 27017...');
  console.log('📁 Data path:', dbPath);

  const child = spawn(mongoPath, [
    '--dbpath', dbPath,
    '--port', '27017',
    '--bind_ip', '127.0.0.1',
    '--replSet', 'rs0'
  ], {
    stdio: 'inherit',
  });

  child.on('error', (err) => {
    console.error('❌ Không thể khởi động mongod:', err.message);
  });

  // Chờ mongod mở port rồi initiate rs0
  setTimeout(async () => {
    await initReplicaSet();
  }, 2500);

  process.on('SIGINT', () => {
    child.kill('SIGINT');
    process.exit(0);
  });
});

socket.connect(27017, '127.0.0.1');
