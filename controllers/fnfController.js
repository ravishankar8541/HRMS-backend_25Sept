const archive = require('../utils/documentArchive');
const FNF = require('../models/FNF');
const sendFNF = require('../utils/fnfEmailService');
const { calculate, validateDates } = require('../utils/fnfCalculation');
const createFNFRecord = async (req,res) => {
 const body=req.body;
 for (const key of ['employeeId','employeeName','email','phone']) if(typeof body[key] !== 'string' || !body[key].trim()) return res.status(400).json({message:key+' is required'});
 if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return res.status(400).json({message:'Valid email required'});
 validateDates(body);
 const amounts=calculate(body);
 const values={...amounts};
 for(const key of ['employeeId','employeeName','email','phone','dateOfJoining','lastWorkingDay','designation','address','bankAccount','ifsc','remarks']) if(body[key] !== undefined) values[key]=String(body[key]).trim();
 for(const key of ['laptopReturned','idCardReturned','clearanceApproved']) values[key]=body[key] === true;
 values.employeeId=values.employeeId.toUpperCase();
 let data;
 if (req.params.id) {
  data=await FNF.findOneAndUpdate({_id:req.params.id,deletedAt:null,status:{$in:['Draft','Approved','Settled']}},{$set:{...values,status:'Draft'},$unset:{approvedBy:1}},{new:true,runValidators:true});
  if(!data) return res.status(409).json({message:'This settlement cannot be edited; create a new draft for a paid settlement'});
 } else data=await FNF.create(values);
 const snapshot=await archive.ensure('FNF Settlement',data);
 res.status(201).json({success:true,data,documentId:snapshot._id});
};
const updateStatus = async (req,res) => {
 const record=await FNF.findById(req.params.id);
 if(!record || record.deletedAt) return res.status(404).json({message:'Settlement not found'});
 const target=req.body.status;
 if(!((record.status === 'Draft' && target === 'Approved') || (record.status === 'Approved' && target === 'Disbursed'))) return res.status(409).json({message:'Only Draft → Approved → Disbursed transitions are allowed'});
 const update={status:target};
 if(target === 'Approved') {
   if(!record.laptopReturned || !record.idCardReturned || !record.clearanceApproved) return res.status(400).json({message:'Complete asset returns and HR clearance before approval'});
   update.approvedBy=String(req.user._id);
 } else {
   if(record.totalPayable <= 0) return res.status(400).json({message:'No positive amount to disburse; reconcile recovery with payroll'});
   if(!String(req.body.paymentReference || '').trim()) return res.status(400).json({message:'Payment reference is required'});
   update.paymentReference=String(req.body.paymentReference).trim(); update.paidAt=new Date();
 }
 const data=await FNF.findOneAndUpdate({_id:record._id,status:record.status,deletedAt:null},{$set:update},{new:true,runValidators:true});
 if(!data) return res.status(409).json({message:'Settlement changed; refresh and try again'});
 res.json({success:true,data});
};
const sendEmail = async (req,res) => {
 const record=await FNF.findById(req.params.id);
 if(!record || record.deletedAt) return res.status(404).json({message:'Settlement not found'});
 if(!['Approved','Disbursed'].includes(record.status)) return res.status(409).json({message:'Approve the settlement before sending'});
 const data=await archive.emailData('FNF Settlement',record);
 if(req.body.documentId && String(req.body.documentId)!==String(data._snapshotId)) return res.status(409).json({message:'Settlement changed. Reopen the preview before sending.'});
 await sendFNF(record.email,data);
 res.json({success:true,message:'Statement sent',sentTo:record.email});
};
const deleteRecord = async (req,res) => {
 const record=await FNF.findOneAndUpdate({_id:req.params.id,deletedAt:null},{$set:{deletedAt:new Date()}},{new:true});
 if(!record) return res.status(404).json({message:'Settlement not found'});
 res.json({success:true,message:'Settlement removed. Archived PDFs are retained.'});
};
module.exports={createFNFRecord,updateStatus,sendEmail,deleteRecord};
