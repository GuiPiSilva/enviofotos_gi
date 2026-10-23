# G&I Galerias

Sistema próprio de entrega de fotos da G&I Agência, com painel protegido e galerias por link exclusivo.

## Recursos da primeira versão
- Login para administradores autorizados pelo Supabase Auth
- Criação de galerias por evento/cliente
- Upload de imagens JPEG, PNG, WebP e HEIC de até 50 MB por arquivo
- Links exclusivos aleatórios (token criptográfico), publicação e despublicação
- Visualização responsiva e download da foto original
- Bucket privado com URLs temporárias (10 minutos)
- Exclusão de fotos e galerias

## Configuração
1. Crie um projeto em [Supabase](https://supabase.com) e execute **supabase/schema.sql** no SQL Editor.
2. Em Authentication > Users, crie/convide o usuário da equipe.
3. Encontre o UUID do usuário e execute no SQL Editor:
   `insert into public.admin_users(user_id) values ('UUID-DO-USUARIO');`
4. Na Vercel, conecte este repositório e configure as 4 variáveis do arquivo **.env.example**.
5. Para desenvolvimento: `npm install && npm run dev`.
6. Ao entrar no painel, crie uma galeria, carregue as fotos, publique e copie o link.

## Segurança
- **Nunca** exponha `SUPABASE_SERVICE_ROLE_KEY` com prefixo `VITE_`, nem comite valores reais.
- A rota `/api/gallery` usa a chave de serviço apenas no servidor, exige token forte, verifica publicação e expiração, e gera URLs de 10 minutos.
- Links exclusivos funcionam como uma senha: qualquer pessoa com o link consegue abrir a galeria. Para público sensível, acrescente autenticação do destinatário.
- Os links assinados já emitidos permanecem válidos pelo período de 10 minutos, mesmo após despublicação.
- Fotos são mantidas originais. Arquivos HEIC dependem de suporte do navegador para visualização.
- Esta versão não inclui download único em ZIP, marca d'água, faturamento nem cobrança.

## Antes da produção
Configure limites de consumo/custos de Storage no Supabase, política de retenção e um domínio próprio. Teste download e exclusão com um usuário administrador e um navegador anônimo.
