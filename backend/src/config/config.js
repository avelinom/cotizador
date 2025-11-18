require('dotenv').config();

const config = {
  server: {
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
  },

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'cotizador_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true'
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  },

  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    uploadPath: process.env.UPLOAD_PATH || './uploads'
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
  },

  google: {
    // Google Drive Service Account Configuration
    projectId: process.env.GOOGLE_PROJECT_ID || '',
    clientEmail: process.env.GOOGLE_CLIENT_EMAIL || '',
    privateKey: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
    privateKeyId: process.env.GOOGLE_PRIVATE_KEY_ID || '',
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientCertUrl: process.env.GOOGLE_CLIENT_CERT_URL || '',
    // Google Drive Folder IDs
    driveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || ''
  }
};

module.exports = config;
