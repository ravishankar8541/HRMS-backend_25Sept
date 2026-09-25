const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const pdf = require('./pdfEngine');
const {cloudinary} = require('../config/cloudinary');
module.exports = async data => {
  const logo = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname,'../assets/blackLogo.png')).toString('base64');
  let photo = '';
  if (data.uploadAssets?.photo?.publicId) {
    const url=cloudinary.url(data.uploadAssets.photo.publicId,{resource_type:'image',type:'authenticated',secure:true,sign_url:true});
    const response=await fetch(url,{signal:AbortSignal.timeout(15000)});
    if(!response.ok) throw new Error('Unable to load employee photograph');
    photo=`data:${response.headers.get('content-type')};base64,${Buffer.from(await response.arrayBuffer()).toString('base64')}`;
  } else if(data.photo && !/^https?:/i.test(data.photo)) {
    const filename=path.join(__dirname,'../uploads',path.basename(data.photo));
    if(fs.existsSync(filename))photo='data:image/'+(filename.toLowerCase().endsWith('.png')?'png':'jpeg')+';base64,'+fs.readFileSync(filename).toString('base64');
  }
  const html=await ejs.renderFile(path.join(__dirname,'../templates/onboardingReport.ejs'),{data,logo,photo});
  return new Promise((resolve,reject)=>pdf.create(html,{format:'A4',border:'15mm'}).toBuffer((error,buffer)=>error?reject(error):resolve(buffer)));
};
