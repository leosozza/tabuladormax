#!/usr/bin/env node
/**
 * Manual test script for scouter metrics calculations
 * Run with: node src/utils/__tests__/manualTest.js
 */

import { 
  calculateWorkingHours, 
  calculateAverageTimeBetweenFichas,
  formatHoursToReadable,
  formatMinutesToReadable
} from '../scouterMetrics.ts';

// Test data simulating real fichas
const testFichas = [
  // Carlos Silva - Day 1: 3 fichas (09:00 to 17:00)
  {
    id: 1,
    scouter: 'CARLOS SILVA',
    criado: '15/09/2024',
    hora_criacao_ficha: '09:00'
  },
  {
    id: 2,
    scouter: 'CARLOS SILVA',
    criado: '15/09/2024',
    hora_criacao_ficha: '12:30'
  },
  {
    id: 3,
    scouter: 'CARLOS SILVA',
    criado: '15/09/2024',
    hora_criacao_ficha: '17:00'
  },
  
  // Maria Santos - Day 1: 4 fichas (08:00 to 14:00)
  {
    id: 4,
    scouter: 'MARIA SANTOS',
    criado: '15/09/2024',
    hora_criacao_ficha: '08:00'
  },
  {
    id: 5,
    scouter: 'MARIA SANTOS',
    criado: '15/09/2024',
    hora_criacao_ficha: '10:00'
  },
  {
    id: 6,
    scouter: 'MARIA SANTOS',
    criado: '15/09/2024',
    hora_criacao_ficha: '12:00'
  },
  {
    id: 7,
    scouter: 'MARIA SANTOS',
    criado: '15/09/2024',
    hora_criacao_ficha: '14:00'
  },
  
  // Carlos Silva - Day 2: 2 fichas (10:00 to 16:00)
  {
    id: 8,
    scouter: 'CARLOS SILVA',
    criado: '16/09/2024',
    hora_criacao_ficha: '10:00'
  },
  {
    id: 9,
    scouter: 'CARLOS SILVA',
    criado: '16/09/2024',
    hora_criacao_ficha: '16:00'
  },
  
  // Pedro Costa - Day 1: Only 1 ficha (edge case)
  {
    id: 10,
    scouter: 'PEDRO COSTA',
    criado: '15/09/2024',
    hora_criacao_ficha: '11:00'
  },
  
  // Test with datahoracel fallback
  {
    id: 11,
    scouter: 'ANA OLIVEIRA',
    datahoracel: '15/09/2024 09:30'
  },
  {
    id: 12,
    scouter: 'ANA OLIVEIRA',
    datahoracel: '15/09/2024 18:00'
  }
];

console.log('=== Testing Scouter Metrics ===\n');

// Test Working Hours
const workingHours = calculateWorkingHours(testFichas);
console.log('Working Hours Metrics:');
console.log('- Total Hours:', workingHours.totalHours);
console.log('- Average Hours Per Day:', workingHours.averageHoursPerDay.toFixed(2));
console.log('- Day Count:', workingHours.dayCount);
console.log('- Formatted:', formatHoursToReadable(workingHours.averageHoursPerDay));
console.log('');

// Test Average Time Between Fichas
const timeBetween = calculateAverageTimeBetweenFichas(testFichas);
console.log('Average Time Between Fichas:');
console.log('- Average Minutes:', timeBetween.averageMinutes.toFixed(2));
console.log('- Total Intervals:', timeBetween.totalIntervals);
console.log('- Formatted:', formatMinutesToReadable(timeBetween.averageMinutes));
console.log('');

// Expected results:
console.log('Expected Results:');
console.log('- Carlos Day 1: 8 hours (09:00-17:00), 2 intervals (210min + 270min = 480min total)');
console.log('- Maria Day 1: 6 hours (08:00-14:00), 3 intervals (120min + 120min + 120min = 360min total)');
console.log('- Carlos Day 2: 6 hours (10:00-16:00), 1 interval (360min)');
console.log('- Pedro Day 1: 0 hours (only 1 ficha), 0 intervals');
console.log('- Ana Day 1: 8.5 hours (09:30-18:00), 1 interval (510min)');
console.log('');
console.log('Total: 28.5 hours across 5 days = 5.7h average per day');
console.log('Total: 1710 minutes across 7 intervals = 244.3 min average between fichas');

export { testFichas };
