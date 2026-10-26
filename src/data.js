export const TEAMS = [
  { id: 'pp', n: 'São Padre Pio', s: 'Padre Pio', ig: 'https://www.instagram.com/saopadrepio.oficial/' },
  { id: 'sl', n: 'São Luís IX', s: 'São Luís IX', ig: 'https://www.instagram.com/saoluisreiix/' },
  { id: 'gg', n: 'Santa Gemma Galgani', s: 'Gemma', ig: 'https://www.instagram.com/santa_gemma_jf2k26?utm_source=ig_web_button_share_sheet&exln=ZDNlZDc0MzIxNw==' },
];
export const R0 = {
  pp: { l: 'João Pedro Amorim de Albuquerque', v: 'Alyces Santos da Silva', m: ['Rhyanna Gabrielli da Silva Pereira', 'Ana Carolina Brito Rigueira', 'Letícia Soares Freire', 'Ana Giulia Silva Marques', 'Larissa Oliveira', 'Pedro Henrique Neves Pereira', 'Sophia Santana Silva', 'Nycollas Holanda', 'Heitor Barbosa Souza', 'María Vitória Gandon Costa dos Santos', 'Diogo Nunes Vasconcelos da Silva', 'Diogo Batista Fontes', 'Anna Julia Pinheiro Silva', 'Bryan Rodrigues'] },
  sl: { l: 'Lucas Oliveira Pereira da Silva', v: 'Ana Vitória da Silva Santos', m: ['João Vitor de Deus', 'Julya Martins Silva', 'Felipe Brito da Silva', 'Pedro Henrique de Oliveira Nascimento', 'Mariana Alves', 'Maria Fernanda Foguel Sodré', 'Murillo Henrique Barbosa da Silva', 'Ryan Lima', 'Thereza Lavhínya', 'Bianca Bernardo Mendes', 'Sarah Falcão Martinez', 'Ana Luiza Santos Soares', 'Davi Belo', 'Lucas Ramos'] },
  gg: { l: 'João Victor Santos de Sá', v: 'Maria Eduarda Barbosa dos Santos', m: ['Alyce Martins Silva', 'Arthur Pereira Bonfim', 'Maria Julia Silva Oliveira', 'Gabrielle Oliveira Evangelista', 'Felipe Fortunato Ribeiro Rodrigues', 'Enzo da Silva Couto', 'Maria Vitória Ozebia de Carvalho', 'Sofia Falcão Martinez', 'Gabriel Santos de Andrade', 'Hellena Nery dos Santos', 'Sophia Belarmino Mastroccesari', 'José Eduardo Silva de Oliveira', 'Guilherme da Silva Lourenço'] },
};
const AF = ['Afinação', 'Tempo', 'Fidelidade', 'Dificuldade'];
const PL = n => Array.from({ length: n }, (_, i) => 'Placar ' + (i + 1));
const ID = ['Diálogo', 'Pronúncia', 'Concordância', 'Ortografia', 'Criatividade', 'Tradução de palavras', 'Acertos'];
export const G = [
  ['Padroeiro', [['Apresentação do padroeiro', ['Apresentação', 'Conteúdo', 'Recursos']]]],
  ['Estandarte e hino', [['Estandarte', ['Conteúdo', 'Apresentação', 'Estética', 'Harmonia', 'Lema']], ['Hino', ['Letra', 'Melodia', 'Participação', 'Afinação']]]],
  ['Musicais', [['Coral clássico/religioso', AF], ['Solista clássico/religioso', AF], ['Coral popular', AF], ['Solista popular', AF], ['Solo instrumental', ['Apresentação no geral']], ['Estrela da noite (solista ruim)', ['Afinação', 'Tempo', 'Fidelidade', 'Presença de palco']]]],
  ['Teatro e cultura floral', [['Teatro', ['Atuação', 'Fidelidade ao texto', 'Sonoplastia', 'Figurino']], ['Cultura floral', ['Acertos']]]],
  ['Idiomas', [['Latim', ['Leitura de texto', 'Pronúncia', 'Fluidez', 'Tradução de palavras', 'Acertos']], ['Inglês', ID], ['Português', ['Soletração', 'Acertos']], ['Espanhol', ID]]],
  ['Esportivas indoor', [['Xadrez', PL(2)], ['Damas', PL(2)], ['Tênis de mesa', PL(2)], ['Truco', PL(3)], ['Dominó', PL(3)]]],
  ['Esportivas', [['Futebol', PL(3)], ['Vôlei', PL(3)], ['Queimada', PL(3)], ['Atletismo', ['Melhores resultados', 'Cabo de guerra', 'Revezamento 4x4', '100m rasos', 'Lançamento de dardo', 'Lançamento de peso', 'Salto em distância']]]],
];
export const idOf = n => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-|-$/g, '');
export const judgeKey = n => encodeURIComponent(String(n ?? '').trim().toLocaleLowerCase('pt-BR'));
export const M = G.flatMap(([, l]) => l.map(([n, c]) => ({ id: idOf(n), n, c })));
