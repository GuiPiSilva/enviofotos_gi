import crypto from 'node:crypto';
import pg from 'pg';
import { S3Client,PutObjectCommand,GetObjectCommand,DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:true},max:3});
export const query=(s,p=[])=>pool.query(s,p);
export const secret=()=>process.env.SESSION_SECRET;
export const hash=s=>crypto.scryptSync(s,'gi-gallery-v1',64).toString('hex');
export const equal=(a,b)=>a?.length===b?.length&&crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));
export const random=()=>crypto.randomBytes(32).toString('hex');
export const s3=()=>new S3Client({region:process.env.AWS_REGION,endpoint:process.env.AWS_ENDPOINT_URL_S3,forcePathStyle:true,credentials:{accessKeyId:process.env.AWS_ACCESS_KEY_ID,secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY}});
export const bucket=()=>process.env.STORAGE_BUCKET||'gi-fotos';
export const signed=(kind,key,ct)=>getSignedUrl(s3(),kind==='put'?new PutObjectCommand({Bucket:bucket(),Key:key,ContentType:ct}):new GetObjectCommand({Bucket:bucket(),Key:key}),{expiresIn:kind==='put'?300:180});
export const remove=key=>s3().send(new DeleteObjectCommand({Bucket:bucket(),Key:key}));
export function token(data){const b=Buffer.from(JSON.stringify(data)).toString('base64url');return b+'.'+crypto.createHmac('sha256',secret()).update(b).digest('base64url')}
export function verify(s){try{const [b,sig]=s.split('.');const match=crypto.createHmac('sha256',secret()).update(b).digest('base64url');if(!equal(sig,match))return null;const data=JSON.parse(Buffer.from(b,'base64url').toString());if(data.exp<Date.now())return null;return data}catch{return null}}
export function auth(req){return verify((req.headers.cookie||'').match(/gi_session=([^;]+)/)?.[1]||'')}
export function cookie(res,data){res.setHeader('Set-Cookie','gi_session='+token({...data,exp:Date.now()+7*864e5})+'; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800')}
export const config=()=>Boolean(process.env.DATABASE_URL&&secret()&&process.env.ADMIN_PASSWORD_HASH&&process.env.AWS_ACCESS_KEY_ID&&process.env.AWS_SECRET_ACCESS_KEY&&process.env.AWS_ENDPOINT_URL_S3&&process.env.AWS_REGION);
