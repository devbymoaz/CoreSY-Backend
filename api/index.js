const app = require('../src/app');
const { connectDatabase, disconnectDatabase } = require('../src/config/database');
const { connectRedis, disconnectRedis } = require('../src/config/redis');

let isConnected = false;

async function initializeConnections() {
  if (!isConnected) {
    await connectDatabase();
    await connectRedis();
    isConnected = true;
  }
}

module.exports = async (req, res) => {
  try {
    await initializeConnections();
    app(req, res);
  } catch (error) {
    console.error('Error handling request:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
