import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface NegotiationDocument {
  id: string;
  negotiation_id: string;
  document_type: 'identity' | 'payment_receipt' | 'contract' | 'address_proof' | 'other';
  file_name: string;
  file_path: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  description?: string;
  payment_method_id?: string;
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
}

export const useNegotiationDocuments = (negotiationId: string | undefined) => {
  const queryClient = useQueryClient();

  const { data: documents, isLoading } = useQuery({
    queryKey: ['negotiation-documents', negotiationId],
    queryFn: async () => {
      if (!negotiationId) return [];
      
      const { data, error } = await supabase
        .from('negotiation_documents')
        .select('*')
        .eq('negotiation_id', negotiationId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as NegotiationDocument[];
    },
    enabled: !!negotiationId,
  });

  const uploadDocument = useMutation({
    mutationFn: async ({
      file,
      documentType,
      description,
      paymentMethodId,
    }: {
      file: File | Blob;
      documentType: NegotiationDocument['document_type'];
      description?: string;
      paymentMethodId?: string;
    }) => {
      if (!negotiationId) throw new Error('Negotiation ID is required');

      const fileExt = file instanceof File ? file.name.split('.').pop() : 'jpg';
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${negotiationId}/${documentType}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('negotiation-documents')
        .upload(filePath, file, {
          contentType: file.type || 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('negotiation-documents')
        .getPublicUrl(filePath);

      // Save to database
      const { data, error } = await supabase
        .from('negotiation_documents')
        .insert({
          negotiation_id: negotiationId,
          document_type: documentType,
          file_name: file instanceof File ? file.name : fileName,
          file_path: filePath,
          file_url: urlData.publicUrl,
          file_size: file.size,
          mime_type: file.type || 'image/jpeg',
          description,
          payment_method_id: paymentMethodId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['negotiation-documents', negotiationId] });
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (documentId: string) => {
      const doc = documents?.find(d => d.id === documentId);
      if (!doc) throw new Error('Document not found');

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('negotiation-documents')
        .remove([doc.file_path]);

      if (storageError) console.warn('Storage delete error:', storageError);

      // Delete from database
      const { error } = await supabase
        .from('negotiation_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['negotiation-documents', negotiationId] });
    },
  });

  return {
    documents: documents || [],
    isLoading,
    uploadDocument,
    deleteDocument,
  };
};
