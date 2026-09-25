require('dotenv').config({quiet:true});
const assert=require('node:assert/strict');
const {cloudinary}=require('../config/cloudinary');
const generate=require('../utils/generateFNFPDF');
(async()=>{
 const buffer=await generate({employeeName:'Integration Test',email:'test@example.invalid',dateOfJoining:'2024-01-01',lastWorkingDay:'2026-09-23',pendingSalary:100,gratuity:50,noticeRecovery:10,deductions:5,totalPayable:135,status:'Approved'});
 assert.equal(buffer.subarray(0,5).toString(),'%PDF-');console.log('Chromium FnF PDF: OK');
 let asset;
 try {
  asset=await new Promise((resolve,reject)=>cloudinary.uploader.upload_stream({folder:'hrms/test',resource_type:'raw',type:'authenticated'},(err,result)=>err?reject(err):resolve(result)).end(buffer));
  const url=cloudinary.utils.private_download_url(asset.public_id,'',{resource_type:'raw',type:'authenticated',expires_at:Math.floor(Date.now()/1000)+60});
  const response=await fetch(url,{signal:AbortSignal.timeout(15000)});assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),buffer);console.log('Private Cloudinary PDF upload/download byte equality: OK');
 } finally {if(asset)await cloudinary.uploader.destroy(asset.public_id,{resource_type:'raw',type:'authenticated'});}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
