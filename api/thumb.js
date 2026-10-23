import crypto from 'node:crypto';
import { Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import sharp from 'sharp';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import {s3,bucket,query,secret,signed} from './_lib.js';

// Preview tokens are created by the gallery API only after authentication.
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, max-age=600');
 if(req.method!=='GET')return res.status(405).end();
 const key=String(req.query.key||'');
 const exp=Number(req.query.exp);
 const sig=String(req.query.sig||'');
 const now=Math.floor(Date.now()/1000);
 if(!/^[a-f0-9-]{36}\/[a-f0-9-]{36}$/.test(key)||
    !Number.isSafeInteger(exp)||exp<now||exp>now+3700||
    !/^[a-f0-9]{64}$/.test(sig)||!secret())return res.status(403).end();
 const expected=crypto.createHmac('sha256',secret()).update('thumb:'+key+':'+exp).digest('hex');
 if(!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return res.status(403).end();
 try{
   const record=(await query('select preview_key from gi_photos where object_key=$1',[key])).rows[0];
   if(!record)return res.status(404).end();
   if(record.preview_key){
     res.setHeader('Cache-Control','private, no-store');
     return res.redirect(302,await signed('get',record.preview_key));
   }
   const source=await s3().send(new GetObjectCommand({Bucket:bucket(),Key:key}));
   const chunks=[];
   const destination=new Writable({write(chunk,encoding,callback){chunks.push(chunk);callback()}});
   const transform=sharp({limitInputPixels:240000000})
      .rotate()
      .resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true})
      .jpeg({quality:78,mozjpeg:true});
   await pipeline(source.Body,transform,destination);
   const jpeg=Buffer.concat(chunks);
   if(!jpeg.length)throw Error('Empty preview');
   const newKey=key+'.preview.jpg';
   await s3().send(new PutObjectCommand({Bucket:bucket(),Key:newKey,Body:jpeg,ContentType:'image/jpeg'}));
   await query('update gi_photos set preview_key=$2 where object_key=$1 and preview_key is null',[key,newKey]);
   res.setHeader('Content-Type','image/jpeg');
   res.setHeader('X-Content-Type-Options','nosniff');
   return res.status(200).send(jpeg);
 }catch(error){
   console.error('thumbnail-generation',error?.name||'unknown');
   return res.status(422).json({error:'Não foi possível preparar a prévia deste arquivo.'});
 }
}
