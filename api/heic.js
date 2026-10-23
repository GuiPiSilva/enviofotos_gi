import crypto from 'node:crypto';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import {s3,bucket,secret} from './_lib.js';

export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='GET')return res.status(405).end();
 const key=String(req.query.key||'');
 const exp=Number(req.query.exp);
 const sig=String(req.query.sig||'');
 if(!/^[a-f0-9-]{36}\/[a-f0-9-]{36}$/.test(key)||!Number.isSafeInteger(exp)||exp<Math.floor(Date.now()/1000)||exp>Math.floor(Date.now()/1000)+900||!/^[a-f0-9]{64}$/.test(sig)||!secret())return res.status(403).end();
 const expected=crypto.createHmac('sha256',secret()).update(key+':'+exp).digest('hex');
 if(!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return res.status(403).end();
 try{
   const response=await s3().send(new GetObjectCommand({Bucket:bucket(),Key:key}));
   res.statusCode=200;
   res.setHeader('Content-Type','image/heic');
   res.setHeader('X-Content-Type-Options','nosniff');
   if(response.Body&&typeof response.Body.pipe==='function'){
     response.Body.on('error',()=>{if(!res.headersSent)res.status(502);res.end()});
     response.Body.pipe(res);
     return;
   }
   return res.status(502).end();
 }catch(e){console.error('heic-proxy',e?.name||'failed');return res.status(404).end()}
}
