const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calculate, validateDates } = require('../utils/fnfCalculation');
const Delivery = require('../models/DocumentDelivery');
const documents = require('../controllers/documentController');
const FNF = require('../models/FNF');
const fnf = require('../controllers/fnfController');
const response = () => ({ code: 200, status(code) { this.code=code; return this; }, set() {return this;}, json(body) {this.body=body;return this;} });

test('FnF ignores browser total and includes gratuity and recoveries in paise', () => {
  assert.equal(calculate({pendingSalary:100.10,leaveEncashment:0.20,gratuity:50,noticeRecovery:20,deductions:0.30,totalPayable:999999}).totalPayable,130);
  assert.equal(calculate({pendingSalary:0}).totalPayable,0);
  assert.equal(calculate({deductions:100}).totalPayable,-100);
  for(const value of [-1,'oops',Infinity,{},true,1e10]) assert.throws(()=>calculate({pendingSalary:value}));
});
test('FnF rejects invalid calendar dates and reversed employment dates', () => {
  for(const lastWorkingDay of ['2025-02-29','2025-01-01','invalid']) assert.throws(()=>validateDates({dateOfJoining:'2025-02-01',lastWorkingDay}));
  validateDates({dateOfJoining:'2024-02-29',lastWorkingDay:'2024-02-29'});
});
test('employee wallet ignores caller supplied email', async t => {
  let filter;
  t.mock.method(Delivery,'find',value => {filter=value;return {select(){return this;},sort(){return this;},lean:async()=>[]};});
  const res=response();
  await documents.getAllDocuments({user:{email:' Owner@Example.com ',role:'employee'},query:{email:'victim@example.com'}},res);
  assert.deepEqual(filter,{deletedAt:null,recipient:'owner@example.com',status:'Sent'});
  assert.equal(res.body.count,0);
});
test('cross-user preview and bulk downloads are denied before cloud access',async t=>{
  t.mock.method(Delivery,'findOne',filter=>{assert.equal(filter.recipient,'owner@example.com');return {lean:async()=>null};});
  t.mock.method(Delivery,'find',filter=>{assert.equal(filter.recipient,'owner@example.com');return {lean:async()=>[]};});
  const req={user:{email:'owner@example.com'},params:{id:'507f1f77bcf86cd799439011',type:'Offer Letter'},body:{documents:[{_id:'507f1f77bcf86cd799439011'}]}};
  const preview=response();await documents.previewDocumentPDF(req,preview);assert.equal(preview.code,404);
  const bulk=response();await documents.bulkDownload(req,bulk);assert.equal(bulk.code,404);
});
test('FnF approval requires all clearances and draft emails are blocked',async t=>{
  t.mock.method(FNF,'findById',async()=>({status:'Draft',laptopReturned:false}));
  const res=response();await fnf.updateStatus({params:{id:'x'},body:{status:'Approved'}},res);assert.equal(res.code,400);
  const send=response();await fnf.sendEmail({params:{id:'x'}},send);assert.equal(send.code,409);
});
test('FnF cannot skip approval or disburse without a payment reference',async t=>{
  t.mock.method(FNF,'findById',async()=>({status:'Draft'}));
  const res=response();await fnf.updateStatus({params:{id:'x'},body:{status:'Disbursed'}},res);assert.equal(res.code,409);
});
test('all sensitive HTTP endpoints require authentication',async t=>{
  const app=require('../api/index');
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  for(const path of ['/api/employee','/api/documents','/api/fnf','/api/offboarding','/uploads/test.pdf']) {
    const res=await fetch(`http://127.0.0.1:${server.address().port}${path}`);
    assert.equal(res.status,401,path);
  }
});

test('authentication reloads the account role instead of trusting token claims',async t=>{
  const User=require('../models/User');
  const jwt=require('jsonwebtoken');
  const {authenticate,staffOnly}=require('../middleware/auth');
  t.mock.method(User,'findById',()=>({lean:async()=>({_id:'x',role:'employee',email:'owner@example.com'})}));
  const token=jwt.sign({id:'x',role:'admin'},process.env.JWT_SECRET || 'test-only-secret');
  const req={headers:{authorization:'Bearer '+token}};const res=response();let called=false;
  await authenticate(req,res,()=>{called=true;});assert.equal(called,true);
  staffOnly(req,res,()=>assert.fail('employee cannot access staff route'));assert.equal(res.code,403);
});

test('all six document templates render with their production generators',async t=>{
  const engine=require('../utils/pdfEngine');
  t.mock.method(engine,'create',html=>({toBuffer(callback){assert.ok(html.includes('<html'));callback(null,Buffer.from('%PDF-test'));}}));
  const data={employeeName:'Test Employee',name:'Test Employee',email:'test@example.invalid',employeeId:'TEST',offerId:'TEST',position:'Engineer',salary:10000,joiningDate:'2024-01-01',dateOfJoining:'2024-01-01',lastWorkingDay:'2026-09-23',lastWorkingDate:'2026-09-23',currentSalary:10000,newSalary:12000,incrementPercentage:20,effectiveDate:'2026-01-01',hrName:'HR',fathersName:'Test',address:'Test',phone:'1234567890',phoneNumber:'1234567890',emailId:'test@example.invalid',department:'Engineering',incrementId:'INC-TEST',totalPayable:0};
  for(const generator of ['pdfGenerator','incrementPdfGenerator','terminationPdfGenerator','generateFNFPDF','salarySlipPdfGenerator']) assert.ok((await require('../utils/'+generator)(data)).length,generator);
  assert.ok((await require('../utils/appointmentEmailService').generateAppointmentPDFBuffer(data)).length);
});
