import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StreetViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  lat: number;
  lng: number;
}

export function StreetViewModal({ isOpen, onClose, lat, lng }: StreetViewModalProps) {
  const embedUrl = `https://maps.google.com/maps?q=${lat},${lng}&z=18&layer=c&cbll=${lat},${lng}&cbp=11,0,0,0,0&output=embed`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] h-[80vh] p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>Street View</DialogTitle>
        </DialogHeader>
        <div className="flex-1 p-4 pt-2">
          <iframe
            src={embedUrl}
            className="w-full h-full rounded-lg border-0"
            style={{ minHeight: "calc(80vh - 80px)" }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
