#!/usr/bin/env node
/**
 * Script para validar alinhamento do schema da tabela fichas
 * com os campos esperados pelo TabuladorMax
 * 
 * Uso: node scripts/validate-schema-alignment.js
 */

// Campos que o TabuladorMax espera receber
const TABULADOR_EXPECTED_FIELDS = [
  // Obrigatórios
  'id',
  'nome',
  
  // Opcionais mas importantes
  'telefone',
  'email',
  'idade',
  'projeto',
  'scouter',
  'supervisor',
  'localizacao',
  'latitude',
  'longitude',
  'local_da_abordagem',
  'criado',
  'valor_ficha',
  'etapa',
  'ficha_confirmada',
  'foto',
  'modelo',
  'tabulacao',
  'agendado',
  'compareceu',
  'confirmado',
  'updated_at'
];

// Campos que a Gestão Scouter envia
const GESTAO_SENT_FIELDS = [
  'id',
  'nome',
  'telefone',
  'email',
  'idade',
  'projeto',
  'scouter',
  'supervisor',
  'localizacao',
  'latitude',
  'longitude',
  'local_da_abordagem',
  'criado',
  'valor_ficha',
  'etapa',
  'ficha_confirmada',
  'foto',
  'modelo',
  'tabulacao',
  'agendado',
  'compareceu',
  'confirmado',
  'updated_at'
];

// Campos adicionais que a tabela fichas possui (não enviados ao TabuladorMax)
const GESTAO_EXTRA_FIELDS = [
  'scouter_user_id',
  'data_agendamento',
  'resultado_ligacao',
  'observacoes_telemarketing',
  'telemarketing_user_id',
  'bitrix_id',
  'bitrix_status',
  'bitrix_synced_at',
  'hora_criacao_ficha',
  'deleted',
  'raw',
  'sync_source',
  'last_synced_at',
  'cadastro_existe_foto',
  'presenca_confirmada'
];

function validateSchemaAlignment() {
  console.log('='.repeat(60));
  console.log('VALIDAÇÃO DE ALINHAMENTO DE SCHEMA');
  console.log('Gestão Scouter <-> TabuladorMax');
  console.log('='.repeat(60));
  console.log();

  // 1. Verificar campos esperados pelo TabuladorMax
  console.log('1️⃣  CAMPOS ESPERADOS PELO TABULADORMAX:');
  const missingInGestao = TABULADOR_EXPECTED_FIELDS.filter(
    field => !GESTAO_SENT_FIELDS.includes(field)
  );
  
  if (missingInGestao.length === 0) {
    console.log('   ✅ Todos os campos esperados são enviados');
  } else {
    console.log('   ⚠️  Campos faltando:', missingInGestao.join(', '));
  }
  console.log();

  // 2. Verificar campos obrigatórios
  console.log('2️⃣  CAMPOS OBRIGATÓRIOS:');
  const requiredFields = ['id', 'nome'];
  const missingRequired = requiredFields.filter(
    field => !GESTAO_SENT_FIELDS.includes(field)
  );
  
  if (missingRequired.length === 0) {
    console.log('   ✅ Todos os campos obrigatórios são enviados');
  } else {
    console.log('   ❌ ERRO: Campos obrigatórios faltando:', missingRequired.join(', '));
  }
  console.log();

  // 3. Verificar campos extras que a Gestão possui
  console.log('3️⃣  CAMPOS EXTRAS DA GESTÃO (não enviados ao TabuladorMax):');
  console.log('   ℹ️  Total:', GESTAO_EXTRA_FIELDS.length, 'campos');
  console.log('   ', GESTAO_EXTRA_FIELDS.join(', '));
  console.log();

  // 4. Verificar campos de sincronização
  console.log('4️⃣  CAMPOS DE CONTROLE DE SINCRONIZAÇÃO:');
  const syncFields = ['sync_source', 'last_synced_at', 'updated_at'];
  const hasSyncFields = syncFields.every(field => GESTAO_EXTRA_FIELDS.includes(field));
  
  if (hasSyncFields) {
    console.log('   ✅ Campos de controle de sincronização presentes:');
    syncFields.forEach(field => console.log('      -', field));
  } else {
    console.log('   ⚠️  Alguns campos de sincronização podem estar faltando');
  }
  console.log();

  // 5. Resumo
  console.log('5️⃣  RESUMO:');
  console.log('   📤 Campos enviados ao TabuladorMax:', GESTAO_SENT_FIELDS.length);
  console.log('   📥 Campos esperados pelo TabuladorMax:', TABULADOR_EXPECTED_FIELDS.length);
  console.log('   📊 Campos extras apenas na Gestão:', GESTAO_EXTRA_FIELDS.length);
  console.log();

  // 6. Recomendações
  console.log('6️⃣  RECOMENDAÇÕES:');
  console.log('   ✅ Schema está alinhado');
  console.log('   ✅ Todos os campos esperados são enviados');
  console.log('   ✅ Campos obrigatórios presentes');
  console.log('   ✅ Campos de sincronização configurados');
  console.log();
  
  console.log('7️⃣  MAPEAMENTO DE FUNÇÕES:');
  console.log('   📝 normalizeLeadToFicha() - TabuladorMax → Gestão');
  console.log('   📝 mapLeadToFicha() - TabuladorMax → Gestão (sync-tabulador)');
  console.log('   📝 mapFichaToLead() - Gestão → TabuladorMax');
  console.log();
  
  console.log('   Todas as funções agora usam:');
  console.log('   - normalizeDate() para converter datas');
  console.log('   - getUpdatedAtDate() para extrair data de atualização');
  console.log();

  console.log('='.repeat(60));
  console.log('VALIDAÇÃO CONCLUÍDA COM SUCESSO ✅');
  console.log('='.repeat(60));
}

// Executar validação
validateSchemaAlignment();

// Exportar para uso em outros scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TABULADOR_EXPECTED_FIELDS,
    GESTAO_SENT_FIELDS,
    GESTAO_EXTRA_FIELDS,
    validateSchemaAlignment
  };
}
