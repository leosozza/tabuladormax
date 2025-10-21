import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FieldMappingDialog } from '../FieldMappingDialog';

describe('FieldMappingDialog', () => {
  it('should render the dialog when open', () => {
    const mockOnSave = vi.fn();
    const mockOnOpenChange = vi.fn();

    render(
      <FieldMappingDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Mapeamento de Campos')).toBeInTheDocument();
  });

  it('should display Gestão Scouter fields column', () => {
    const mockOnSave = vi.fn();
    const mockOnOpenChange = vi.fn();

    render(
      <FieldMappingDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Campos Gestão Scouter')).toBeInTheDocument();
  });

  it('should display Tabuladormax fields column', () => {
    const mockOnSave = vi.fn();
    const mockOnOpenChange = vi.fn();

    render(
      <FieldMappingDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Campos Tabuladormax')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    const mockOnSave = vi.fn();
    const mockOnOpenChange = vi.fn();

    render(
      <FieldMappingDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        onSave={mockOnSave}
      />
    );

    expect(screen.queryByText('Mapeamento de Campos')).not.toBeInTheDocument();
  });

  it('should show count of mapped fields', () => {
    const mockOnSave = vi.fn();
    const mockOnOpenChange = vi.fn();
    
    const initialMappings = [
      { gestaoScouterField: 'name', tabuladormaxField: 'tab_name' },
      { gestaoScouterField: 'age', tabuladormaxField: 'tab_age' },
    ];

    render(
      <FieldMappingDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSave={mockOnSave}
        initialMappings={initialMappings}
      />
    );

    expect(screen.getByText(/2 campo\(s\) mapeado\(s\)/i)).toBeInTheDocument();
  });
});
