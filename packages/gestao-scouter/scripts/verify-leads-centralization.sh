#!/bin/bash
# Script de Verificação da Centralização da Tabela 'leads'
# =========================================================
# Este script valida que a aplicação está usando exclusivamente
# a tabela 'leads' como fonte de dados.

echo "🔍 Verificando centralização da tabela 'leads'..."
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contadores
PASS=0
FAIL=0
WARN=0

# 1. Verificar se há queries para a tabela 'fichas' em código de produção
echo "1️⃣  Verificando queries de tabela 'fichas' (deveria não existir)..."
FICHAS_QUERIES=$(grep -rE "\.from\(['\"]fichas['\"]\)" src --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "test\|mock\|example\|fichas_compat" | wc -l)
if [ "$FICHAS_QUERIES" -eq 0 ]; then
    echo -e "${GREEN}✅ Nenhuma query para tabela 'fichas' encontrada${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ Encontradas $FICHAS_QUERIES queries para tabela 'fichas'${NC}"
    grep -rE "\.from\(['\"]fichas['\"]\)" src --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "test\|mock\|example"
    ((FAIL++))
fi

# 2. Verificar queries corretas para 'leads'
echo ""
echo "2️⃣  Verificando queries para tabela 'leads'..."
LEADS_QUERIES=$(grep -rE "\.from\(['\"]leads['\"]\)" src --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
if [ "$LEADS_QUERIES" -gt 0 ]; then
    echo -e "${GREEN}✅ Encontradas $LEADS_QUERIES queries para tabela 'leads'${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ Nenhuma query para tabela 'leads' encontrada${NC}"
    ((FAIL++))
fi

# 3. Verificar repositories
echo ""
echo "3️⃣  Verificando repositories..."
REPO_FILES=("src/repositories/leadsRepo.ts" "src/repositories/dashboardRepo.ts" "src/repositories/fichasRepo.ts")
for file in "${REPO_FILES[@]}"; do
    if [ -f "$file" ]; then
        LEADS_IN_REPO=$(grep -E "\.from\(['\"]leads['\"]\)" "$file" 2>/dev/null | wc -l)
        if [ "$LEADS_IN_REPO" -gt 0 ]; then
            echo -e "${GREEN}✅ $file usa 'leads'${NC}"
            ((PASS++))
        else
            echo -e "${RED}❌ $file não usa 'leads'${NC}"
            ((FAIL++))
        fi
    else
        echo -e "${YELLOW}⚠️  $file não encontrado${NC}"
        ((WARN++))
    fi
done

# 4. Verificar hooks
echo ""
echo "4️⃣  Verificando hooks..."
HOOK_FILES=("src/hooks/useFichas.ts")
for file in "${HOOK_FILES[@]}"; do
    if [ -f "$file" ]; then
        LEADS_IN_HOOK=$(grep -E "\.from\(['\"]leads['\"]\)" "$file" 2>/dev/null | wc -l)
        if [ "$LEADS_IN_HOOK" -gt 0 ]; then
            echo -e "${GREEN}✅ $file usa 'leads'${NC}"
            ((PASS++))
        else
            echo -e "${RED}❌ $file não usa 'leads'${NC}"
            ((FAIL++))
        fi
    else
        echo -e "${YELLOW}⚠️  $file não encontrado${NC}"
        ((WARN++))
    fi
done

# 5. Verificar documentação
echo ""
echo "5️⃣  Verificando documentação..."
DOC_FILES=("LEADS_DATA_SOURCE.md" "CENTRALIZACAO_LEADS_SUMMARY.md")
for file in "${DOC_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file existe${NC}"
        ((PASS++))
    else
        echo -e "${RED}❌ $file não encontrado${NC}"
        ((FAIL++))
    fi
done

# 6. Verificar migration SQL
echo ""
echo "6️⃣  Verificando migration SQL..."
MIGRATION_FILE="supabase/migrations/20251018_migrate_fichas_to_leads.sql"
if [ -f "$MIGRATION_FILE" ]; then
    echo -e "${GREEN}✅ Migration SQL existe${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ Migration SQL não encontrado${NC}"
    ((FAIL++))
fi

# 7. Verificar edge functions
echo ""
echo "7️⃣  Verificando edge functions..."
FUNCTIONS_DIR="supabase/functions"
if [ -d "$FUNCTIONS_DIR" ]; then
    FICHAS_IN_FUNCTIONS=$(grep -rE "\.from\(['\"]fichas['\"]\)" "$FUNCTIONS_DIR" --include="*.ts" 2>/dev/null | wc -l)
    if [ "$FICHAS_IN_FUNCTIONS" -eq 0 ]; then
        echo -e "${GREEN}✅ Edge functions não usam 'fichas'${NC}"
        ((PASS++))
    else
        echo -e "${YELLOW}⚠️  Encontradas $FICHAS_IN_FUNCTIONS referências a 'fichas' em functions${NC}"
        grep -rE "\.from\(['\"]fichas['\"]\)" "$FUNCTIONS_DIR" --include="*.ts" 2>/dev/null
        ((WARN++))
    fi
    
    LEADS_IN_FUNCTIONS=$(grep -rE "\.from\(['\"]leads['\"]\)" "$FUNCTIONS_DIR" --include="*.ts" 2>/dev/null | wc -l)
    if [ "$LEADS_IN_FUNCTIONS" -gt 0 ]; then
        echo -e "${GREEN}✅ Edge functions usam 'leads' ($LEADS_IN_FUNCTIONS referências)${NC}"
        ((PASS++))
    else
        echo -e "${YELLOW}⚠️  Nenhuma referência a 'leads' em functions${NC}"
        ((WARN++))
    fi
fi

# Resumo
echo ""
echo "=========================================="
echo "           RESUMO DA VERIFICAÇÃO"
echo "=========================================="
echo -e "${GREEN}✅ Passou: $PASS${NC}"
echo -e "${RED}❌ Falhou: $FAIL${NC}"
echo -e "${YELLOW}⚠️  Avisos: $WARN${NC}"
echo ""

if [ "$FAIL" -eq 0 ]; then
    echo -e "${GREEN}🎉 Verificação concluída com sucesso!${NC}"
    echo "A aplicação está usando a tabela 'leads' corretamente."
    exit 0
else
    echo -e "${RED}❌ Verificação falhou com $FAIL erros.${NC}"
    echo "Corrija os problemas listados acima."
    exit 1
fi
