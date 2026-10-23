import { createClient } from '@supabase/supabase-js';
const JSON_HEADERS = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' };
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method !== 'GET') return res.status(405).json({error:'Método não permitido'});
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if(!/^[a-f0-9]{64}$/.test(token)) return res.status(404).json({error:'Galeria não encontrada'});
  const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url || !key) return res.status(503).json({error:'Galeria não configurada'});
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:gallery,error}=await db.from('galleries').select('id,title,client_name,description,event_date,created_at,expires_at,status').eq('share_token',token).eq('status','published').maybeSingle();
  if(error || !gallery || (gallery.expires_at && new Date(gallery.expires_at)<=new Date())) return res.status(404).json({error:'Link inválido ou expirado'});
  const {data:photos,error:err}=await db.from('photos').select('id,file_name,storage_path,created_at').eq('gallery_id',gallery.id).order('created_at',{ascending:true}).limit(1000);
  if(err) return res.status(500).json({error:'Não foi possível carregar as fotos'});
  const output=await Promise.all((photos||[]).map(async p=>{
    const {data}=await db.storage.from('gi-fotos').createSignedUrl(p.storage_path,600);
    return {id:p.id,name:p.file_name,url:data?.signedUrl||null};
  }));
  return res.status(200).json({gallery:{title:gallery.title,description:gallery.description,event_date:gallery.event_date,client_name:gallery.client_name},photos:output.filter(p=>p.url)});
}
