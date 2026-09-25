const express = require('express');
const router = express.Router();
const {
  getAllDocuments,
  previewDocumentPDF,
  bulkDownload,
  deleteDocument,
} = require('../controllers/documentController');

router.get('/', getAllDocuments);
router.get('/edit/:type/:id', require('../middleware/auth').staffOnly, require('../controllers/documentController').getDocumentSource);
router.get('/source/:type/:id', require('../middleware/auth').staffOnly, require('../controllers/documentController').previewSource);
router.get('/preview/:type/:id', previewDocumentPDF);
router.delete('/:type/:id', require('../middleware/auth').staffOnly, deleteDocument);
router.post('/bulk-download', bulkDownload);

module.exports = router;
