const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const { randomUUID } = require('crypto');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => ({
    folder: 'hrms_employee_documents',
    ...(file.mimetype === 'application/pdf'
      ? { resource_type: 'raw', public_id: randomUUID() + '.pdf' }
      : { resource_type: 'image', allowed_formats: ['jpg', 'jpeg', 'png'] }),
    type: 'authenticated',
  }),
});

const originalHandle = storage._handleFile.bind(storage);
storage._handleFile = (req, file, callback) => originalHandle(req, file, (error, result) => {
  if (error) return callback(error);
  result.resourceType = file.mimetype === 'application/pdf' ? 'raw' : 'image';
  result.path = result.resourceType === 'raw'
    ? cloudinary.utils.private_download_url(result.filename, '', {resource_type:'raw',type:'authenticated',expires_at:Math.floor(Date.now()/1000)+3600})
    : cloudinary.url(result.filename, { secure: true, sign_url: true, type: 'authenticated', resource_type: result.resourceType });
  callback(null, result);
});
storage._removeFile = (req, file, callback) => cloudinary.uploader.destroy(file.filename, { resource_type: file.resourceType || 'image', type: 'authenticated' }, callback);
const uploadCloud = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const valid = ['image/jpeg','image/png','application/pdf'].includes(file.mimetype);
    const error = Object.assign(new Error('Only JPEG, PNG and PDF uploads are allowed'), { status: 400 });
    cb(valid ? null : error, valid);
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

module.exports = { cloudinary, uploadCloud };
