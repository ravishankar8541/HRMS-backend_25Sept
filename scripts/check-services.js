require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const {cloudinary}=require('../config/cloudinary');
const nodemailer=require('nodemailer');
async function check(name,action) {try{await action();console.log(name+': OK');}catch(error){console.log(name+': FAILED ('+(error.code || error.name || 'service error')+')');process.exitCode=1;}}
(async()=>{
 await Promise.all([
 check('MongoDB',async()=>{await mongoose.connect(process.env.MONGO_URI,{serverSelectionTimeoutMS:10000});await mongoose.connection.db.admin().ping();await mongoose.disconnect();}),
 check('Cloudinary',()=>cloudinary.api.ping({timeout:10000})),
 check('SMTP authentication',()=>{const port=Number(process.env.SMTP_PORT || 465);return nodemailer.createTransport({host:process.env.SMTP_HOST || 'smtp.titan.email',port,secure:port===465,connectionTimeout:10000,greetingTimeout:10000,socketTimeout:10000,auth:{user:process.env.EMAIL_USER,pass:process.env.EMAIL_PASS}}).verify();})
 ]);
})();
