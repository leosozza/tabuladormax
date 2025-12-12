import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, ChevronLeft, ChevronRight, X } from 'lucide-react';
import noPhotoPlaceholder from '@/assets/no-photo-placeholder.png';
import { getLeadPhotoUrl } from '@/lib/leadPhotoUtils';

interface LeadPhotoGalleryProps {
  photoUrl: string | null | undefined;
  additionalPhotos: unknown;
  fallbackPhoto?: string | null;
  altText?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Extract all photos from lead data
 */
const getAllPhotos = (
  photoUrl: string | null | undefined,
  additionalPhotos: unknown,
  fallbackPhoto?: string | null
): string[] => {
  const photos: string[] = [];

  // Add main photo
  if (photoUrl) {
    const mainPhoto = getLeadPhotoUrl(photoUrl);
    if (mainPhoto && !mainPhoto.includes('no-photo-placeholder')) {
      photos.push(mainPhoto);
    }
  }

  // Add additional photos
  if (additionalPhotos) {
    try {
      let additionalArray: string[] = [];

      if (typeof additionalPhotos === 'string') {
        const parsed = JSON.parse(additionalPhotos);
        if (Array.isArray(parsed)) {
          additionalArray = parsed.filter(p => typeof p === 'string');
        }
      } else if (Array.isArray(additionalPhotos)) {
        additionalArray = additionalPhotos.filter(p => typeof p === 'string');
      }

      additionalArray.forEach(photo => {
        if (photo && !photos.includes(photo)) {
          photos.push(photo);
        }
      });
    } catch {
      // Ignore parsing errors
    }
  }

  // If no photos found, try fallback
  if (photos.length === 0 && fallbackPhoto) {
    const fallback = getLeadPhotoUrl(fallbackPhoto);
    if (fallback && !fallback.includes('no-photo-placeholder')) {
      photos.push(fallback);
    }
  }

  return photos;
};

const sizeClasses = {
  sm: 'w-24 h-24 md:w-28 md:h-28',
  md: 'w-32 h-32 md:w-40 md:h-40',
  lg: 'w-40 h-40 md:w-48 md:h-48',
};

export const LeadPhotoGallery = ({
  photoUrl,
  additionalPhotos,
  fallbackPhoto,
  altText = 'Foto do Lead',
  className = '',
  size = 'md',
}: LeadPhotoGalleryProps) => {
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const allPhotos = getAllPhotos(photoUrl, additionalPhotos, fallbackPhoto);
  const mainPhotoUrl = allPhotos.length > 0 ? allPhotos[0] : noPhotoPlaceholder;
  const hasMultiplePhotos = allPhotos.length > 1;

  return (
    <>
      {/* Main Photo with click to expand */}
      <div className={`relative ${className}`}>
        <div
          className={`relative cursor-pointer group ${sizeClasses[size]}`}
          onClick={() => {
            if (allPhotos.length > 0) {
              setActivePhotoIndex(0);
              setPhotoModalOpen(true);
            }
          }}
        >
          <img
            src={mainPhotoUrl}
            alt={altText}
            className={`${sizeClasses[size]} rounded-lg border-4 border-green-500 shadow-lg object-cover`}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src !== noPhotoPlaceholder) {
                target.src = noPhotoPlaceholder;
              }
            }}
          />
          
          {/* Photo count badge */}
          {hasMultiplePhotos && (
            <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-6 w-6 flex items-center justify-center font-medium shadow-lg">
              {allPhotos.length}
            </div>
          )}
          
          {/* Hover overlay */}
          {allPhotos.length > 0 && (
            <div className="absolute inset-0 bg-black/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="h-6 w-6 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Thumbnail Gallery (if multiple photos) */}
      {hasMultiplePhotos && (
        <div className="w-full mt-3">
          <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
            <Camera className="h-3 w-3" />
            Fotos ({allPhotos.length})
          </h4>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {allPhotos.map((photo, index) => (
              <div
                key={index}
                className="flex-shrink-0 w-14 h-14 rounded-md overflow-hidden cursor-pointer border-2 border-transparent hover:border-primary transition-colors"
                onClick={() => {
                  setActivePhotoIndex(index);
                  setPhotoModalOpen(true);
                }}
              >
                <img
                  src={photo}
                  alt={`Foto ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen Modal */}
      <Dialog open={photoModalOpen} onOpenChange={setPhotoModalOpen}>
        <DialogContent className="max-w-4xl w-full p-0 bg-black/95 border-none">
          <div className="relative w-full h-[80vh] flex items-center justify-center">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
              onClick={() => setPhotoModalOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Navigation buttons */}
            {hasMultiplePhotos && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 z-10 text-white hover:bg-white/20"
                  onClick={() =>
                    setActivePhotoIndex((prev) =>
                      prev === 0 ? allPhotos.length - 1 : prev - 1
                    )
                  }
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 z-10 text-white hover:bg-white/20"
                  onClick={() =>
                    setActivePhotoIndex((prev) =>
                      prev === allPhotos.length - 1 ? 0 : prev + 1
                    )
                  }
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}

            {/* Image */}
            {allPhotos[activePhotoIndex] && (
              <img
                src={allPhotos[activePhotoIndex]}
                alt={`Foto ${activePhotoIndex + 1}`}
                className="max-w-full max-h-full object-contain"
              />
            )}

            {/* Counter */}
            {hasMultiplePhotos && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                {activePhotoIndex + 1} / {allPhotos.length}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
