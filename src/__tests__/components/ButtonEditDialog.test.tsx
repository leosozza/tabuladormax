import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ButtonEditDialog } from '@/components/ButtonEditDialog';
import type { ButtonLayout } from '@/lib/button-layout';

describe('ButtonEditDialog', () => {
  const mockButton = {
    id: 'test-button-1',
    label: 'Test Button',
    description: 'Test Description',
    color: '#3b82f6',
    webhook_url: 'https://example.com/webhook',
    field: 'STATUS_ID',
    value: 'QUALIFIED',
    field_type: 'string',
    action_type: 'tabular',
    hotkey: 'F1',
    sort: 1,
    layout: {
      category: 'NAO_AGENDADO',
      index: 0,
      visible: true,
    } as ButtonLayout,
    sub_buttons: [
      {
        subLabel: 'Sub Button 1',
        subDescription: 'Sub description',
        subWebhook: 'https://example.com/webhook',
        subField: 'PRIORITY',
        subValue: 'HIGH',
        subHotkey: '',
        subAdditionalFields: [],
      }
    ],
    sync_target: 'bitrix' as const,
    additional_fields: [
      { field: 'COMMENTS', value: 'Test comment' }
    ],
    transfer_conversation: false,
  };

  const mockCategories = [
    { id: '1', name: 'NAO_AGENDADO', label: 'Não Agendado', sort_order: 1 },
    { id: '2', name: 'AGENDADO', label: 'Agendado', sort_order: 2 },
  ];

  const mockBitrixFields = [
    { name: 'STATUS_ID', title: 'Status', type: 'string', items: [] },
    { name: 'PRIORITY', title: 'Prioridade', type: 'string', items: [] },
    { name: 'COMMENTS', title: 'Comentários', type: 'string', items: [] },
  ];

  const mockSupabaseFields = [
    { name: 'id', title: 'ID', type: 'bigint' },
    { name: 'name', title: 'Nome', type: 'text' },
  ];

  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    button: mockButton,
    categories: mockCategories,
    bitrixFields: mockBitrixFields,
    supabaseFields: mockSupabaseFields,
    onUpdate: vi.fn(),
    onUpdateLayout: vi.fn(),
    onAddSubButton: vi.fn(),
    onRemoveSubButton: vi.fn(),
    onUpdateSubButton: vi.fn(),
    onFieldDrop: vi.fn(),
    onMoveButton: vi.fn(),
    onDelete: vi.fn(),
    onSave: vi.fn(),
    renderFieldValueControl: (fieldName: string, value: string, onChange: (value: string) => void) => (
      <input
        data-testid={`field-value-${fieldName}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    ),
    onAddAdditionalField: vi.fn(),
    onRemoveAdditionalField: vi.fn(),
    onUpdateAdditionalField: vi.fn(),
    onAddSubAdditionalField: vi.fn(),
    onRemoveSubAdditionalField: vi.fn(),
    onUpdateSubAdditionalField: vi.fn(),
  };

  it('renders the dialog when open is true', () => {
    render(<ButtonEditDialog {...defaultProps} />);
    expect(screen.getByText(/Editar Botão: Test Button/i)).toBeInTheDocument();
  });

  it('renders the "Abrir no FlowBuilder" button', () => {
    render(<ButtonEditDialog {...defaultProps} />);
    const flowBuilderButton = screen.getByRole('button', { name: /Abrir no FlowBuilder/i });
    expect(flowBuilderButton).toBeInTheDocument();
  });

  it('displays button information correctly', () => {
    render(<ButtonEditDialog {...defaultProps} />);
    const labelInput = screen.getByDisplayValue('Test Button');
    expect(labelInput).toBeInTheDocument();
    
    const descriptionInput = screen.getByDisplayValue('Test Description');
    expect(descriptionInput).toBeInTheDocument();
  });

  it('calls onUpdate when label is changed', () => {
    render(<ButtonEditDialog {...defaultProps} />);
    const labelInput = screen.getByDisplayValue('Test Button');
    
    fireEvent.change(labelInput, { target: { value: 'Updated Button' } });
    
    expect(defaultProps.onUpdate).toHaveBeenCalledWith(
      'test-button-1',
      { label: 'Updated Button' }
    );
  });

  it('calls onSave when Save button is clicked', () => {
    render(<ButtonEditDialog {...defaultProps} />);
    const saveButton = screen.getByRole('button', { name: /Salvar/i });
    
    fireEvent.click(saveButton);
    
    expect(defaultProps.onSave).toHaveBeenCalled();
  });

  it('calls onDelete when Delete button is clicked', () => {
    render(<ButtonEditDialog {...defaultProps} />);
    const deleteButton = screen.getByRole('button', { name: /Excluir/i });
    
    fireEvent.click(deleteButton);
    
    expect(defaultProps.onDelete).toHaveBeenCalledWith('test-button-1');
  });

  it('does not render when button is null', () => {
    const propsWithNullButton = { ...defaultProps, button: null };
    const { container } = render(<ButtonEditDialog {...propsWithNullButton} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders sub-buttons section when sub-buttons exist', () => {
    render(<ButtonEditDialog {...defaultProps} />);
    expect(screen.getByText(/Sub-botões/i)).toBeInTheDocument();
    // Check for sub-button header instead of label which might be inside a scrollable area
    expect(screen.getByText(/Sub-botão 1/i)).toBeInTheDocument();
  });

  it('renders additional fields section when additional fields exist', () => {
    render(<ButtonEditDialog {...defaultProps} />);
    expect(screen.getByText(/Campos Adicionais/i)).toBeInTheDocument();
  });

  it('shows transfer conversation checkbox', () => {
    render(<ButtonEditDialog {...defaultProps} />);
    const checkbox = screen.getByRole('checkbox', { name: /Transferir conversa após executar/i });
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it('updates transfer conversation when checkbox is clicked', () => {
    render(<ButtonEditDialog {...defaultProps} />);
    const checkbox = screen.getByRole('checkbox', { name: /Transferir conversa após executar/i });
    
    fireEvent.click(checkbox);
    
    expect(defaultProps.onUpdate).toHaveBeenCalledWith(
      'test-button-1',
      { transfer_conversation: true }
    );
  });
});
