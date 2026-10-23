import crypto from 'node:crypto';
import {query,hash,equal,random,auth,cookie,verify,config,signed,remove} from './_lib.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(!config())return res.status(503).json({error:'Configure Neon, Storage e credenciais na Vercel'});
 const b=req.body||{};const action=String(req.query.action||'');
 try{
  if(action==='login'&&req.method==='POST'){
    const match=equal(hash(String(b.password||'')),process.env.ADMIN_PASSWORD_HASH);
    if(!match)return res.status(401).json({error:'Senha incorreta'});
    cookie(res,{role:'admin'});return res.json({ok:true});
  }
  if(action==='logout'&&req.method==='POST'){res.setHeader('Set-Cookie','gi_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');return res.json({ok:true})}
  const session=auth(req);
  if(action==='session'&&req.method==='GET')return res.json({admin:session?.role==='admin'});
  if(action==='gallery'&&req.method==='POST'){
    const token=String(b.token||'');if(!/^[a-f0-9]{64}$/.test(token))return res.status(404).json({error:'Galeria indisponível'});
    const g=(await query("select id,title,client_name,description,event_date,password_hash from gi_galleries where share_token=$1 and status='published'",[token])).rows[0];
    if(!g)return res.status(404).json({error:'Galeria indisponível'});
    let ok=session?.role==='admin'||(session?.role==='guest'&&session.gallery===g.id&&session.passwordVersion===g.password_hash);
    if(!ok&&g.password_hash&&b.password){ok=equal(hash(String(b.password)),g.password_hash)}
    if(!ok)return res.status(401).json({passwordRequired:true,error:'Digite a senha desta galeria'});
    if(g.password_hash&&session?.role!=='admin')cookie(res,{role:'guest',gallery:g.id,passwordVersion:g.password_hash});
    const rows=(await query('select id,file_name,object_key,preview_key from gi_photos where gallery_id=$1 order by created_at limit 1000',[g.id])).rows;
    const photos=await Promise.all(rows.map(async p=>({id:p.id,name:p.file_name,url:await signed('get',p.object_key),previewUrl:p.preview_key?await signed('get',p.preview_key):await signed('get',p.object_key)})));
    return res.json({gallery:{title:g.title,client_name:g.client_name,description:g.description,event_date:g.event_date},photos});
  }
  if(session?.role!=='admin')return res.status(403).json({error:'Acesso restrito'});
  if(action==='list'&&req.method==='GET')return res.json({galleries:(await query('select id,title,client_name,description,event_date,status,share_token,created_at,case when password_hash is not null then true else false end as protected from gi_galleries order by created_at desc')).rows});
  if(action==='create'&&req.method==='POST'){
    const title=String(b.title||'').trim().slice(0,150);if(!b.password||String(b.password).length<8)return res.status(400).json({error:'Informe uma senha com pelo menos 8 caracteres'});if(!title)return res.status(400).json({error:'Informe o evento'});
    const row=(await query('insert into gi_galleries(title,client_name,description,event_date,share_token,password_hash) values($1,$2,$3,$4,$5,$6) returning id',[title,String(b.client_name||'').slice(0,150),String(b.description||'').slice(0,1000),b.event_date||null,random(),b.password?hash(String(b.password)):null])).rows[0];
    return res.json(row);
  }
  if(action==='detail'&&req.method==='GET'){
    const gallery=(await query('select id,title,client_name,description,event_date,status,share_token,case when password_hash is not null then true else false end as protected from gi_galleries where id=$1',[req.query.id])).rows[0];
    if(!gallery)return res.status(404).json({error:'Galeria não encontrada'});
    const photos=(await query('select id,file_name,object_key,preview_key from gi_photos where gallery_id=$1 order by created_at desc',[gallery.id])).rows;
    return res.json({gallery,photos:await Promise.all(photos.map(async p=>({id:p.id,name:p.file_name,url:await signed('get',p.object_key),previewUrl:p.preview_key?await signed('get',p.preview_key):await signed('get',p.object_key)})))});
  }
  if(action==='update'&&req.method==='POST'){
    const id=b.id;
    if(b.status!==undefined){if(!['draft','published'].includes(b.status))return res.status(400).json({error:'Status inválido'});await query('update gi_galleries set status=$2 where id=$1',[id,b.status])}
    if(b.password!==undefined){if(typeof b.password!=='string'||b.password.length<8)return res.status(400).json({error:'A senha precisa de 8 caracteres ou mais'});await query('update gi_galleries set password_hash=$2 where id=$1',[id,hash(String(b.password))])}
    return res.json({ok:true});
  }
  if(action==='sign-upload'&&req.method==='POST'){
    const g=(await query('select id from gi_galleries where id=$1',[b.id])).rows[0];if(!g)return res.status(404).json({error:'Galeria não encontrada'});
    const type=String(b.type||'');if(!['image/jpeg','image/png','image/webp','image/heic','image/heif','image/tiff'].includes(type))return res.status(400).json({error:'Formato não permitido'});
    if(!Number.isSafeInteger(b.size)||b.size<=0||b.size>200*1024*1024)return res.status(400).json({error:'Limite de 200 MB por foto'});
    const name=String(b.name||'foto').slice(0,180);const objectKey=g.id+'/'+crypto.randomUUID();
    return res.json({key:objectKey,url:await signed('put',objectKey,type)});
  }
  if(action==='sign-preview'&&req.method==='POST'){
    const key=String(b.key||'');
    if(!/^[0-9a-f-]{36}\/[0-9a-f-]{36}$/.test(key))return res.status(400).json({error:'Arquivo inválido'});
    const g=(await query('select id from gi_galleries where id=$1',[b.id])).rows[0];
    if(!g||!key.startsWith(g.id+'/'))return res.status(404).json({error:'Galeria não encontrada'});
    const previewKey=key+'.preview.jpg';
    return res.json({key:previewKey,url:await signed('put',previewKey,'image/jpeg')});
  }
  if(action==='confirm-upload'&&req.method==='POST'){
    const key=String(b.key||'');if(!/^[0-9a-f-]{36}\/[0-9a-f-]{36}$/.test(key)||!key.startsWith(b.id+'/'))return res.status(400).json({error:'Arquivo inválido'});
    const previewKey=b.previewKey===key+'.preview.jpg'?b.previewKey:null;await query('insert into gi_photos(gallery_id,file_name,object_key,preview_key) values($1,$2,$3,$4)',[b.id,String(b.name||'foto').slice(0,180),key,previewKey]);return res.json({ok:true});
  }
  if(action==='delete-gallery'&&req.method==='POST'){
    const id=String(b.id||'');
    if(!/^[0-9a-f-]{36}$/.test(id))return res.status(400).json({error:'Galeria inválida'});
    const gallery=(await query('select id,title from gi_galleries where id=$1',[id])).rows[0];
    if(!gallery)return res.status(404).json({error:'Galeria não encontrada'});
    if(b.confirmTitle!==gallery.title)return res.status(400).json({error:'Confirme o nome exato da galeria'});
    const photos=(await query('select object_key,preview_key from gi_photos where gallery_id=$1',[id])).rows;
    for(const p of photos){
      await remove(p.object_key);
      if(p.preview_key)await remove(p.preview_key);
    }
    await query('delete from gi_galleries where id=$1',[id]);
    return res.json({ok:true,deletedPhotos:photos.length});
  }
  if(action==='delete-photo'&&req.method==='POST'){
    const p=(await query('select object_key,preview_key from gi_photos where id=$1',[b.id])).rows[0];
    if(!p)return res.status(404).json({error:'Foto não encontrada'});
    await remove(p.object_key);if(p.preview_key)await remove(p.preview_key);await query('delete from gi_photos where id=$1',[b.id]);return res.json({ok:true});
  }
  return res.status(404).json({error:'Rota indisponível'});
 }catch(err){console.error(err);return res.status(500).json({error:'Erro interno. Verifique as configurações.'})}
}
