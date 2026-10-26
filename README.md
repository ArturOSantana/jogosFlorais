# Katricos · Jogos Florais 2026

Placar em tempo real das três equipes. Positivo soma, negativo remove; a posição é calculada sozinha (empate divide a posição).

## 1. Firebase
1. Console Firebase > criar projeto > **Firestore Database** (modo produção).
2. **Authentication** > Método de login > ativar *E-mail/senha* e criar um usuário para cada administrador (aba Usuários), cada um com seu próprio e-mail e senha.
3. Configurações do projeto > *Seus apps* > Web (`</>`) > copie a configuração para o `.env`. Defina `VITE_ADMIN_EMAILS` como a lista de e-mails autorizados, separados por vírgulas. O administrador principal pode entrar com o login `terezinha.santa` (não é um e-mail); o app o associa ao primeiro e-mail autorizado. Os demais administradores podem usar seus e-mails. `VITE_ADMIN_USERNAME` pode ser usado como apelido alternativo do administrador principal.
4. Firestore > **Regras**: cole o `firestore.rules`, substitua os e-mails de exemplo pelos mesmos e-mails de `VITE_ADMIN_EMAILS` e publique.
5. Authentication > Configurações > **Domínios autorizados**: adicione o domínio do Vercel.

Visitantes veem o placar, os links do Instagram das equipes, o regulamento em PDF e os integrantes das equipes. Administradores podem alterar os nomes dos líderes, vice-líderes e integrantes na aba **Equipes**. A lista de boa-fé não é publicada no site; quando a lista preenchida estiver disponível, os dados poderão ser organizados e atualizados nas equipes.

Todos os administradores autorizados podem entrar simultaneamente com seus próprios e-mails e senhas, e as alterações recebidas pelo Firestore aparecem em tempo real. Na aba **Atas**, como todos os juízes usam a mesma conta, cada avaliação é identificada pelo nome informado: carregue o nome antes de preencher ou editar. Cada juiz tem notas e observações independentes por modalidade; salvar uma avaliação não sobrescreve a de outro nome. O placar soma as notas de todos os juízes. A tela da ata mostra a classificação da modalidade e destaca o primeiro lugar (ou empate), calculados pela soma das avaliações registradas. Registros antigos continuam contabilizados e podem ser continuados pelo mesmo nome sem duplicar a pontuação. Administradores podem criar modalidades personalizadas com nome e critérios próprios; elas ficam disponíveis para todos os administradores. Administradores podem pausar e retomar a atualização do placar para leitores; durante a pausa, os administradores continuam vendo a pontuação ao vivo. Administradores também podem apagar avaliações/atas e lançamentos de katricos; a exclusão pede confirmação. Ajustes são registrados como lançamentos separados.

Na aba administrativa **Auditoria**, cada critério de cada equipe aparece com modalidade, juiz, responsável, data, observação, valores anterior/atual e variação. Alterações e exclusões de avaliações e ajustes são mantidas em uma coleção de auditoria somente de inclusão; os registros atuais anteriores ao recurso aparecem como posição inicial, sem recuperar versões que não eram armazenadas. A tela permite filtrar por equipe, origem, texto e período, baixar CSV separado por ponto e vírgula para Excel ou imprimir/salvar o relatório filtrado como PDF. Publique as regras atualizadas de `firestore.rules` no Firebase para liberar a leitura administrativa e bloquear alteração ou exclusão dos eventos de auditoria.

## Mega Senha
Na aba **Mega Senha**, administradores podem cadastrar e editar listas, escolher equipe e pessoa que dará as dicas, configurar tempo, pontos, penalidade e limite de pulos. **Preparar rodada** anuncia a próxima equipe; **Iniciar** faz a contagem regressiva 3, 2, 1. Os controles permitem pausar/retomar, acertar, pular, errar, ajustar o tempo em 10 segundos e encerrar. A pausa esconde a palavra no telão. Palavras usadas não são sorteadas novamente até serem redefinidas na lista. O histórico de partidas permite apagar rodadas individualmente, após confirmação.

Abra **Abrir telão** ou acesse `/megasenha/telao` em outro dispositivo. Essa página é somente leitura, atualiza em tempo real pelo Firestore e mostra a palavra em letras grandes, cronômetro, equipe, pessoa das dicas e placar; pode ser usada em tela cheia (F11). O estado e o relógio da rodada são persistidos, então recarregar o telão não reinicia o tempo. Depois de atualizar `firestore.rules`, publique as regras no Firebase Console do mesmo `VITE_FIREBASE_PROJECT_ID`: o telão pode ler somente o documento `megasenha/state`, não pode listar a coleção, e apenas administradores autorizados podem escrever. Se aparecer "Missing or insufficient permissions", confirme o projeto e publique as regras; depois clique em **Tentar novamente**. Sem Firebase, admin e telão funcionam apenas no mesmo navegador usando localStorage.

## 2. Rodar
```
npm install
npm run dev     # sem .env preenchido roda em modo local (localStorage)
npm test        # testa placar, autenticação e regras do Mega Senha
```

## 3. Vercel
Suba para o GitHub, importe no Vercel e cadastre em *Settings > Environment Variables* as 6 variáveis `VITE_FIREBASE_*` e `VITE_ADMIN_EMAILS` (e, se usado, `VITE_ADMIN_USERNAME`).

## Cálculo
`total = soma das notas de todos os juízes em todas as modalidades + soma dos ajustes de katricos`.
Apagar um lançamento desfaz o efeito dele.
