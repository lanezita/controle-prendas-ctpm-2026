# Protocolo de Operação e Segurança • Prendas 2026
## Manual de Campo para Operadores e Fiscais da Gincana (Módulo EFAI)

Este protocolo estabelece as regras de atuação, boas práticas de segurança, planos de contingência e procedimentos padrão de operação para o uso do **Sistema Prendas 2026**. Toda a equipe (administradores, operadores de turno e auditores/consulta) deve estar treinada segundo os passos deste guia.

---

### 1. Objetivo do Sistema
O **Sistema Prendas 2026** foi desenvolvido sob rígidos critérios de integridade para digitalizar, auditar e calcular o ranking das turmas do Ensino Fundamental Anos Iniciais (EFAI) de forma automatizada. Seu foco principal é assegurar que **cada prenda arrecadada seja associada a um recibo sequencial, seguro e auditável**, impedindo fraudes, lançamentos duplicados ou perda de pontuação.

---

### 2. Perfis de Usuário e Controle de Turnos

| Perfil | Código | Horário / Turno | Permissões no Sistema |
| :--- | :---: | :---: | :--- |
| **Administrador** | `admin` | Ambos os turnos | Acesso irrestrito. Criação de operadores, edição de tabelas de pontos, cancelamento de recibos de qualquer período, ativação de campanhas relâmpago. |
| **Operador Manhã** | `manha` | Matutino (`07:00` às `12:00`) | Lançamento e consulta de recibos somente para turmas deste turno. Não acessa recursos administrativos ou do turno oposto. |
| **Operador Tarde** | `tarde` | Vespertino (`13:00` às `18:00`) | Lançamento e consulta de recibos somente para turmas deste turno. Não acessa recursos administrativos ou do turno oposto. |
| **Consulta / Fiscal** | `consulta`| Visualização apenas | Auditores, diretores ou fiscais de turmas. Visualização em tempo real de painéis, relatórios diários de arrecadação e ranking, sem direito de alteração. |

---

### 3. Passo a Passo para Lançamento de Prendas

O lançamento deve ser feito **obrigatoriamente na presença do aluno** (ou representante da turma) que está entregando a prenda:

1. **Localizar o Aluno**:
   - Acesse a aba **Lançamento de Prendas**.
   - Digite o nome do aluno ou a matrícula oficial. *Sempre confirme verbalmente o nome completo e a turma indicada pelo visor do sistema para evitar homônimos.*
2. **Selecionar a Prenda**:
   - Selecione a prenda na listagem de pontos padrão, informando a quantidade exata arrecadada.
   - Caso seja um item não tabelado, use a opção **Item Avulso**, inserindo a descrição clara do item e a quantidade de pontos acordada com a coordenação.
3. **Validar Informações (Tela de Confirmação)**:
   - Clique em **Avançar**.
   - No celular ou desktop, o visor mostrará o resumo dos itens, a quantidade, multiplicadores de campanhas ativas e a pontuação total estimulada. 
   - **Atenção:** Confira com calma. Nomes compridos ou listas extensas de prendas podem ser lidos perfeitamente no celular usando a visualização otimizada em cartões (cards).
4. **Gerar Recibo**:
   - Clique em **Confirmar e Gerar Recibo**. O sistema criará na hora a numeração única e imutável de recibo.

---

### 4. Passo a Passo para Impressão de Recibo em 2 Vias

A comprovação física é o lastro de auditoria da gincana escolar. O sistema permite a impressão térmica rápida:

1. Assim que a tela confirmar o lançamento bem-sucedido, a caixa de diálogo do recibo será exibida contendo o botão de atalho **Imprimir Recibo**.
2. **Via 1 (Aluno/Representante)**: Clique para disparar a impressão na impressora térmica configurada. Entregue esta via imediatamente para o responsável pela entrega das prendas. Ela é o comprovante do aluno para validar sua pontuação.
3. **Via 2 (Lote de Alimentos)**: Dispare a segunda impressão. Cole esta via ou prenda-a com fita adesiva de forma bem visível diretamente na caixa de arrecadação ou lote de alimentos da respectiva turma.
4. *Dica:* Se precisar reimprimir em outro momento, use a aba **Consulta de Recibos**, localize o número correspondente e clique no botão de impressão rápida.

---

### 5. Passo a Passo para Cancelamento de Recibos

Recibos homologados **nunca podem ser excluídos ou editados**. Caso haja erro de digitação ou divergência física na contagem pós-lançamento, siga o protocolo de anulação:

1. **Apenas Administradores** possuem acesso à ferramenta de cancelamento. Chame o auditor coordenador da gincana.
2. Acesse a tela **Consulta de Recibos**.
3. Localize o recibo que possui a divergência de informação.
4. Clique no botão de ação **Cancelar Recibo**.
5. **Justificativa Obrigatória**: Insira um texto detalhando o motivo real do cancelamento (Ex: *"Item digitado incorretamente como arroz 5kg, o correto era feijão 1kg. Cancelado para correção."*).
6. Confirme a operação. O recibo passará a ser exibido com status **CANCELADO** e com marca d'água destacada na ficha de impressão. Todos os pontos deste lançamento serão subtraídos do ranking da turma instantaneamente.
7. O operador do turno deve então proceder com um novo lançamento correto.

---

### 6. Regras de Campanhas Relâmpago

Para incentivar a arrecadação de alimentos prioritários em escassez, a administração poderá ativar campanhas temporárias:

- Durante a vigência de uma campanha ativa (ex: *Dobro de pontos para Leite Longa Vida*), o sistema aplica automaticamente a multiplicação correspondente.
- A aplicação é feita **automaticamente pelo backend** do sistema no instante em que o recibo é selado. No modal de confirmação de lançamento, os operadores conseguem ver o selo de campanha ativo ("⚡") e o multiplicador correspondente.
- Nenhum operador consegue ativar ou alterar multiplicadores de campanha manualmente durante o processo de preenchimento, assegurando equidade total para todas as turmas e turnos.

---

### 7. Regras de Ouro (Erros e Conduta)

* **NUNCA Apague ou Altere Dados por Fora**: Lançou de forma incorreta? O único caminho aceito e auditado é realizar a anulação (cancelamento) do recibo de forma transparente e redigitar o lançamento correto.
* **Justifique Detalhadamente**: Lembre-se de que fiscais de outras turmas analisarão os relatórios. Justificativas vagas nos cancelamentos como *"erro"* ou *"*corrido*"* serão recusadas na auditoria semanal da escola.
* **LOGIN É INDIVIDUAL**: Sob nenhuma hipótese compartilhe seu e-mail de acesso e senha com outros inspetores. Todo lançamento e cancelamento registra o autor da ação, garantindo transparência completa e blindagem de segurança para os próprios operadores.

---

### 8. Plano de Contingência (Gestão de Crises no Pátio)

| Problema | Causa Provável | Ação de Contingência Imediata |
| :--- | :---: | :--- |
| **Queda de Conexão (Internet)** | Falha no Wi-Fi escolar | **Não interrompa as arrecadações.** Anote as entregas manualmente em um bloco de notas impresso padronizado com: Nome, Matrícula, Turma, Itens entregues e assinatura do operador e do aluno. Assim que a conexão retornar, digite os recibos sequencialmente. |
| **Falha ou Fim de Papel na Impressora** | Problema físico de hardware | O sistema salva e gera o recibo mesmo com a impressora desligada. Continue operando normalmente. Anote o número do recibo na caderneta e, ao reestabelecer o equipamento, acesse a aba de busca e realize a impressão tardia das duas vias acumuladas. |
| **Lançamento Duplicado** | Confusão ou clique duplo | Chame o coordenador com perfil `admin` para analisar e cancelar o recibo duplicado informando o número do documento original que continuará valendo na justificativa de anulação. |
| **Arrecadação no Aluno Errado** | Seleção apressada na lista | O recibo gerado no nome do aluno incorreto deve ser cancelado via administrador. O operador deve realizar o preenchimento de um novo recibo para o aluno correto. |
| **Campanha não Aplicada no Visor** | Campanha não foi ativada a tempo | Solicite ao administrador que confirme nas configurações se a campanha está com status `ativa`. Se o recebimento foi homologado sem a pontuação multiplicada por falha operacional, o recibo deve ser cancelado e lançado de novo com as regras ativas. |

---

### 9. Checklist de Abertura do Dia (Início do Turno)

Realizar **30 minutos antes** da entrada dos alunos:

- [ ] Verificar o status físico de bobinas e conexão de energia das impressoras térmicas dos guichês.
- [ ] Ligar os computadores/tablets e fazer login com as credenciais exclusivas do operador correspondente ao período (Manhã ou Tarde).
- [ ] Checar se há notificações ou regras especiais de campanhas ativas fixadas no painel inicial (Dashboard).
- [ ] Realizar um lançamento de teste fictício (com o aluno padrão de homologação) e validar se a fila de impressão opera perfeitamente. *Pedir ao admin para cancelar o teste em seguida.*

---

### 10. Checklist de Fechamento do Dia (Fim do Turno)

Realizar **ao término oficial das arrecadações**:

- [ ] Gerar o **Relatório de Fechamento do Dia** disponível na aba de relatórios e exportar a planilha com os totais consolidados.
- [ ] Confrontar a soma física dos lotes de arrecadação no pátio com o total computado pelo sistema (Auditoria Física).
- [ ] Conferir se existem recibos pendentes de avaliação ou reclamações de alunos não computadas.
- [ ] Guardar os comprovantes internos (2ª via do lote) organizados por turma.
- [ ] Executar o processo de encerramento de sessão (**Sair da Conta**) em todos os guichês físicos para impedir acessos acidentais de terceiros.

---

### 11. Boas Práticas de Segurança e Rastreabilidade

- **Mantenha os dispositivos bloqueados**: Ao se afastar do guichê por qualquer motivo, lembre-se de travar a tela de seu computador ou tablet.
- **Transparência para a Comunidade**: O **Painel Visual e o Ranking** podem ser mantidos abertos em TVs digitais ou projetores no saguão da escola. Isso gera clima de integração cooperativa e auto-auditoria contínua pelos próprios pais, alunos e professores da escola.
