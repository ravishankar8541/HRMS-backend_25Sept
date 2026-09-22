const express = require('express');
const router = express.Router();
const {
  getAllDocuments,
  previewDocumentPDF,
  bulkDownload,
  deleteDocument,
} = require('../controllers/documentController');

router.get('/', getAllDocuments);
router.get('/preview/:type/:id', previewDocumentPDF);
router.delete('/:type/:id', deleteDocument);
router.post('/bulk-download', bulkDownload);

module.exports = router;