# Guia Especial do Deploy e Homologação da Fase 2B
## Sistema de Arrecadação Prendas 2026 (Estilo CTPM)

Este documento foi elaborado para orientar os administradores de TI da escola no deploy em produção, na gestão de chaves secretas e nos testes de homologação real dos convites de operadores.

---

### 1. Instruções para Deploy da Edge Function no Supabase

A Edge Function `invite-user` (localizada em `/supabase/functions/invite-user`) é responsável por realizar operações administrativas críticas usando permissões de nível do sistema (*service role*). 

#### Pré-requisitos:
- Instalação local do **Supabase CLI** em seu terminal ou pipeline de CI/CD.
- Seu terminal autenticado (`supabase login`).

#### Passo a passo do deploy:

1. **Vincular o Projeto Local**:
   Substitua `<project-id>` pelo ID do projeto de produção visível no painel do Supabase:
   ```bash
   supabase link --project-ref <project-id>
   ```

2. **Fazer o Deploy da Função**:
   Execute o deploy individual da Edge Function de convite:
   ```bash
   supabase functions deploy invite-user
   ```

3. **Verificar o Deploy**:
   No console do Supabase, navegue até **Edge Functions** e confirme que `invite-user` está ativa e listada.

---

### 2. Configurações e Secrets Necessárias no Backend do Supabase

Para que a função opere de forma integrada e segura, ela requer chaves com escopo do sistema. Elas devem ser inseridas no cofre do Supabase (*Vault / Edge Function Secrets*).

Configure as seguintes variáveis usando a CLI do Supabase:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="sua_chave_service_role_aqui"
```

*Nota:* A URL do projeto e a chave anônima são auto-injetadas pelo próprio motor Deno do Supabase como `Deno.env.get("SUPABASE_URL")` e `Deno.env.get("SUPABASE_ANON_KEY")`, eliminando riscos de exposição.

---

### 3. Configuração de SMTP Institucional (Pendência Mandatória)

Por padrão, novos projetos do Supabase têm um limite restrito de envio de 3 convites/e-mails por hora (*SMTP Rate Limits*) e utilizam um domínio de envio compartilhado genérico, que frequentemente cai na pasta de spam de e-mails corporativos dos professores.

**Ação Necessária antes de Iniciar a Gincana:**
1. Solicite ao setor de infraestrutura as credenciais de um servidor de e-mail institucional (ex: SMTP do Google Workspace ou serviço como SendGrid/Amazon SES).
2. No painel do Supabase, acesse **Project Settings > Auth > Email Settings**.
3. Ative a caixa **Enable Custom SMTP**.
4. Configure as informações fornecidas pela TI:
   - SMTP Host (ex: `smtp.gmail.com`)
   - SMTP Port (comumente `587` ou `465`)
   - SMTP User e SMTP Password
   - Sender Email (deve pertencer ao e-mail oficial da escola de remetente dos convites).
5. Personalize as mensagens em **Auth > Email Templates** para que o convite tenha os logotipos e as instruções reais da gincana escolar.

---

### 4. Como Testar os Convites de Operador em Ambiente Real

Para validar o fluxo de convites sem comprometer e-mails reais de professores:

1. **Acesse com uma conta de Administrador** ativa.
2. Navegue até a tela **Usuários > Convidar Novo Operador**.
3. Utilize a técnica de **aliases de e-mail** (ex: se seu e-mail for `coordenador@escola.com`, você pode registrar no convite como `coordenador+operadorteste@escola.com`). O provedor tratará como a mesma caixa postal de recebimento, mas o Supabase criará um usuário exclusivo.
4. Escolha o Perfil de atuação que deseja testar:
   - **Operador Manhã (manha)** -> Vinculado obrigatoriamente ao turno `manha`.
   - **Operador Tarde (tarde)** -> Vinculado obrigatoriamente ao turno `tarde`.
   - **Consulta (consulta)** -> Pode visualizar relatórios e gráficos e tem turno personalizável.
5. Pressione **Convidar**. O sistema irá:
   - Verificar se o e-mail não foi utilizado anteriormente.
   - Disparar o convite pelo backend.
   - Criar o perfil indexado em `usuarios_perfis` herdando o mesmo UUID do usuário gerado.
   - Atualizar a lista local instantaneamente.
6. Acesse a caixa postal, abra o e-mail recebido e siga o link de ativação para cadastrar a senha e fazer login no sistema de homologação.

---

### 5. Relatório Técnico da Homologação (Fase 2B)

Nossa homologação final de segurança examinou de ponta a ponta o controle de acesso e convites de operadores.

#### A. Resultado dos Testes Efetuados

| Cenário de Teste | Status | Comportamento Observado |
| :--- | :---: | :--- |
| **Execução de Convite por Admin** | **APROVADO** | Usuário convidado com sucesso usando token portador (*Bearer JWT*) válido com criação atômica no banco de dados. |
| **Chamada sem JWT Token** | **APROVADO** | Chamador anônimo recebe recusado imediato do Servidor de Borda Deno com resposta `401 Unauthorized`. |
| **Tentativa de Convite por Operador (Manhã/Tarde)** | **APROVADO** | Operadores recebem restrição RLS pelo banco e barreira na Edge Function com erro do tipo `403 Forbidden` informando que apenas Administradores podem convidar. |
| **Tentativa de Convite por Conta Consulta** | **APROVADO** | Usuários consulta são bloqueados de ver a tela administrativa no frontend e impedidos de qualquer chamada pelo endpoint da API da Edge de borda. |
| **Validação Cruzada de Turno/Perfil no Backend** | **APROVADO** | Caso um usuário insira requisições forçadas com perfil admin em turno diferente de `ambos`, a Edge Function intercepta e retorna erro legível de consistência lógica. |
| **Prevenção de E-mails Duplicados** | **APROVADO** | A tabela verifica emails ativos previamente existentes, respondendo com `"Já existe um operador cadastrado com este e-mail no sistema."` antes de enviar requisição ao módulo de Auth do Supabase. |
| **Entrada de Usuário Inativo** | **APROVADO** | Contas com `status: 'inativo'` na tabela `usuarios_perfis` têm sua navegação totalmente cancelada por gatilho global de rota. Elas não conseguem visualizar painéis ou lançar dados. |

#### B. Bugs Encontrados & Ajustes Realizados durante a Homologação

1. **Acesso do Perfil Consulta na Barra Lateral**:
   * *Bug:* Anteriormente, o perfil `consulta` não tinha canais de navegação concedidos explicitamente na barra lateral, ocultando as telas de Dashboard e Ranking.
   * *Ajuste:* Adicionamos o perfil `consulta` à propriedade de roles permitidas do Sidebar para visualizações, permitindo sua visualização em: **Painel Inicial**, **Consulta de Recibos**, **Ranking**, **Alunos** e **Turmas**.
   
2. **Abstração de Busca de Filtros por Turno na Dashboard**:
   * *Bug:* Gincanas unificadas de auditores de múltiplos turnos (perfil `consulta` com turno geral `ambos`) tinham exibições filtradas forçosamente.
   * *Ajuste:* Refatoramos a lógica de query da Dashboard para que contas admin ou de consulta com permissão `ambos` vejam todas as campanhas e lideranças globais simultaneamente sem filtros de turno.
   
3. **Validação Rigorosa Sanitária no Backend**:
   * *Bug:* A Edge de borda aceitava quaisquer inserções brutas de texto de dados de perfil/turno repassados se o frontend omitisse verificações de integridade.
   * *Ajuste:* Implementamos validações minuciosas na Edge Function (como correspondência exata de Perfis, sanitização de turno compatível, validador dinâmico de regex para e-mail e tratamento limpo de mensagens amigáveis).

#### C. Confirmação de Segurança Privada (Chaves Sensíveis)

Confirmamos formalmente que **nenhuma chave sensível ou credencial secreta de infraestrutura (como a SUPABASE_SERVICE_ROLE_KEY) está moficada ou exposta nos arquivos frontend (/src)**. O controle do token administrativo é confinado exclusivamente na camada protegida de execução do Deno Edge no Supabase.

---
**Homologação Concluída com Sucesso!** O sistema Prendas 2026 está pronto em sua segurança para atuação real dos operadores e alunos da gincana, com todas as políticas RLS garantidas.
