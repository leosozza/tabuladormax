/**
 * Tests for QueryBuilder component
 * Verifies UI interactions and widget configuration
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryBuilder } from '@/components/dashboard/QueryBuilder';
import type { DashboardWidget } from '@/types/dashboard';

describe('QueryBuilder', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  it('should render all tabs', () => {
    render(
      <QueryBuilder onSave={mockOnSave} onCancel={mockOnCancel} />
    );

    expect(screen.getByText('Básico')).toBeInTheDocument();
    expect(screen.getByText('Dados')).toBeInTheDocument();
    expect(screen.getByText('Filtros')).toBeInTheDocument();
    expect(screen.getByText('Avançado')).toBeInTheDocument();
  });

  it('should show title input in basic tab', () => {
    render(
      <QueryBuilder onSave={mockOnSave} onCancel={mockOnCancel} />
    );

    const titleInput = screen.getByPlaceholderText('Ex: Leads por Scouter');
    expect(titleInput).toBeInTheDocument();
  });

  it('should call onCancel when cancel button is clicked', () => {
    render(
      <QueryBuilder onSave={mockOnSave} onCancel={mockOnCancel} />
    );

    const cancelButton = screen.getByText('Cancelar');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('should populate form with initial widget data', () => {
    const initialWidget: DashboardWidget = {
      id: 'test-widget',
      title: 'Test Widget',
      subtitle: 'Test Subtitle',
      dimension: 'scouter',
      metrics: ['count_distinct_id'],
      chartType: 'bar',
    };

    render(
      <QueryBuilder
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        initialWidget={initialWidget}
      />
    );

    const titleInput = screen.getByPlaceholderText('Ex: Leads por Scouter') as HTMLInputElement;
    expect(titleInput.value).toBe('Test Widget');
  });

  it('should show "Editar Widget" title when editing', () => {
    const initialWidget: DashboardWidget = {
      id: 'test-widget',
      title: 'Test Widget',
      dimension: 'scouter',
      metrics: ['count_distinct_id'],
      chartType: 'bar',
    };

    render(
      <QueryBuilder
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        initialWidget={initialWidget}
      />
    );

    expect(screen.getByText('Editar Widget')).toBeInTheDocument();
  });

  it('should show "Novo Widget" title when creating', () => {
    render(
      <QueryBuilder onSave={mockOnSave} onCancel={mockOnCancel} />
    );

    expect(screen.getByText('Novo Widget')).toBeInTheDocument();
  });

  it('should disable save button when title is empty', () => {
    render(
      <QueryBuilder onSave={mockOnSave} onCancel={mockOnCancel} />
    );

    const saveButton = screen.getByText(/criar/i);
    
    // Initially disabled because title is empty
    expect(saveButton).toBeDisabled();
  });
});
