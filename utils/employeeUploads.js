const { cloudinary } = require('../config/cloudinary');
exports.serialize = employee => {
  if (!employee) return employee;
  const data = employee.toObject ? employee.toObject() : { ...employee };
  for (const [field, asset] of Object.entries(data.uploadAssets || {})) {
    if (asset.resourceType === 'raw') data[field] = cloudinary.utils.private_download_url(asset.publicId, '', {
      resource_type: 'raw', type: 'authenticated', expires_at: Math.floor(Date.now()/1000) + 3600,
    });
  }
  delete data.uploadAssets;
  return data;
};
exports.metadata = files => Object.fromEntries(Object.entries(files || {}).map(([key, list]) => [key, {
  publicId: list[0].filename, resourceType: list[0].resourceType,
}]));
