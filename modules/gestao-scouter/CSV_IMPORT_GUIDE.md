# Guia de Importação CSV - Gestão Scouter

## Preparando o Arquivo CSV

### Formato Suportado

- **Tipos de arquivo:** CSV, XLSX, XLS
- **Tamanho máximo:** 300 MB
- **Registros:** Até 200.000+ linhas
- **Encoding:** UTF-8 (recomendado)

### Estrutura do Arquivo

O sistema reconhece automaticamente variações dos nomes de colunas. Use qualquer uma das seguintes opções:

| Campo no Sistema | Aliases Aceitos |
|------------------|-----------------|
| `id` | ID, id, Id, Id_Ficha |
| `projeto` | Projetos_Comerciais, Projetos Comerciais, Projeto, projeto |
| `scouter` | Gestao_de_Scouter, Gestão de Scouter, Gestão de  Scouter, Scouter, scouter |
| `criado` | Data_de_Criacao_da_Ficha, Data de Criação da Ficha, Criado, criado, Data |
| `nome` | Nome, nome |
| `telefone` | Telefone, telefone |
| `email` | Email, email |
| `idade` | Idade, idade |
| `valor_ficha` | Valor_por_Fichas, Valor por Fichas, Valor por Ficha, R$/Ficha, Valor, valor_ficha |
| `latitude` | LAT, lat, latitude |
| `longitude` | LNG, lng, longitude |

### Exemplo de CSV Válido

```csv
ID,Nome,Projeto,Scouter,Data,Telefone,Email,Idade,Valor,LAT,LNG
1,João Silva,Projeto A,Maria Santos,15/01/2025,(11) 98765-4321,joao@email.com,25,R$ 50,00,-23.5505,-46.6333
2,Ana Costa,Projeto B,Pedro Oliveira,16/01/2025,(11) 97654-3210,ana@email.com,30,R$ 45,00,-23.5506,-46.6334
```

### Campos Obrigatórios

- **Nome:** Obrigatório (registros sem nome serão ignorados)
- **Outros campos:** Opcionais (se ausentes, serão preenchidos com valores padrão)

### Formatos de Data Aceitos

- **Brasileiro:** `DD/MM/YYYY` (ex: `15/01/2025`)
- **ISO:** `YYYY-MM-DD` (ex: `2025-01-15`)
- **Com hora:** `DD/MM/YYYY HH:MM:SS` ou `YYYY-MM-DD HH:MM:SS`

### Formatos de Valor Aceitos

- **Com R$:** `R$ 50,00` ou `R$50,00`
- **Sem R$:** `50,00` ou `50.00`
- **Somente número:** `50` ou `50.5`

### Formatos de Coordenadas

- **Decimal:** `-23.5505` / `-46.6333`
- **String:** `"-23.5505"` / `"-46.6333"`
- **Com vírgula:** `-23,5505` / `-46,6333` (será convertido automaticamente)

## Passo a Passo: Como Importar

### 1. Preparar o Arquivo

1. Abra sua planilha no Excel, Google Sheets ou LibreOffice
2. Verifique se os nomes das colunas correspondem aos aliases aceitos
3. Remova linhas vazias
4. Salve como CSV UTF-8 ou XLSX

**Dica:** Se estiver usando Excel, use "Salvar Como" → "CSV UTF-8 (delimitado por vírgula)"

### 2. Acessar o Dashboard

1. Faça login no Gestão Scouter
2. Acesse **Dashboard** no menu lateral
3. Clique no botão **"Importação Massiva (CSV)"**

### 3. Selecionar o Arquivo

1. Clique em **"Selecionar Arquivo"**
2. Escolha seu arquivo CSV/XLSX
3. Aguarde a confirmação de arquivo selecionado
4. Verifique o tamanho do arquivo exibido

### 4. Iniciar Importação

1. Clique em **"Iniciar Importação"**
2. Aguarde o processamento
3. Acompanhe a barra de progresso:
   - **Total:** Quantidade de registros no arquivo
   - **Processados:** Registros já processados
   - **Inseridos:** Registros inseridos no banco de dados

### 5. Verificar Resultado

**Importação bem-sucedida:**
- Mensagem verde: "Importação concluída com sucesso!"
- Quantidade de registros inseridos
- Dashboard será atualizado automaticamente

**Importação com erros:**
- Mensagem amarela: "Importação parcialmente concluída"
- Lista de erros encontrados
- Registros válidos serão inseridos normalmente

**Importação falhou:**
- Mensagem vermelha: "Falha na importação"
- Nenhum registro foi inserido
- Verifique o formato do arquivo

## Tempo de Processamento

| Quantidade de Registros | Tempo Estimado |
|-------------------------|----------------|
| 1.000 registros | ~30 segundos |
| 10.000 registros | ~1 minuto |
| 50.000 registros | ~2 minutos |
| 100.000 registros | ~5 minutos |
| 200.000 registros | ~8 minutos |

**Nota:** Os tempos podem variar dependendo da conexão com a internet e da performance do servidor.

## Troubleshooting

### Erro: "Arquivo inválido"
**Causa:** Formato de arquivo não suportado  
**Solução:** Salve novamente como CSV UTF-8 ou XLSX

### Erro: "Arquivo muito grande"
**Causa:** Arquivo excede 300 MB  
**Solução:** 
1. Dividir em múltiplos arquivos menores
2. Remover colunas desnecessárias
3. Comprimir dados (remover espaços extras)

### Erro: "Nenhum dado válido encontrado"
**Causa:** Todas as linhas foram filtradas (sem nome ou ID)  
**Solução:**
1. Verificar se coluna "Nome" está preenchida
2. Verificar se há pelo menos uma linha de dados (além do cabeçalho)

### Importação lenta
**Causa:** Arquivo muito grande ou conexão instável  
**Solução:**
1. Usar conexão de internet estável
2. Dividir em arquivos menores (50k registros cada)
3. Importar em horários de menor tráfego

### Dados não aparecem após importação
**Causa:** Cache do navegador  
**Solução:**
1. Pressionar Ctrl+Shift+R (hard refresh)
2. Limpar cache do navegador
3. Aguardar alguns segundos e atualizar novamente

### Coordenadas incorretas
**Causa:** Formato de coordenadas não reconhecido  
**Solução:**
1. Usar formato decimal: `-23.5505` / `-46.6333`
2. Remover espaços extras
3. Usar ponto (.) como separador decimal, não vírgula (,)

### Valores de ficha incorretos
**Causa:** Formato de moeda não reconhecido  
**Solução:**
1. Usar formato: `R$ 50,00` ou `50.00`
2. Remover caracteres especiais extras
3. Usar ponto ou vírgula como separador decimal

## Validações Aplicadas

Durante a importação, o sistema valida:

1. **Nome:** Obrigatório e não vazio
2. **ID:** Convertido para inteiro (se presente)
3. **Data:** Convertida para formato ISO (YYYY-MM-DD)
4. **Valor:** Convertido para número decimal
5. **Coordenadas:** Convertidas para float (se presentes)
6. **Telefone/Email:** Aceitos como string (sem validação de formato)

## Campos Adicionais

Além dos campos principais, você pode incluir:

- `etapa`: Status da ficha
- `supervisor`: Nome do supervisor
- `localizacao`: Localização da abordagem
- `local_da_abordagem`: Local específico
- `modelo`: Modelo de ficha
- `ficha_confirmada`: Status de confirmação
- `foto`: URL da foto
- `compareceu`: Status de comparecimento
- `confirmado`: Status de confirmação
- `tabulacao`: Status de tabulação
- `agendado`: Status de agendamento

**Nota:** Esses campos são opcionais e serão armazenados no campo `raw` (JSON) se não forem mapeados.

## Boas Práticas

1. **Backup:** Sempre faça backup do arquivo original antes de importar
2. **Teste:** Importe um arquivo pequeno (100 registros) primeiro para testar
3. **Limpeza:** Remova linhas duplicadas antes de importar
4. **Padronização:** Use nomes de colunas consistentes
5. **Encoding:** Sempre salve como UTF-8 para evitar problemas com acentos
6. **Divisão:** Para arquivos muito grandes, divida em partes de 50k-100k registros

## Suporte

Se encontrar problemas não listados aqui:

1. Verifique os logs do console (F12 → Console)
2. Tire um print da mensagem de erro
3. Entre em contato com o suporte técnico
4. Envie um arquivo de exemplo (sem dados sensíveis)

## Próximas Atualizações

- Validação de telefone e email
- Importação incremental (apenas novos registros)
- Agendamento de importações automáticas
- Integração com Google Sheets (sincronização em tempo real)
- Exportação de relatórios de importação
