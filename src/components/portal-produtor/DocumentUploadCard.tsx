import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Camera, Plus, Eye, Trash2, FileText, Loader2 } from 'lucide-react';
import { NegotiationDocument } from '@/hooks/useNegotiationDocuments';
import { cn } from '@/lib/utils';

interface DocumentUploadCardProps {
  type: NegotiationDocument['document_type'];
  label: string;
  documents: NegotiationDocument[];
  onScan: () => void;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

const TYPE_ICONS: Record<NegotiationDocument['document_type'], typeof FileText> = {
  identity: FileText,
  payment_receipt: FileText,
  contract: FileText,
  address_proof: FileText,
  other: FileText,
};

export const DocumentUploadCard = ({
  type,
  label,
  documents,
  onScan,
  onDelete,
  isDeleting,
}: DocumentUploadCardProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const typeDocuments = documents.filter(d => d.document_type === type);
  const Icon = TYPE_ICONS[type];

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{label}</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {typeDocuments.length} arquivo{typeDocuments.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* Add new button */}
            <button
              onClick={onScan}
              className={cn(
                "aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30",
                "flex flex-col items-center justify-center gap-1",
                "hover:border-primary hover:bg-primary/5 transition-colors",
                "text-muted-foreground hover:text-primary"
              )}
            >
              <div className="flex items-center gap-1">
                <Camera className="h-4 w-4" />
                <Plus className="h-3 w-3" />
              </div>
              <span className="text-[10px]">Escanear</span>
            </button>

            {/* Document thumbnails */}
            {typeDocuments.map((doc) => (
              <div
                key={doc.id}
                className="relative aspect-square rounded-lg overflow-hidden border bg-muted group"
              >
                <img
                  src={doc.file_url}
                  alt={doc.file_name}
                  className="w-full h-full object-cover"
                />
                
                {/* Overlay with actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-white hover:bg-white/20"
                    onClick={() => setPreviewUrl(doc.file_url)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-white hover:bg-red-500/50"
                    onClick={() => onDelete(doc.id)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl p-0">
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
