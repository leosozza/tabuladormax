# Perfis de Teste para Análise Tinder

## Visão Geral

Este arquivo contém 10 perfis fictícios criados especificamente para testar a funcionalidade de análise de leads estilo Tinder.

## Perfis Criados

### 1. Ana Silva
- **Idade**: 23 anos
- **Projeto**: Fashion Week SP
- **Scouter**: Carlos Mendes
- **Local**: Shopping Morumbi, São Paulo
- **Status**: Contato
- **Foto**: Sim
- **Criado**: 5 dias atrás

### 2. Bruno Costa
- **Idade**: 28 anos
- **Projeto**: Editorial Rio
- **Scouter**: Fernanda Lima
- **Local**: Copacabana, Rio de Janeiro
- **Status**: Agendado
- **Foto**: Sim
- **Criado**: 4 dias atrás

### 3. Carla Rodrigues
- **Idade**: 21 anos
- **Projeto**: Campanha Verão
- **Scouter**: Carlos Mendes
- **Local**: Parque Ibirapuera, São Paulo
- **Status**: Convertido
- **Foto**: Sim
- **Criado**: 3 dias atrás

### 4. Daniel Oliveira
- **Idade**: 25 anos
- **Projeto**: Desfile Nordeste
- **Scouter**: Patricia Souza
- **Local**: Praia de Iracema, Fortaleza
- **Status**: Contato
- **Foto**: Sim
- **Criado**: 2 dias atrás

### 5. Eduarda Martins
- **Idade**: 22 anos
- **Projeto**: Moda BH
- **Scouter**: Roberto Alves
- **Local**: Savassi, Belo Horizonte
- **Status**: Agendado
- **Foto**: Sim
- **Criado**: 1 dia atrás

### 6. Felipe Santos
- **Idade**: 27 anos
- **Projeto**: Campanha Outono
- **Scouter**: Juliana Torres
- **Local**: Centro, Curitiba
- **Status**: Contato
- **Foto**: Sim
- **Criado**: 6 horas atrás

### 7. Gabriela Pereira
- **Idade**: 24 anos
- **Projeto**: Fashion Sul
- **Scouter**: Marcos Silva
- **Local**: Usina do Gasômetro, Porto Alegre
- **Status**: Convertido
- **Foto**: Sim
- **Criado**: 12 horas atrás

### 8. Henrique Lima
- **Idade**: 26 anos
- **Projeto**: Verão Bahia
- **Scouter**: Amanda Costa
- **Local**: Pelourinho, Salvador
- **Status**: Agendado
- **Foto**: Não (teste de perfil sem foto)
- **Criado**: 3 horas atrás

### 9. Isabela Ferreira
- **Idade**: 20 anos
- **Projeto**: Capital Fashion
- **Scouter**: Lucas Andrade
- **Local**: Lago Paranoá, Brasília
- **Status**: Contato
- **Foto**: Sim
- **Criado**: 2 horas atrás

### 10. João Gabriel
- **Idade**: 29 anos
- **Projeto**: Recife Style
- **Scouter**: Beatriz Nunes
- **Local**: Praia de Boa Viagem, Recife
- **Status**: Contato
- **Foto**: Sim
- **Criado**: 1 hora atrás

## Como Aplicar os Perfis de Teste

### Opção 1: Via Supabase CLI
```bash
supabase migration up
```

### Opção 2: Via Supabase Dashboard
1. Acesse o Supabase Dashboard
2. Vá para SQL Editor
3. Cole o conteúdo do arquivo `supabase/migrations/20251016232003_seed_test_profiles.sql`
4. Execute a query

### Opção 3: Via SQL direto
Execute o arquivo SQL diretamente no seu banco de dados Supabase.

## Características dos Perfis

- **Diversidade Geográfica**: Perfis de diferentes cidades brasileiras (SP, RJ, BH, Curitiba, Porto Alegre, Salvador, Brasília, Recife, Fortaleza)
- **Variedade de Status**: Contato, Agendado, Convertido
- **Mix de Gêneros**: 5 perfis femininos, 5 masculinos
- **Diferentes Projetos**: Vários projetos de moda e campanhas
- **Fotos**: 9 perfis com foto, 1 sem foto (para testar esse cenário)
- **Timestamps Variados**: Criados em diferentes momentos (últimas 5 dias)
- **Todos pendentes de análise**: Campo `aprovado = NULL` para permitir teste da funcionalidade

## Testando a Funcionalidade Tinder

### Passo a Passo
1. Aplique a migração para criar os perfis
2. Acesse a página de Leads na aplicação
3. Você verá os 10 perfis na tabela
4. Selecione múltiplos perfis usando os checkboxes
5. Clique no botão "Iniciar Análise (X)"
6. O modal Tinder abrirá mostrando o primeiro perfil
7. Teste as seguintes ações:
   - **Swipe direita**: Aprovar o lead
   - **Swipe esquerda**: Rejeitar o lead
   - **Botão ❤**: Aprovar manualmente
   - **Botão ✖**: Rejeitar manualmente
8. Observe:
   - Contador de progresso (ex: "Lead 3 de 10")
   - Feedback visual (coração verde ou X vermelho)
   - Toast de confirmação
   - Atualização automática da coluna "Aprovado" na tabela

### Cenários de Teste Recomendados

#### Teste 1: Análise Completa
- Selecione todos os 10 perfis
- Analise cada um aprovando ou rejeitando
- Verifique se a tabela atualiza corretamente

#### Teste 2: Análise Parcial
- Selecione apenas 3-5 perfis
- Complete a análise
- Verifique se apenas os selecionados foram atualizados

#### Teste 3: Perfil Sem Foto
- Selecione o perfil "Henrique Lima" (sem foto)
- Verifique se a interface mostra corretamente a inicial do nome

#### Teste 4: Cancelamento
- Inicie análise
- Feche o modal antes de terminar
- Verifique se a seleção é mantida ou limpa conforme esperado

#### Teste 5: Responsividade
- Teste em desktop (mouse)
- Teste em mobile/tablet (touch/swipe)
- Verifique se ambos os modos funcionam bem

## Limpeza dos Dados de Teste

Se quiser remover os perfis de teste:

```sql
DELETE FROM public.fichas 
WHERE email IN (
  'ana.silva@email.com',
  'bruno.costa@email.com',
  'carla.rodrigues@email.com',
  'daniel.oliveira@email.com',
  'eduarda.martins@email.com',
  'felipe.santos@email.com',
  'gabriela.pereira@email.com',
  'henrique.lima@email.com',
  'isabela.ferreira@email.com',
  'joao.gabriel@email.com'
);
```

## Notas Importantes

- ⚠️ Estes são dados **fictícios** apenas para teste
- 📸 As fotos usam URLs do serviço RandomUser.me (fotos genéricas)
- 🔄 Os dados podem ser recriados executando a migração novamente
- 🗑️ Recomenda-se limpar estes dados antes de ir para produção
- ✅ Todos os campos obrigatórios estão preenchidos
- 📍 Coordenadas geográficas são reais das cidades mencionadas

## Validação

Após aplicar a migração, você pode validar com:

```sql
SELECT 
  nome, 
  idade, 
  projeto, 
  scouter, 
  local_da_abordagem,
  etapa,
  cadastro_existe_foto,
  aprovado
FROM public.fichas
WHERE email LIKE '%@email.com'
ORDER BY criado DESC
LIMIT 10;
```

Deve retornar os 10 perfis criados.
