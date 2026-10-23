# G&I Galerias | Entrega de fotos para clientes

Galerias com identidade visual G&I, banco **Neon Postgres**, login administrativo e acesso do cliente por **senha própria por galeria**.

## Funcionalidades
- Painel administrativo protegido por senha e sessão assinada em cookie HttpOnly
- Criar galerias e definir senha individual de pelo menos 8 caracteres
- Publicar e despublicar galeria, copiar link exclusivo e atualizar senha
- Enviar fotos diretamente para **Object Storage privado via S3** com URL assinada temporária
- Preservar original sem compressão, conversão ou redimensionamento (limite 200 MB por imagem)
- Visualização responsiva e downloads de arquivos originais por URLs temporárias
- Excluir fotografias individuais

## Configuração
1. Entre no Neon e **selecione o projeto correto da G&I**. O banco deve ser `gi_fotos_banc`. Execute `neon/schema.sql` no SQL Editor **desse banco**, nunca em outro projeto.
2. Ative o Neon Object Storage em região compatível e crie um bucket privado `gi-fotos` (ou altere `STORAGE_BUCKET`).
3. Abra [Vercel](https://vercel.com) > projeto `enviofotos-gi` > Settings > Environment Variables. Configure todas as variáveis de `.env.example`.
4. Gere um segredo `SESSION_SECRET` aleatório de 32 bytes em hexadecimal; configure `ADMIN_PASSWORD_HASH` usando scrypt (veja o exemplo abaixo).
5. Faça um novo deploy depois de configurar o ambiente.
6. Entre com a senha administrativa, crie uma galeria e informe a senha destinada ao cliente. Faça upload dos originais; publique e compartilhe o link com o cliente. Envie a senha por canal separado.

### Gerar hash da senha administrativa
No computador, usando Node.js:
```sh
node -e "const c=require('crypto');const p=process.env.ADMIN_PASSWORD;if(!p)throw Error('Defina ADMIN_PASSWORD em seu terminal');console.log(c.scryptSync(p,'gi-gallery-v1',64).toString('hex'))"
```
Defina `ADMIN_PASSWORD` temporariamente **apenas no seu terminal**, não na Vercel, e copie somente o hash resultante para `ADMIN_PASSWORD_HASH`. Nunca publique a senha ou o hash no GitHub.

## Segurança e qualidade
- As fotos originais **não ficam no Neon Postgres**: somente metadados e referências dos objetos. Os arquivos ficam no bucket privado.
- O servidor só gera links assinados após autenticar o admin ou conferir a senha da galeria publicada.
- A senha do cliente é armazenada via scrypt, não em texto puro. Mudar a senha invalida o cookie de visitante anterior, mas URLs assinadas já emitidas permanecem válidas até expirar.
- A sessão administrativa atual é baseada em senha única (não há múltiplos usuários/2FA nesta versão).
- Limite de URLs: 3 minutos para baixar/ver, 5 minutos para upload. Downloads longos podem precisar de um link novo.
- Fotos HEIC/TIFF mantêm o formato original; nem todo navegador consegue mostrar miniatura desses formatos. JPEG/PNG/WebP são os formatos mais compatíveis.
- Configure CORS no bucket para permitir PUT do domínio da galeria. Bloqueie acesso público.
- Avalie limites e custos de transferências e armazenamento antes de enviar muitas fotografias.
- Importante: antes de uso real, testar autenticação, upload, visualização, download, revogação e exclusão.
- Ainda não há opção de ZIP, recuperação de senha por email, rate limit dedicado ou logs de auditoria. Para exposição pública com grande escala, inclua proteção contra tentativas de senha e 2FA no painel.

Repositório de referência da marca: [G-I_site](https://github.com/GuiPiSilva/G-I_site), símbolo oficial em `assets/gi-symbol.svg`.
