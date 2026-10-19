# Katricos · Jogos Florais 2026

Placar em tempo real das três equipes. Positivo soma, negativo remove; a posição é calculada sozinha (empate divide a posição).

## 1. Firebase
1. Console Firebase > criar projeto > **Firestore Database** (modo produção).
2. **Authentication** > Método de login > ativar *E-mail/senha* e criar o usuário administrador com a senha escolhida (aba Usuários).
3. Configurações do projeto > *Seus apps* > Web (`</>`) > copie a configuração para o `.env`. Defina `VITE_ADMIN_USERNAME=terezinha.santa` e `VITE_ADMIN_EMAIL` com o e-mail usado no Firebase Authentication.
4. Firestore > **Regras**: cole o `firestore.rules`, substitua os e-mails de exemplo pelo mesmo e-mail definido em `VITE_ADMIN_EMAIL` e publique.
5. Authentication > Configurações > **Domínios autorizados**: adicione o domínio do Vercel.

Visitantes veem somente o placar. Administradores autenticados com o e-mail configurado veem as demais abas e podem editar. O login `terezinha.santa` é associado ao e-mail configurado; a senha é validada pelo Firebase Authentication e não deve ser colocada no código ou no `.env`.

## 2. Rodar
```
npm install
npm run dev     # sem .env preenchido roda em modo local (localStorage)
npm test        # testa soma, remoção e posição
```

## 3. Vercel
Suba para o GitHub, importe no Vercel e cadastre em *Settings > Environment Variables* as mesmas 6 variáveis `VITE_FIREBASE_*` do `.env`.

## Cálculo
`total = soma dos totais das atas + soma dos ajustes de katricos`.
Apagar um lançamento desfaz o efeito dele.
