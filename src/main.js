import './style.css';
import heic2any from 'heic2any';
const app=document.getElementById('app');
const linkToken=new URLSearchParams(location.search).get('g');
const logo='/logo-gi.svg';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const brand='<a href="/" class="brand"><img src="'+logo+'" alt="Símbolo oficial G&I Agência" class="official-logo"><span class="brand-name">G&I AGÊNCIA <small>GALERIAS</small></span></a>';
const date=x=>x?new Date(x.slice(0,10)+'T12:00:00').toLocaleDateString('pt-BR'):'';
const state={galleries:[],active:null};
const isHeic=p=>/\.hei[cf]$/i.test(p.name||'');
const needsHeicPreview=p=>isHeic(p)&&(!p.previewUrl||p.previewUrl===p.url);
function photoPreview(p){
 const label=esc(p.name);
 if(needsHeicPreview(p))return '<div class="heic-preview" data-original-url="'+esc(p.url)+'"><span>PREPARANDO FOTO HEIC...</span><img alt="'+label+'" hidden></div>';
 return '<img loading="lazy" src="'+esc(p.previewUrl||p.url)+'" alt="'+label+'">';
}
async function renderMissingHeicPreviews(){
 const containers=[...document.querySelectorAll('.heic-preview[data-original-url]')];
 for(const element of containers){
   if(!element.isConnected)continue;
   try{
     const response=await fetch(element.dataset.originalUrl);
     if(!response.ok)throw Error('Arquivo indisponível');
     const blob=await response.blob();
     const converted=await heic2any({blob,toType:'image/jpeg',quality:0.86});
     if(!element.isConnected)continue;
     const preview=Array.isArray(converted)?converted[0]:converted;
     const url=URL.createObjectURL(preview);
     const img=element.querySelector('img');img.onload=()=>{element.querySelector('span').hidden=true};img.src=url;img.hidden=false;
     img.addEventListener('error',()=>URL.revokeObjectURL(url),{once:true});
   }catch(err){
     if(element.isConnected)element.querySelector('span').textContent='PRÉVIA INDISPONÍVEL · BAIXE O ORIGINAL';
     console.warn('HEIC preview',err);
   }
 }
}


let clientPhotos=[],favoriteOnly=false;
const favoritesKey=()=> 'gi-favorites:'+String(linkToken||'');
function getFavorites(){try{return new Set(JSON.parse(localStorage.getItem(favoritesKey())||'[]'))}catch{return new Set()}}
function toggleFavorite(id){const v=getFavorites();v.has(id)?v.delete(id):v.add(id);localStorage.setItem(favoritesKey(),JSON.stringify([...v]));drawFavorites()}
function drawFavorites(){
 const v=getFavorites();
 document.querySelectorAll('[data-favorite]').forEach(b=>{const yes=v.has(b.dataset.favorite);b.textContent=yes?'♥':'♡';b.setAttribute('aria-pressed',String(yes));b.setAttribute('aria-label',yes?'Remover dos favoritos':'Adicionar aos favoritos')});
 const count=document.getElementById('favorite-count');if(count)count.textContent=v.size+' FAVORITAS';
 document.querySelectorAll('.photo-card[data-photo-id]').forEach(c=>{c.hidden=Boolean(favoriteOnly&&!v.has(c.dataset.photoId))});
 const filter=document.getElementById('favorite-filter');if(filter){filter.textContent=favoriteOnly?'VER TODAS AS FOTOS':'VER FAVORITAS';filter.setAttribute('aria-pressed',String(favoriteOnly))}
}
function setupClientGallery(photos){
 clientPhotos=photos;favoriteOnly=false;
 const fav=document.getElementById('favorite-filter');if(fav)fav.onclick=()=>{favoriteOnly=!favoriteOnly;drawFavorites()};
 document.querySelectorAll('[data-favorite]').forEach(b=>b.onclick=()=>toggleFavorite(b.dataset.favorite));
 document.querySelectorAll('[data-view-photo]').forEach(b=>b.onclick=()=>openLightbox(Number(b.dataset.viewPhoto)));
 drawFavorites();
}
function openLightbox(index){
 const p=clientPhotos[index];if(!p)return;
 let d=document.getElementById('gi-photo-lightbox');
 if(!d){d=document.createElement('dialog');d.id='gi-photo-lightbox';d.className='photo-lightbox';document.body.append(d)}
 const item=()=>{const photo=clientPhotos[index];return '<div class="lightbox-toolbar"><span>'+esc(photo.name)+'</span><div><button type="button" id="lightbox-prev" aria-label="Foto anterior">←</button><span>'+(index+1)+' / '+clientPhotos.length+'</span><button type="button" id="lightbox-next" aria-label="Próxima foto">→</button><button type="button" id="lightbox-close" aria-label="Fechar">✕</button></div></div><div class="lightbox-image">'+photoPreview(photo)+'</div><div class="lightbox-bottom"><button type="button" id="lightbox-favorite">'+(getFavorites().has(photo.id)?'♥ REMOVER FAVORITO':'♡ FAVORITAR')+'</button><a href="'+esc(photo.url)+'" target="_blank" rel="noopener noreferrer" download="'+esc(photo.name)+'">↓ BAIXAR ORIGINAL</a></div>'};
 const draw=()=>{d.innerHTML=item();d.querySelector('#lightbox-close').onclick=()=>d.close();d.querySelector('#lightbox-prev').onclick=()=>{index=(index-1+clientPhotos.length)%clientPhotos.length;draw()};d.querySelector('#lightbox-next').onclick=()=>{index=(index+1)%clientPhotos.length;draw()};d.querySelector('#lightbox-favorite').onclick=()=>{toggleFavorite(clientPhotos[index].id);draw()};renderMissingHeicPreviews()};
 draw();if(!d.open)d.showModal();
 d.onkeydown=e=>{if(e.key==='ArrowLeft'){e.preventDefault();index=(index-1+clientPhotos.length)%clientPhotos.length;draw()}else if(e.key==='ArrowRight'){e.preventDefault();index=(index+1)%clientPhotos.length;draw()}};
}

const adminMenu=[
  ['collections','▣','Coleções'],
  ['library','▦','Biblioteca'],
  ['favorites','☆','Favoritos'],
  ['homepage','▤','Página inicial'],
  ['settings','⚙','Configurações'],
  ['marketing','↗','Compartilhar'],
];
function shell(html,admin=false){
 if(!admin){
   app.innerHTML='<header class="site-header"><div class="header-inner">'+brand+'<span class="header-tag">FOTOGRAFIA E MEMÓRIAS</span></div></header>'+html+'<footer class="footer"><span>© 2026 G&I AGÊNCIA</span><span>DO SEU SONHO À SUA MARCA.</span></footer>';
   return;
 }
 const buttons=adminMenu.map(([id,icon,label])=>'<button type="button" class="studio-nav '+(state.nav===id?'active':'')+'" data-menu="'+id+'"><span class="studio-menu-icon">'+icon+'</span><span>'+label+'</span></button>').join('');
 app.innerHTML='<div class="studio-shell"><aside class="studio-sidebar"><div class="studio-sidebar-brand">'+brand+'</div><nav>'+buttons+'</nav><div class="studio-sidebar-footer">G&I AGÊNCIA<small>FOTOS ORIGINAIS, ACESSO PROTEGIDO</small></div></aside><div class="studio-main"><div class="studio-topbar"><span>CLIENT GALLERY / G&I AGÊNCIA</span><span>ÁREA ADMINISTRATIVA</span></div>'+html+'</div></div>';
 document.querySelectorAll('[data-menu]').forEach(el=>el.onclick=()=>({
  collections:dashboard,library:libraryPage,favorites:favoritesPage,
  homepage:homepagePage,settings:settingsPage,marketing:marketingPage
 }[el.dataset.menu]||dashboard)());
}
async function ensureCollections(){state.galleries=(await api('list')).galleries;return state.galleries}
function galleryTile(g){
 const cover=g.coverUrl?'<img loading="lazy" src="'+esc(g.coverUrl)+'" alt="Capa de '+esc(g.title)+'">':'<span class="tile-empty"><img src="/logo-gi.svg" alt=""><small>COLEÇÃO G&I</small></span>';
 return '<article class="collection-tile"><button class="tile-image" data-open="'+esc(g.id)+'" aria-label="Abrir '+esc(g.title)+'">'+cover+'</button><div class="tile-body"><div><button class="tile-title" data-open="'+esc(g.id)+'">'+esc(g.title)+'</button><p>'+esc(g.client_name||'Cliente')+' · '+esc(date(g.event_date)||'Sem data')+'</p><small>'+Number(g.photo_count||0)+' foto(s) · '+(g.status==='published'?'Publicada':'Rascunho')+'</small></div><button class="tile-star '+(g.starred?'selected':'')+'" data-star="'+esc(g.id)+'" aria-label="'+(g.starred?'Remover dos favoritos':'Adicionar aos favoritos')+'">'+(g.starred?'★':'☆')+'</button></div></article>';
}
function wireCollectionTiles(repaint){
 document.querySelectorAll('[data-open]').forEach(el=>el.onclick=()=>detail(el.dataset.open));
 document.querySelectorAll('[data-star]').forEach(el=>el.onclick=async()=>{
  const g=state.galleries.find(x=>x.id===el.dataset.star);
  if(!g)return;
  el.disabled=true;
  try{await api('update',{id:g.id,starred:!g.starred});g.starred=!g.starred;repaint()}catch(err){warn(err);el.disabled=false}
 });
}
async function settingsPage(){
 state.nav='settings';
 try{
  await ensureCollections();
  shell('<main class="admin studio-page"><div class="studio-page-heading"><div><h1>Configurações</h1><p>Personalização da G&I Galerias.</p></div></div><div class="settings-tabs"><button data-tab="brand" class="active">Marca</button><button data-tab="watermark">Marca d’água</button><button data-tab="defaults">Predefinições</button></div><section id="settings-content" class="settings-panel"></section></main>',true);
  const render=tab=>{
   document.querySelectorAll('[data-tab]').forEach(el=>el.classList.toggle('active',el.dataset.tab===tab));
   const area=document.getElementById('settings-content');
   if(tab==='brand')area.innerHTML='<h2>Identidade da marca</h2><p>Logo oficial utilizada no painel e nas galerias.</p><div class="brand-preview"><img src="/logo-gi.svg" alt="Logo G&I Agência"></div><p><strong>G&I AGÊNCIA</strong><br>Do seu sonho à sua marca.</p>';
   if(tab==='defaults')area.innerHTML='<h2>Predefinições das coleções</h2><p>As novas coleções começam em rascunho, protegidas por senha, e preservam os arquivos originais.</p><p>Você pode escolher quatro estilos de capa ao criar uma coleção e alterar depois.</p>';
   if(tab==='watermark'){
    area.innerHTML='<h2>Marca d’água nas prévias</h2><p>Escolha em quais coleções mostrar a assinatura G&I. O download original não é alterado.</p><div class="watermark-settings">'+state.galleries.map(g=>'<label class="watermark-row"><span>'+esc(g.title)+'</span><input type="checkbox" data-mark="'+esc(g.id)+'" '+(g.watermark_enabled?'checked':'')+'></label>').join('')+'</div>';
    document.querySelectorAll('[data-mark]').forEach(el=>el.onchange=async()=>{el.disabled=true;try{await api('update',{id:el.dataset.mark,watermark_enabled:el.checked});const g=state.galleries.find(x=>x.id===el.dataset.mark);if(g)g.watermark_enabled=el.checked}catch(err){warn(err);el.checked=!el.checked}finally{el.disabled=false}});
   }
  };
  document.querySelectorAll('[data-tab]').forEach(el=>el.onclick=()=>render(el.dataset.tab));
  render('brand');
 }catch(err){warn(err);dashboard()}
}
function btn(t,id,cls=''){return '<button class="btn '+cls+'" id="'+id+'">'+t+'</button>'}
const warn=e=>alert(e.message||e);
const notify=message=>alert(message);
async function api(action,body,params={}){const url=new URL('/api/service',location.origin);url.searchParams.set('action',action);for(const [k,v] of Object.entries(params))url.searchParams.set(k,v);const r=await fetch(url,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),credentials:'same-origin',cache:'no-store'});const j=await r.json();if(!r.ok)throw Object.assign(new Error(j.error||'Erro de comunicação'),{status:r.status});return j}
async function publicGallery(password=''){
 try{const {gallery:g,photos}=await api('gallery',{token:linkToken,password});shell('<main class="public '+esc('cover-'+(g.cover_style||'classic'))+'"><section class="hero"><span class="eyebrow">UMA HISTÓRIA EM CADA IMAGEM / G&I</span><div class="hero-split"><div><h1>'+esc(g.title).toUpperCase()+'<span class="dot">.</span></h1><p>'+esc(g.description||'Momentos especiais merecem ser lembrados para sempre.')+'</p></div><div class="hero-meta"><span>GALERIA EXCLUSIVA</span><strong>'+esc(g.client_name||'SEUS MOMENTOS')+'</strong><small>'+esc(date(g.event_date))+'</small><small>'+photos.length+' FOTOS ORIGINAIS</small></div></div></section><section class="gallery-section"><div class="section-head"><div><span class="eyebrow">01 / ACERVO</span><h2>SEUS MOMENTOS</h2></div><span>ALTA RESOLUÇÃO</span></div><div class="client-actions"><span id="favorite-count">0 FAVORITAS</span><button id="favorite-filter" type="button">VER FAVORITAS</button></div><div class="masonry">'+(photos.map((p,i)=>'<div class="photo-card '+(g.watermark_enabled?'watermarked':'')+'" data-photo-id="'+esc(p.id)+'"><button type="button" class="photo-view" data-view-photo="'+i+'" aria-label="Ampliar '+esc(p.name)+'">'+photoPreview(p)+'</button><button type="button" class="favorite-btn" data-favorite="'+esc(p.id)+'" aria-label="Adicionar aos favoritos" aria-pressed="false">♡</button><a class="photo-download" href="'+esc(p.url)+'" target="_blank" rel="noopener noreferrer" download="'+esc(p.name)+'">↓ BAIXAR ORIGINAL</a></div>').join('')||'<div class="notice">Nenhuma foto enviada ainda.</div>')+'</div><p class="gallery-hint">Fotos em qualidade original, sem redimensionamento. Os links de acesso aos arquivos expiram por segurança.</p></section><section class="closing"><span class="eyebrow">G&I AGÊNCIA</span><h2>O MELHOR DOS MOMENTOS<br>MERECE FICAR.</h2></section></main>');setupClientGallery(photos);renderMissingHeicPreviews()}
 catch(e){if(e.status===401){shell('<main class="empty-hero"><span class="eyebrow">ACESSO EXCLUSIVO</span><h1>ESSA GALERIA É PRA VC<span class="dot">.</span></h1><p>Digite a senha recebida da equipe G&I para visualizar e baixar suas fotografias.</p><form id="guest-login" class="guest-form"><label>SENHA DA GALERIA<input type="password" id="guest-password" autocomplete="off" required placeholder="Digite sua senha"></label><button class="btn full" type="submit">DESBLOQUEAR FOTOS ↗</button></form>'+(password?'<p class="danger-text">Senha incorreta. Tente novamente.</p>':'')+'</main>');document.getElementById('guest-login').onsubmit=ev=>{ev.preventDefault();publicGallery(document.getElementById('guest-password').value)}}else shell('<main class="empty-hero"><h1>GALERIA INDISPONÍVEL<span class="dot">.</span></h1><p>Verifique o link ou solicite ajuda à equipe G&I.</p></main>')}}
function login(){shell('<main class="login-wrap"><div class="login-art"><span class="eyebrow">G&I / CENTRAL DE ENTREGAS</span><h1>MEMÓRIAS.<br>MAIS QUE<br><em>IMAGENS.</em></h1><p>Galerias profissionais, qualidade original e acesso protegido.</p></div><div class="login-panel"><span class="eyebrow">ACESSO ADMINISTRATIVO</span><h2>BEM-VINDO<br>DE VOLTA.</h2><p>Entre com sua senha da equipe G&I.</p><form id="admin-login"><label>SENHA DO ADMINISTRADOR<input id="admin-password" type="password" required autocomplete="current-password" placeholder="Sua senha de acesso"></label><button type="submit" class="btn full">ENTRAR NO PAINEL ↗</button></form></div></main>',false);document.getElementById('admin-login').onsubmit=async e=>{e.preventDefault();try{await api('login',{password:document.getElementById('admin-password').value});await dashboard()}catch(err){warn(err)}}}
async function dashboard(){
 state.nav='collections';
 try{
  await ensureCollections();
  shell('<main class="admin studio-page"><div class="studio-page-heading"><div><h1>Coleções</h1><p>Gerencie suas entregas de fotografias.</p></div><div class="actions">'+btn('+ Nova coleção','new','primary')+btn('Sair','logout','outline')+'</div></div><div class="collection-toolbar"><label class="collection-search">⌕ <input id="collection-search" type="search" placeholder="Pesquisar coleções" aria-label="Pesquisar coleções"></label><select id="filter-status" aria-label="Filtrar por status"><option value="all">Todos os status</option><option value="published">Publicadas</option><option value="draft">Rascunhos</option></select><label class="filter-date">Data do evento<input id="filter-date" type="date"></label><label class="filter-check"><input id="filter-starred" type="checkbox"> Com estrela</label><select id="collection-sort" aria-label="Ordenação"><option value="new">Mais recentes</option><option value="old">Mais antigas</option><option value="name">Nome A-Z</option><option value="event">Data do evento</option></select><button class="btn outline" id="collection-view" type="button">☷ Lista</button></div><div class="collection-counter" id="collection-counter"></div><div class="collection-grid" id="collection-results"></div></main>',true);
  const search=document.getElementById('collection-search');
  const status=document.getElementById('filter-status');
  const dateInput=document.getElementById('filter-date');
  const fav=document.getElementById('filter-starred');
  const sort=document.getElementById('collection-sort');
  const results=document.getElementById('collection-results');
  let view='grid';
  function paint(){
   const q=search.value.toLocaleLowerCase('pt-BR').trim();
   const subset=state.galleries.filter(g=>(!q||(g.title+' '+g.client_name).toLocaleLowerCase('pt-BR').includes(q))&&(status.value==='all'||g.status===status.value)&&(!dateInput.value||String(g.event_date||'').startsWith(dateInput.value))&&(!fav.checked||g.starred));
   subset.sort((a,b)=>sort.value==='old'?new Date(a.created_at)-new Date(b.created_at):sort.value==='name'?a.title.localeCompare(b.title,'pt-BR'):sort.value==='event'?String(b.event_date||'').localeCompare(String(a.event_date||'')):new Date(b.created_at)-new Date(a.created_at));
   document.getElementById('collection-counter').textContent=subset.length+' coleções · '+subset.reduce((n,g)=>n+Number(g.photo_count||0),0)+' fotos';
   results.className='collection-grid '+(view==='list'?'is-list':'');
   results.innerHTML=subset.map(galleryTile).join('')||'<div class="collection-empty">Nenhuma coleção encontrada. Ajuste os filtros ou crie uma nova coleção.</div>';
   wireCollectionTiles(paint);
  }
  for(const el of [search,status,dateInput,fav,sort])el.addEventListener('input',paint);
  document.getElementById('collection-view').onclick=e=>{view=view==='grid'?'list':'grid';e.currentTarget.textContent=view==='grid'?'☷ Lista':'▦ Grade';paint()};
  document.getElementById('new').onclick=createDialog;
  document.getElementById('logout').onclick=async()=>{try{await api('logout',{});login()}catch(err){warn(err)}};
  paint();
 }catch(err){warn(err);login()}
}
async function favoritesPage(){
 state.nav='favorites';
 try{
  await ensureCollections();
  const favorites=state.galleries.filter(g=>g.starred);
  shell('<main class="admin studio-page"><div class="studio-page-heading"><div><h1>Favoritos</h1><p>Suas coleções marcadas com estrela.</p></div></div><div class="collection-grid" id="favorite-results">'+(favorites.map(galleryTile).join('')||'<div class="collection-empty">Nenhuma coleção favorita. Marque a estrela em Coleções para vê-la aqui.</div>')+'</div></main>',true);
  wireCollectionTiles(()=>favoritesPage());
 }catch(err){warn(err);dashboard()}
}
async function libraryPage(){
 state.nav='library';
 try{
  const {photos}=await api('library');
  shell('<main class="admin studio-page"><div class="studio-page-heading"><div><h1>Biblioteca</h1><p>Fotos das suas coleções, preservadas em qualidade original.</p></div><span class="library-total">'+photos.length+' arquivos recentes</span></div><div class="collection-toolbar"><label class="collection-search">⌕ <input id="library-search" type="search" placeholder="Pesquisar foto ou coleção" aria-label="Pesquisar arquivos"></label></div><div class="library-grid" id="library-results"></div><p class="gallery-hint">Mostrando até 400 arquivos mais recentes. Para gerenciar todos os arquivos, abra cada coleção.</p></main>',true);
  const area=document.getElementById('library-results'),search=document.getElementById('library-search');
  function render(){
   const q=search.value.toLocaleLowerCase('pt-BR').trim();
   const filtered=photos.filter(p=>(p.name+' '+p.gallery_title).toLocaleLowerCase('pt-BR').includes(q));
   area.innerHTML=filtered.map(p=>'<article class="library-item">'+photoPreview(p)+'<div class="library-item-meta"><strong title="'+esc(p.name)+'">'+esc(p.name)+'</strong><small>'+esc(p.gallery_title)+'</small><div><button class="plain" data-library-open="'+esc(p.gallery_id)+'">ABRIR COLEÇÃO</button><a href="'+esc(p.url)+'" target="_blank" rel="noopener noreferrer" download="'+esc(p.name)+'">↓ ORIGINAL</a></div></div></article>').join('')||'<div class="collection-empty">Nenhuma foto encontrada.</div>';
   document.querySelectorAll('[data-library-open]').forEach(el=>el.onclick=()=>detail(el.dataset.libraryOpen));
   renderMissingHeicPreviews();
  }
  search.oninput=render;render();
 }catch(err){warn(err);dashboard()}
}
async function homepagePage(){
 state.nav='homepage';
 try{
  await ensureCollections();
  const published=state.galleries.filter(g=>g.status==='published');
  shell('<main class="admin studio-page"><div class="studio-page-heading"><div><h1>Página inicial</h1><p>Prévia das coleções já publicadas para compartilhar com clientes.</p></div></div><div class="collection-grid">'+(published.map(galleryTile).join('')||'<div class="collection-empty">Nenhuma coleção publicada ainda. Publique uma coleção para disponibilizá-la ao cliente.</div>')+'</div></main>',true);
  wireCollectionTiles(homepagePage);
 }catch(err){warn(err);dashboard()}
}
async function marketingPage(){
 state.nav='marketing';
 try{
  await ensureCollections();
  const published=state.galleries.filter(g=>g.status==='published');
  shell('<main class="admin studio-page"><div class="studio-page-heading"><div><h1>Compartilhar</h1><p>Copie links de acesso para enviar aos seus clientes. Compartilhe a senha separadamente.</p></div></div><div class="marketing-list">'+(published.map(g=>'<div class="marketing-row"><div><strong>'+esc(g.title)+'</strong><small>'+Number(g.photo_count||0)+' fotos · Acesso protegido</small></div><button class="btn outline" data-copy-link="'+esc(g.share_token)+'">COPIAR LINK ↗</button></div>').join('')||'<div class="collection-empty">Publique uma coleção primeiro para obter seu link.</div>')+'</div></main>',true);
  document.querySelectorAll('[data-copy-link]').forEach(el=>el.onclick=async()=>{try{await navigator.clipboard.writeText(location.origin+'/?g='+el.dataset.copyLink);notify('Link copiado. Envie a senha da coleção separadamente.')}catch(err){warn(err)}});
 }catch(err){warn(err);dashboard()}
}
function createDialog(){
 const d=document.createElement('dialog');d.className='modal wizard-modal';
 const data={title:'',client_name:'',event_date:'',description:'',password:'',cover_style:'classic'};
 let step=0;
 const styles=[['classic','CLÁSSICA'],['split','DIVIDIDA'],['minimal','MINIMALISTA'],['cinema','CINEMÁTICA']];
 function render(){
  const stepText=['01 / DADOS DA COLEÇÃO','02 / ACESSO EXCLUSIVO','03 / DESIGN DA CAPA'][step];
  const content=step===0?'<label>NOME DA COLEÇÃO<input name="title" required maxlength="150" value="'+esc(data.title)+'" placeholder="Ex: Congresso de Dança"></label><label>CLIENTE<input name="client_name" value="'+esc(data.client_name)+'" maxlength="150" placeholder="Nome do cliente"></label><label>DATA DO EVENTO<input type="date" name="event_date" value="'+esc(data.event_date)+'"></label><label>DESCRIÇÃO<textarea name="description" maxlength="1000" rows="3">'+esc(data.description)+'</textarea></label>':step===1?'<p>Defina uma senha exclusiva para compartilhar as fotografias com segurança.</p><label>SENHA DO CLIENTE<input name="password" type="password" minlength="8" required value="'+esc(data.password)+'" placeholder="Mínimo de 8 caracteres"></label>':'<p>Escolha a aparência da capa. Depois de enviar as fotos, vc poderá selecionar uma imagem de destaque.</p><div class="cover-options">'+styles.map(([key,label])=>'<label class="cover-option '+(data.cover_style===key?'active':'')+'"><input type="radio" name="cover_style" value="'+key+'" '+(data.cover_style===key?'checked':'')+'><span class="cover-sample cover-'+key+'"><i></i><b>G&I</b></span><strong>'+label+'</strong></label>').join('')+'</div>';
  d.innerHTML='<form class="modal-body wizard-body"><div class="modal-top"><span class="eyebrow">ETAPA '+(step+1)+' DE 3 · '+stepText+'</span><button type="button" class="plain" id="dismiss">✕</button></div><h2>CRIAR COLEÇÃO</h2><div class="wizard-progress"><i style="width:'+((step+1)/3*100)+'%"></i></div>'+content+'<div class="wizard-actions">'+(step?'<button type="button" class="btn outline" id="previous">← VOLTAR</button>':'')+'<button class="btn primary" type="submit">'+(step===2?'CRIAR COLEÇÃO ↗':'PRÓXIMO →')+'</button></div></form>';
  d.querySelector('#dismiss').onclick=()=>d.close();
  if(step)d.querySelector('#previous').onclick=()=>{step--;render()};
  d.querySelector('form').onsubmit=async e=>{
   e.preventDefault();const f=new FormData(e.currentTarget);for(const [k,v] of f) data[k]=v;
   if(step<2){step++;render();return}
   try{const created=await api('create',data);d.close();detail(created.id)}catch(err){warn(err)}
  };
 }
 document.body.append(d);d.onclose=()=>d.remove();render();d.showModal();
}
async function detail(id){try{const {gallery:g,photos}=await api('detail',undefined,{id});state.active=id;const link=location.origin+'/?g='+g.share_token;shell('<main class="admin"><div class="backbar"><button class="plain" id="back">← TODAS AS GALERIAS</button><span class="status '+(g.status==='published'?'published':'')+'">'+(g.status==='published'?'PUBLICADA':'RASCUNHO')+'</span></div><div class="dash-title detail-title"><div><span class="eyebrow">G&I / GERENCIAMENTO</span><h1>'+esc(g.title).toUpperCase()+'<span class="dot">.</span></h1><p>'+esc(g.client_name)+' · '+esc(date(g.event_date))+'</p></div><div class="actions">'+btn(g.status==='published'?'DESPUBLICAR':'PUBLICAR','publish','primary')+btn('EXCLUIR GALERIA','delete-gallery','danger')+'</div></div><div class="upload"><div><span class="eyebrow">PRESERVAÇÃO DE QUALIDADE</span><h2>ENVIAR ORIGINAIS</h2><p>Sem compressão, sem alterar resolução. Até 200 MB por fotografia.</p></div><label class="btn upload-button">+ SELECIONAR FOTOS<input id="photos" type="file" hidden multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/tiff,.heic,.heif"></label></div><p id="progress"></p><div class="share-box"><div><span class="eyebrow">LINK EXCLUSIVO DO CLIENTE</span><p class="share-url">'+esc(link)+'</p><small>'+(g.protected?'Protegida por senha':'Atenção: galeria sem senha')+'. Somente publicada pode ser acessada.</small></div>'+btn('COPIAR LINK','copy','outline')+'</div><div class="share-box"><div><span class="eyebrow">SEGURANÇA</span><p>Senha individual da galeria</p><small>Troque sempre que necessário, sem alterar o link.</small></div><div class="actions"><input id="gallery-password" type="text" minlength="8" placeholder="Nova senha (mín. 8 caracteres)">'+btn('SALVAR SENHA','save-password','outline')+'</div></div><div class="share-box"><div><span class="eyebrow">DESIGN DA COLEÇÃO</span><p>Estilo de capa e marca d’água na visualização</p><small>O arquivo original para download nunca recebe marca d’água.</small></div><div class="actions"><select id="cover-style" aria-label="Estilo de capa"><option value="classic">Clássica</option><option value="split">Dividida</option><option value="minimal">Minimalista</option><option value="cinema">Cinemática</option></select><label class="toggle-label"><input type="checkbox" id="watermark" '+(g.watermark_enabled?'checked':'')+'> Marca d’água</label>'+btn('SALVAR DESIGN','save-design','outline')+'</div></div><div class="section-head"><div><span class="eyebrow">FOTOS ORIGINAIS</span><h2>ARQUIVOS ENVIADOS</h2></div><span>'+photos.length+' FOTOS</span></div><div class="admin-photos">'+(photos.map(p=>'<div class="admin-photo">'+photoPreview(p)+'<div><span>'+esc(p.name)+'</span><button class="plain danger-text" data-photo="'+esc(p.id)+'">EXCLUIR</button></div></div>').join('')||'<div class="notice">Nenhuma foto cadastrada.</div>')+'</div></main>',true);renderMissingHeicPreviews();
 document.getElementById('cover-style').value=g.cover_style||'classic';
 document.getElementById('save-design').onclick=async()=>{try{await api('update',{id,cover_style:document.getElementById('cover-style').value,watermark_enabled:document.getElementById('watermark').checked});notify('Design atualizado');detail(id)}catch(err){warn(err)}};
 document.getElementById('back').onclick=dashboard;
 document.getElementById('copy').onclick=async()=>{try{await navigator.clipboard.writeText(link);notify('Link copiado! Envie a senha separadamente.')}catch(e){warn(e)}};
 document.getElementById('delete-gallery').onclick=async()=>{
 const typed=prompt('ATENÇÃO: isso exclui permanentemente a galeria e todas as fotos originais e prévias. Para confirmar, digite exatamente o nome da galeria:\\n\\n'+g.title);
 if(typed===null)return;
 if(typed!==g.title){notify('O nome informado não corresponde ao da galeria. Nada foi excluído.');return}
 const button=document.getElementById('delete-gallery');button.disabled=true;button.textContent='EXCLUINDO...';
 try{const result=await api('delete-gallery',{id,confirmTitle:typed});notify('Galeria excluída. '+result.deletedPhotos+' foto(s) removida(s).');await dashboard()}
 catch(err){warn(err);button.disabled=false;button.textContent='EXCLUIR GALERIA'}
};
 document.getElementById('publish').onclick=async()=>{try{await api('update',{id,status:g.status==='published'?'draft':'published'});detail(id)}catch(e){warn(e)}};
 document.getElementById('save-password').onclick=async()=>{const password=document.getElementById('gallery-password').value;if(password.length<8)return notify('Informe uma senha de pelo menos 8 caracteres.');try{await api('update',{id,password});notify('Senha atualizada');detail(id)}catch(e){warn(e)}};
 document.querySelectorAll('[data-photo]').forEach(el=>el.onclick=async()=>{if(!confirm('Excluir esta foto permanentemente?'))return;try{await api('delete-photo',{id:el.dataset.photo});detail(id)}catch(e){warn(e)}});
 document.getElementById('photos').onchange=async e=>{const list=[...e.target.files];const progress=document.getElementById('progress');let ok=0;for(let i=0;i<list.length;i++){const file=list[i];try{progress.textContent='Enviando '+(i+1)+'/'+list.length+': '+file.name;if(file.size>200*1024*1024)throw Error('Limite de 200 MB por arquivo');const s=await api('sign-upload',{id,name:file.name,type:(file.type||(/\.hei[cf]$/i.test(file.name)?'image/heic':'')),size:file.size});const up=await fetch(s.url,{method:'PUT',headers:{'Content-Type':(file.type||(/\.hei[cf]$/i.test(file.name)?'image/heic':''))},body:file});if(!up.ok)throw Error('O armazenamento recusou o envio');let previewKey=null;
 if(/\.hei[cf]$/i.test(file.name)||['image/heic','image/heif'].includes(file.type)){
   try{
     progress.textContent='Gerando prévia HEIC: '+file.name;
     const converted=await heic2any({blob:file,toType:'image/jpeg',quality:0.92});
     const preview=Array.isArray(converted)?converted[0]:converted;
     const signedPreview=await api('sign-preview',{id,key:s.key});
     const previewUpload=await fetch(signedPreview.url,{method:'PUT',headers:{'Content-Type':'image/jpeg'},body:preview});
     if(!previewUpload.ok)throw Error('Falha ao enviar prévia');
     previewKey=signedPreview.key;
   }catch(previewError){console.warn('Prévia HEIC não disponível',previewError)}
 }
 await api('confirm-upload',{id,key:s.key,name:file.name,previewKey});ok++}catch(err){warn(new Error(file.name+': '+err.message))}}notify(ok+' fotos enviadas sem compressão.');detail(id)};
 }catch(e){warn(e);dashboard()}}
if(linkToken)publicGallery();else api('session').then(r=>r.admin?dashboard():login()).catch(()=>login());
