const Delivery = require('../models/DocumentDelivery');
const mongoose = require('mongoose');
const {ensure,readPDF}=require('../utils/documentArchive');
const isStaff = user => ['admin','hr'].includes(user.role);
const scope = user => ({deletedAt: null, ...(isStaff(user) ? {} : {recipient:String(user.email || '').trim().toLowerCase(),status:'Sent'})});
exports.getAllDocuments = async (req, res) => {
 const filter = scope(req.user);
 if (isStaff(req.user) && req.query.email) filter.recipient=String(req.query.email).trim().toLowerCase();
 if (isStaff(req.user) && req.query.status) filter.status=String(req.query.status);
 if (req.query.from || req.query.to) {
  filter.createdAt={};
  for(const [key,operator] of [['from','$gte'],['to','$lt']]) if(req.query[key]) {
   const date=new Date(String(req.query[key]));
   if(!Number.isFinite(date.getTime())) return res.status(400).json({message:'Invalid date filter'});
   if(key==='to')date.setUTCDate(date.getUTCDate()+1);
   filter.createdAt[operator]=date;
  }
 }
 if (req.query.type && req.query.type !== 'ALL') filter.docType = String(req.query.type);
 const docs = await Delivery.find(filter).select('-publicId -snapshotKey -__v').sort({createdAt:-1}).lean();
 const search = String(req.query.search || '').toLowerCase();
 const data = docs.filter(d => !search || [d.employeeName,d.refNo,d.recipient].some(v => String(v || '').toLowerCase().includes(search)))
 .map(d => ({...d,email:d.recipient,date:d.sentAt || d.createdAt}));
 res.set('Cache-Control','private, no-store').json({success:true,count:data.length,data});
};
exports.previewDocumentPDF = async (req,res) => {
 if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({message:'Invalid document ID'});
 const doc = await Delivery.findOne({...scope(req.user),_id:req.params.id,docType:req.params.type}).lean();
 if (!doc) return res.status(404).json({message:'Document not found'});
 const buffer = await readPDF(doc);
 res.set({'Content-Type':'application/pdf','Cache-Control':'private, no-store','Content-Disposition':'inline; filename="document.pdf"'}).send(buffer);
};
exports.deleteDocument = async (req,res) => {
 if (!isStaff(req.user)) return res.status(403).json({message:'HR access required'});
 if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({message:'Invalid document ID'});
 // Delivery rows can share one PDF asset. Remove only this vault entry.
 const doc = await Delivery.findOneAndUpdate({_id:req.params.id,docType:req.params.type,deletedAt:null}, {$set:{deletedAt:new Date()}}, {new:true});
 if (!doc) return res.status(404).json({message:'Document not found'});
 return res.json({success:true,message:'Document removed from the vault'});
};
exports.bulkDownload = async (req,res) => {
 const items = req.body.documents;
 if (!Array.isArray(items) || !items.length || items.length > 25 || items.some(i=>!mongoose.isValidObjectId(i._id))) return res.status(400).json({message:'Select 1–25 valid documents'});
 const docs = await Delivery.find({...scope(req.user),_id:{$in:items.map(i=>i._id)}}).lean();
 if (docs.length !== new Set(items.map(i=>i._id)).size) return res.status(404).json({message:'Document not found'});
 // Authorize and fetch everything before streaming; never silently omit failed files.
 const buffers=[]; for (const doc of docs) buffers.push(await readPDF(doc));
 const { ZipArchive } = await import('archiver');
 const archive = new ZipArchive({zlib:{level:1}});
 archive.on('error',err=>res.destroy(err));
 res.on('close',()=>archive.abort());
 res.set('Cache-Control','private, no-store').attachment('Documents.zip'); archive.pipe(res);
 docs.forEach((doc,i)=>archive.append(buffers[i],{name:doc._id+'_'+String(doc.filename).replace(/[^a-zA-Z0-9_.-]/g,'_')}));
 await archive.finalize();
};
exports.scope = scope;

exports.getDocumentSource = async (req,res) => {
 if (!isStaff(req.user)) return res.status(403).json({message:'HR access required'});
 if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({message:'Invalid document ID'});
 const doc = await Delivery.findOne({_id:req.params.id,docType:req.params.type,deletedAt:null}).lean();
 if (!doc) return res.status(404).json({message:'Document not found'});
 const models={'Onboarding Report':'Employee','Offer Letter':'OfferLetter','Appointment Letter':'AppointmentLetter','Increment Letter':'IncrementLetter','Salary Slip':'SalarySlip','Termination Letter':'TerminationLetter','FNF Settlement':'FNF'};
 const model=models[doc.docType];
 if (!model || !mongoose.isValidObjectId(doc.sourceId)) return res.status(404).json({message:'The source for this document is no longer available'});
 const record = await require('../models/'+model).findById(doc.sourceId).lean();
 if (!record || record.deletedAt) return res.status(404).json({message:'The source for this document is no longer available'});
 res.set('Cache-Control','private, no-store').json({success:true,data:record});
};

exports.previewSource = async (req,res) => {
 const models={'Onboarding Report':'Employee','Offer Letter':'OfferLetter','Appointment Letter':'AppointmentLetter','Increment Letter':'IncrementLetter','Salary Slip':'SalarySlip','Termination Letter':'TerminationLetter','FNF Settlement':'FNF'};
 const model=models[req.params.type];
 if(!model || !mongoose.isValidObjectId(req.params.id)) return res.status(400).json({message:'Invalid document'});
 const record=await require('../models/'+model).findById(req.params.id);
 if(!record || record.deletedAt) return res.status(404).json({message:'Document not found'});
 const snapshot=await ensure(req.params.type,record);
 res.set({'Content-Type':'application/pdf','X-Document-Id':String(snapshot._id),'Cache-Control':'private, no-store','Content-Disposition':'inline; filename="document.pdf"'}).send(await readPDF(snapshot));
};
