// ============================================
// Tinder Card Config Modal Tests
// ============================================
// Unit tests for TinderCardConfigModal component

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TinderCardConfigModal } from '@/components/gestao/TinderCardConfigModal';

// Mock hooks
vi.mock('@/hooks/useTinderCardConfig', () => ({
  useTinderCardConfig: () => ({
    config: {
      photoField: 'photo_url',
      mainFields: ['name', 'age'],
      detailFields: ['scouter', 'local_da_abordagem'],
      badgeFields: ['ficha_confirmada'],
    },
    setPhotoField: vi.fn(),
    addMainField: vi.fn(),
    removeMainField: vi.fn(),
    addDetailField: vi.fn(),
    removeDetailField: vi.fn(),
    addBadgeField: vi.fn(),
    removeBadgeField: vi.fn(),
    resetToDefault: vi.fn(),
    canAddMainField: vi.fn(() => true),
    canRemoveMainField: vi.fn(() => true),
    canAddDetailField: vi.fn(() => true),
    canAddBadgeField: vi.fn(() => true),
    validation: {
      mainFields: { min: 1, max: 2 },
      detailFields: { max: 6 },
      badgeFields: { max: 5 },
    },
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

describe('TinderCardConfigModal', () => {
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when open', () => {
    render(
      <TinderCardConfigModal 
        open={true} 
        onOpenChange={mockOnOpenChange} 
      />
    );
    
    expect(screen.getByText('Configuração do Cartão de Análise')).toBeInTheDocument();
    expect(screen.getByText('Personalizar quais campos aparecem no cartão de análise de leads')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(
      <TinderCardConfigModal 
        open={false} 
        onOpenChange={mockOnOpenChange} 
      />
    );
    
    expect(screen.queryByText('Configuração do Cartão de Análise')).not.toBeInTheDocument();
  });

  it('should display current configuration', () => {
    render(
      <TinderCardConfigModal 
        open={true} 
        onOpenChange={mockOnOpenChange} 
      />
    );
    
    // Check if current fields are displayed
    expect(screen.getByText(/Campo de Foto/i)).toBeInTheDocument();
    expect(screen.getByText(/Campos Principais/i)).toBeInTheDocument();
    expect(screen.getByText(/Campos de Detalhes/i)).toBeInTheDocument();
    expect(screen.getByText(/Badges de Status/i)).toBeInTheDocument();
  });

  it('should show validation limits', () => {
    render(
      <TinderCardConfigModal 
        open={true} 
        onOpenChange={mockOnOpenChange} 
      />
    );
    
    // Check validation messages
    expect(screen.getByText(/mín: 1, máx: 2/i)).toBeInTheDocument();
    expect(screen.getByText(/máx: 6/i)).toBeInTheDocument();
    expect(screen.getByText(/máx: 5/i)).toBeInTheDocument();
  });

  it('should have reset button', () => {
    render(
      <TinderCardConfigModal 
        open={true} 
        onOpenChange={mockOnOpenChange} 
      />
    );
    
    const resetButton = screen.getByText(/Restaurar Padrão/i);
    expect(resetButton).toBeInTheDocument();
  });

  it('should have save and close button', () => {
    render(
      <TinderCardConfigModal 
        open={true} 
        onOpenChange={mockOnOpenChange} 
      />
    );
    
    const saveButton = screen.getByText(/Salvar e Fechar/i);
    expect(saveButton).toBeInTheDocument();
  });

  it('should close modal when save button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <TinderCardConfigModal 
        open={true} 
        onOpenChange={mockOnOpenChange} 
      />
    );
    
    const saveButton = screen.getByText(/Salvar e Fechar/i);
    await user.click(saveButton);
    
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});
