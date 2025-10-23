#!/usr/bin/env node

/**
 * Script para inserir 20 leads fictícios na tabela leads do Supabase
 * 
 * ⚠️ FONTE ÚNICA DE VERDADE: Tabela 'leads'
 * ==========================================
 * Este script insere dados de teste EXCLUSIVAMENTE na tabela 'leads'.
 * NUNCA use a tabela 'fichas' (deprecated/legacy).
 * 
 * Para executar: node scripts/insertFakeLeads.js
 */

import { createClient } from '@supabase/supabase-js'

// Credenciais do Supabase (hardcoded por ser um script isolado)
const supabaseUrl = 'https://ngestyxtopvfeyenyvgt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nZXN0eXh0b3B2ZmV5ZW55dmd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NTM0MjEsImV4cCI6MjA3NTQyOTQyMX0.Vk22kFAD0GwVMmcJgHkNnz0P56_gK1wFQcw7tus8syc'

const supabase = createClient(supabaseUrl, supabaseKey)

const nomesMasculinos = [
  'João Silva', 'Pedro Santos', 'Lucas Oliveira', 'Rafael Costa', 'Gabriel Souza',
  'Felipe Rodrigues', 'Matheus Lima', 'Bruno Alves', 'Diego Martins', 'André Ferreira'
]

const nomesFemininos = [
  'Maria Santos', 'Ana Costa', 'Julia Silva', 'Beatriz Oliveira', 'Camila Souza',
  'Fernanda Lima', 'Larissa Rodrigues', 'Gabriela Alves', 'Isabela Martins', 'Carolina Ferreira'
]

const projetos = ['Projeto A', 'Projeto B', 'Projeto Teste', 'Casting Fashion', 'Casting Editorial']
const scouters = ['João Scouter', 'Maria Scouter', 'Pedro Scouter', 'Ana Scouter', 'Sistema']
const etapas = ['Contato', 'Agendado', 'Convertido']
const modelos = ['Fashion', 'Editorial', 'Comercial', 'Fitness', 'Plus Size']
const localizacoes = [
  'São Paulo, SP', 'Rio de Janeiro, RJ', 'Belo Horizonte, MG', 
  'Curitiba, PR', 'Porto Alegre, RS', 'Salvador, BA', 'Brasília, DF'
]

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)]
}

function randomPhone() {
  const ddd = Math.floor(Math.random() * 90) + 10
  const prefix = Math.floor(Math.random() * 9000) + 1000
  const suffix = Math.floor(Math.random() * 9000) + 1000
  return `(${ddd}) 9${prefix}-${suffix}`
}

function randomEmail(nome) {
  const namePart = nome.toLowerCase().split(' ')[0]
  const domains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com']
  const number = Math.floor(Math.random() * 999)
  return `${namePart}${number}@${randomItem(domains)}`
}

function randomAge() {
  return String(Math.floor(Math.random() * 30) + 18) // 18-48 anos
}

function randomDate(daysAgo) {
  const date = new Date()
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo))
  return date.toISOString()
}

async function insertFakeLeads() {
  console.log('🚀 Iniciando inserção de 20 leads fictícios na tabela "leads"...')
  
  const allNames = [...nomesMasculinos, ...nomesFemininos]
  const fakeLeads = []

  for (let i = 0; i < 20; i++) {
    const nome = randomItem(allNames)
    const lead = {
      nome,
      telefone: randomPhone(),
      email: randomEmail(nome),
      idade: randomAge(),
      projeto: randomItem(projetos),
      scouter: randomItem(scouters),
      etapa: randomItem(etapas),
      modelo: randomItem(modelos),
      localizacao: randomItem(localizacoes),
      valor_ficha: (Math.random() * 500 + 100).toFixed(2), // R$ 100 - R$ 600
      ficha_confirmada: randomItem(['Sim', 'Não', 'Aguardando']),
      cadastro_existe_foto: randomItem(['SIM', 'NÃO']),
      presenca_confirmada: randomItem(['Sim', 'Não', 'Pendente']),
      criado: randomDate(60).split('T')[0], // YYYY-MM-DD format (date only)
      latitude: -23.5 + (Math.random() * 0.5), // São Paulo region
      longitude: -46.6 + (Math.random() * 0.5),
      local_da_abordagem: randomItem(['Shopping', 'Rua', 'Evento', 'Academia', 'Parque']),
      aprovado: randomItem([true, false, null]),
      deleted: false, // Explicitly set deleted to false
      raw: {}, // Required field for leads table
    }
    // Fill raw with complete data backup
    lead.raw = { ...lead }
    fakeLeads.push(lead)
  }

  console.log(`📝 Inserindo ${fakeLeads.length} leads na tabela "leads"...`)
  console.log('🗂️  Tabela alvo: "leads" (FONTE ÚNICA DE VERDADE)')
  
  const { data, error } = await supabase
    .from('leads')
    .insert(fakeLeads)
    .select()

  if (error) {
    console.error('❌ Erro ao inserir leads:', error)
    throw error
  }

  console.log(`✅ ${data?.length || 0} leads inseridos com sucesso!`)
  console.log('\n📊 Resumo dos leads inseridos:')
  
  // Estatísticas
  const stats = {
    porProjeto: {},
    porEtapa: {},
    porScouter: {},
  }
  
  fakeLeads.forEach(lead => {
    stats.porProjeto[lead.projeto] = (stats.porProjeto[lead.projeto] || 0) + 1
    stats.porEtapa[lead.etapa] = (stats.porEtapa[lead.etapa] || 0) + 1
    stats.porScouter[lead.scouter] = (stats.porScouter[lead.scouter] || 0) + 1
  })
  
  console.log('\n📁 Por Projeto:')
  Object.entries(stats.porProjeto).forEach(([projeto, count]) => {
    console.log(`  - ${projeto}: ${count}`)
  })
  
  console.log('\n📊 Por Etapa:')
  Object.entries(stats.porEtapa).forEach(([etapa, count]) => {
    console.log(`  - ${etapa}: ${count}`)
  })
  
  console.log('\n👤 Por Scouter:')
  Object.entries(stats.porScouter).forEach(([scouter, count]) => {
    console.log(`  - ${scouter}: ${count}`)
  })
  
  console.log('\n✨ Script finalizado!')
}

// Executar
insertFakeLeads()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  })
