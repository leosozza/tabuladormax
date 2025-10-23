#!/bin/bash
# Script de verificação do workspace gestao-scouter
# Executa testes básicos para validar a integração

set -e

echo "=================================================="
echo "🔍 Verificação do Workspace Gestão Scouter"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check functions
check_pass() {
    echo -e "${GREEN}✅ $1${NC}"
}

check_fail() {
    echo -e "${RED}❌ $1${NC}"
}

check_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 1. Verificar estrutura de diretórios
echo "1. Verificando estrutura de diretórios..."
if [ -d "packages/gestao-scouter" ]; then
    check_pass "Diretório packages/gestao-scouter existe"
else
    check_fail "Diretório packages/gestao-scouter não encontrado"
    exit 1
fi

if [ -f "packages/gestao-scouter/package.json" ]; then
    check_pass "package.json do gestao-scouter encontrado"
else
    check_fail "package.json do gestao-scouter não encontrado"
    exit 1
fi

# 2. Verificar configuração de workspace
echo ""
echo "2. Verificando configuração de workspace..."
if grep -q '"workspaces"' package.json; then
    check_pass "Campo workspaces encontrado em package.json"
else
    check_fail "Campo workspaces não encontrado em package.json"
    exit 1
fi

if grep -q 'packages/\*' package.json; then
    check_pass "Padrão packages/* configurado"
else
    check_fail "Padrão packages/* não configurado"
    exit 1
fi

# 3. Verificar scripts
echo ""
echo "3. Verificando scripts npm..."
if grep -q '"dev:gestao-scouter"' package.json; then
    check_pass "Script dev:gestao-scouter encontrado"
else
    check_fail "Script dev:gestao-scouter não encontrado"
fi

if grep -q '"build:gestao-scouter"' package.json; then
    check_pass "Script build:gestao-scouter encontrado"
else
    check_fail "Script build:gestao-scouter não encontrado"
fi

# 4. Verificar configuração TypeScript
echo ""
echo "4. Verificando configuração TypeScript..."
if grep -q '@gestao-scouter' tsconfig.json; then
    check_pass "Path alias @gestao-scouter configurado em tsconfig.json"
else
    check_fail "Path alias @gestao-scouter não encontrado em tsconfig.json"
fi

if grep -q 'packages/gestao-scouter/tsconfig.json' tsconfig.json; then
    check_pass "Referência ao tsconfig.json do gestao-scouter encontrada"
else
    check_warn "Referência ao tsconfig.json do gestao-scouter não encontrada"
fi

# 5. Verificar configuração Vite
echo ""
echo "5. Verificando configuração Vite..."
if grep -q '@gestao-scouter' vite.config.ts; then
    check_pass "Alias @gestao-scouter configurado em vite.config.ts"
else
    check_fail "Alias @gestao-scouter não encontrado em vite.config.ts"
fi

# 6. Verificar CI workflow
echo ""
echo "6. Verificando CI workflow..."
if [ -f ".github/workflows/ci.yml" ]; then
    check_pass "Workflow CI encontrado"
    
    if grep -q 'build:gestao-scouter' .github/workflows/ci.yml; then
        check_pass "Build do gestao-scouter configurado no CI"
    else
        check_warn "Build do gestao-scouter não configurado no CI"
    fi
else
    check_warn "Workflow CI não encontrado"
fi

# 7. Verificar .gitignore
echo ""
echo "7. Verificando .gitignore..."
if grep -q '\.zip' .gitignore; then
    check_pass "Arquivos .zip ignorados"
else
    check_warn "Arquivos .zip não estão sendo ignorados"
fi

# 8. Verificar documentação
echo ""
echo "8. Verificando documentação..."
if [ -f "WORKSPACE_INTEGRATION_GUIDE.md" ]; then
    check_pass "Guia de integração encontrado"
else
    check_warn "Guia de integração não encontrado"
fi

if [ -f "packages/gestao-scouter/README.md" ]; then
    check_pass "README do gestao-scouter encontrado"
else
    check_warn "README do gestao-scouter não encontrado"
fi

# 9. Verificar instalação de dependências
echo ""
echo "9. Verificando instalação de dependências..."
if [ -d "node_modules" ]; then
    check_pass "node_modules do root instalado"
else
    check_warn "node_modules do root não instalado. Execute: npm install --legacy-peer-deps"
fi

if [ -d "packages/gestao-scouter/node_modules" ]; then
    check_pass "node_modules do gestao-scouter instalado"
else
    check_warn "node_modules do gestao-scouter não instalado"
fi

# 10. Teste de build (opcional, se node_modules instalado)
echo ""
echo "10. Testes de build (opcional)..."
if [ -d "node_modules" ]; then
    echo "   Testando build do root..."
    if npm run build > /dev/null 2>&1; then
        check_pass "Build do root funciona"
    else
        check_fail "Build do root falhou"
    fi
    
    echo "   Testando build do gestao-scouter..."
    if npm run build:gestao-scouter > /dev/null 2>&1; then
        check_pass "Build do gestao-scouter funciona"
    else
        check_fail "Build do gestao-scouter falhou"
    fi
else
    check_warn "Pulando testes de build (node_modules não instalado)"
fi

echo ""
echo "=================================================="
echo "🎉 Verificação concluída!"
echo "=================================================="
echo ""
echo "Para executar o gestao-scouter:"
echo "  npm run dev:gestao-scouter"
echo ""
echo "Para build:"
echo "  npm run build:gestao-scouter"
echo ""
echo "Consulte WORKSPACE_INTEGRATION_GUIDE.md para mais informações."
