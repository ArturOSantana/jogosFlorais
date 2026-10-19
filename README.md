# Katricos · Jogos Florais 2026

Placar em tempo real das três equipes. Positivo soma, negativo remove; a posição é calculada sozinha (empate divide a posição).

## 1. Firebase
1. Console Firebase > criar projeto > **Firestore Database** (modo produção).
2. **Authentication** > Método de login > ativar *E-mail/senha* e criar um usuário para cada administrador (aba Usuários), cada um com seu próprio e-mail e senha.
3. Configurações do projeto > *Seus apps* > Web (`</>`) > copie a configuração para o `.env`. Defina `VITE_ADMIN_EMAILS` como a lista de e-mails autorizados, separados por vírgulas. O administrador principal pode entrar com o login `terezinha.santa` (não é um e-mail); o app o associa ao primeiro e-mail autorizado. Os demais administradores podem usar seus e-mails. `VITE_ADMIN_USERNAME` pode ser usado como apelido alternativo do administrador principal.
4. Firestore > **Regras**: cole o `firestore.rules`, substitua os e-mails de exemplo pelos mesmos e-mails de `VITE_ADMIN_EMAILS` e publique.
5. Authentication > Configurações > **Domínios autorizados**: adicione o domínio do Vercel.

Visitantes veem o placar, os links do Instagram das equipes, o regulamento em PDF e os integrantes das equipes. Administradores podem alterar os nomes dos líderes, vice-líderes e integrantes na aba **Equipes**. A lista de boa-fé não é publicada no site; quando a lista preenchida estiver disponível, os dados poderão ser organizados e atualizados nas equipes.

Todos os administradores autorizados podem entrar simultaneamente com seus próprios e-mails e senhas, e as alterações recebidas pelo Firestore aparecem em tempo real. Administradores podem pausar e retomar a atualização do placar para leitores; durante a pausa, os administradores continuam vendo a pontuação ao vivo. Administradores também podem apagar atas e lançamentos de katricos; a exclusão pede confirmação. Para evitar sobrescritas, não editem a mesma ata ou equipe ao mesmo tempo: o salvamento desses documentos substitui o documento inteiro, então a última gravação prevalece. Ajustes são registrados como lançamentos separados.

## 2. Rodar
```
npm install
npm run dev     # sem .env preenchido roda em modo local (localStorage)
npm test        # testa soma, remoção e posição
```

## 3. Vercel
Suba para o GitHub, importe no Vercel e cadastre em *Settings > Environment Variables* as 6 variáveis `VITE_FIREBASE_*` e `VITE_ADMIN_EMAILS` (e, se usado, `VITE_ADMIN_USERNAME`).

## Cálculo
`total = soma dos totais das atas + soma dos ajustes de katricos`.
Apagar um lançamento desfaz o efeito dele.
