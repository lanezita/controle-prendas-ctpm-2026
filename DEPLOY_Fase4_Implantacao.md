# Guia de Implantação e Dados Oficiais - Fase 4
## Sistema de Arrecadação Prendas 2026 (Estilo CTPM)

Este guia consolida todas as orientações, scripts e checklists para a **Fase 4: Implantação de Produção e Carga de Dados Oficiais** para assegurar uma transição suave e livre de falhas no primeiro dia da gincana escolar.

---

### 1. Checklist Final de Implantação e Infraestrutura

Antes da abertura oficial dos portões e início dos lançamentos, a equipe de TI deve atestar cada um dos itens abaixo:

- [ ] **Migrations de Banco Aplicadas**: Confirmar que os arquivos `20260520000000_fase1_integridade.sql` e `20260520000001_fase2a_usuarios.sql` foram rodados com sucesso no editor SQL do painel de produção da gincana no Supabase.
- [ ] **Deploy de Edge Function Realizado**: Confirmar a publicação da função `invite-user` em produção usando a CLI: `supabase functions deploy invite-user`.
- [ ] **Configuração de Secrets no Supabase**: Chave `SUPABASE_SERVICE_ROLE_KEY` injetada de forma segura nas configurações de Edge Function usando a linha de comando.
- [ ] **SMTP de E-mail Institucional Habilitado**: Desvincular do limite de templates do Supabase (3 e-mails/hora) e conectar à caixa oficial SMTP da escola (Google Workspace/Office365) para assegurar o recebimento instantâneo dos convites de criação pelos operadores.
- [ ] **Políticas RLS Ativas**: Confirmar que a tabela `usuarios_perfis` está com o Row Level Security habilitado na aba de segurança de dados do Supabase.

---

### 2. Preparação e Importação de Dados Oficiais da Escola (EFAI)

Para o cadastramento oficial de alunos e prendas, é altamente recomendada a utilização do mecanismo de importação via **CSV** no painel da tabela ou diretamente pelo utilitário SQL abaixo.

#### A. Cadastro de Alunos EFAI (Estrutura Recomendada)

A tabela de alunos herda a consistência lógica de validação de matrícula única. Segue o script SQL recomendado para importar as turmas e alunos oficiais do Ensino Fundamental Anos Iniciais:

```sql
-- Exemplo de Carga em Lote de Alunos (Ensino FundamentalAnos Iniciais)
-- Insere turmas e alunos associados aos seus turnos correspondentes de forma atômica
INSERT INTO public.alunos (matricula, nome, turma, turno, status)
VALUES
  ('20261001', 'Ana Clara Silva', '1º Ano A', 'manha', 'ativo'),
  ('20261002', 'Bruno César Santos', '1º Ano A', 'manha', 'ativo'),
  ('20261003', 'Carlos Eduardo Costa', '1º Ano B', 'manha', 'ativo'),
  ('20261004', 'Deborah Neves Souza', '2º Ano A', 'tarde', 'ativo'),
  ('20261005', 'Enzo Gabriel Oliveira', '2º Ano A', 'tarde', 'ativo'),
  ('20261006', 'Fernanda Lima Rocha', '3º Ano B', 'tarde', 'ativo')
ON CONFLICT (matricula) 
DO UPDATE SET 
  nome = EXCLUDED.nome, 
  turma = EXCLUDED.turma, 
  turno = EXCLUDED.turno, 
  status = EXCLUDED.status;
```

#### B. Cadastro Oficial de Prendas e Tabela de Pontos

As prendas cadastradas devem seguir os critérios definidos pela banca avaliadora da gincana. Use o script abaixo para inicializar ou atualizar a lista de itens e pontuações aceitas como padrão:

```sql
-- Tabela de pontos padrão das prendas para indexação
-- Insira ou atualize conforme o edital oficial da gincana escolar
INSERT INTO public.prendas_tabela (id, item_nome, pontos_padrao, status)
VALUES
  ('PRENDA_01', 'Arroz (Pacote 5kg)', 50, 'ativo'),
  ('PRENDA_02', 'Feijão (Pacote 1kg)', 15, 'ativo'),
  ('PRENDA_03', 'Óleo de Cozinha (900ml)', 10, 'ativo'),
  ('PRENDA_04', 'Macarrão (Pacote 500g)', 5, 'ativo'),
  ('PRENDA_05', 'Leite Longa Vida (1L)', 12, 'ativo'),
  ('PRENDA_06', 'Detergente Líquido (500ml)', 3, 'ativo')
ON CONFLICT (id) 
DO UPDATE SET 
  item_nome = EXCLUDED.item_nome, 
  pontos_padrao = EXCLUDED.pontos_padrao;
```

---

### 3. Matriz de Usuários Reais e Permissões de Acesso

Para gerenciar o fluxo de arrecadação no dia oficial, configure a equipe de operadores designados de acordo com a matriz homologada:

1. **Conta Administrador Geral (admin)**:
   - *Perfil:* `admin` | *Turno:* `ambos`
   - *Atuação:* Coordenadores gerais. Acesso à tela de usuários, auditoria completa, cadastro de prendas e cancelamento de recibos em ambos os turnos.

2. **Operador Turno Manhã (manha)**:
   - *Perfil:* `manha` | *Turno:* `manha`
   - *Atuação:* Inspetores/Auxiliares do período matutino. Lançam arrecadações e consultam dados exclusivamente das turmas da manhã.

3. **Operador Turno Tarde (tarde)**:
   - *Perfil:* `tarde` | *Turno:* `tarde`
   - *Atuação:* Inspetores/Auxiliares do período vespertino. Lançam arrecadações e consultam dados exclusivamente das turmas da tarde.

4. **Direção Escola / Consulta Auditoria (consulta)**:
   - *Perfil:* `consulta` | *Turno:* `ambos` ou turno específico
   - *Atuação:* Diretores e fiscais externos. Apenas assistem aos painéis estatísticos, listagens de recibos e ranking atualizado em tempo real, sem direitos de alteração e lançamento.

---

### 4. Orientação para o Primeiro Dia de Uso (Day 1 Operational Playbook)

Recomendações cruciais de contingência operacional para a coordenação da escola:

* **Centralizar Lançamento com Login Individual**: Nunca compartilhe uma única conta de operador. Cada inspetor deve operar com seu próprio e-mail para rastreabilidade em caso de necessidade de auditoria ou cancelamento.
* **Uso Offline de Segurança**: Se a conectividade com a internet oscilar momentaneamente no pátio da escola, os operadores devem anotar os lançamentos em bloco físico e processar os recibos no sistema assim que o sinal se reestabelecer. Os recibos continuarão gerando a numeração sequencial correta.
* **Impressão em 2 Vias**: Sempre imprima o recibo gerado em duas vias físicas (usando o botão de ação rápida da tela): uma via é colada no lote das caixas de alimentos da respectiva turma e a outra via é entregue ao aluno/professor representante.
* **Simulações Prévias**: Realize uma simulação com os operadores 1 hora antes do início oficial da entrada dos alunos para certificar que os navegadores estejam com o cache atualizado e as impressoras térmicas devidamente calibradas.
