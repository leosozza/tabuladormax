import { useState, useEffect } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';

interface LocationSendModalProps {
  open: boolean;
  onClose: () => void;
  onSend: (latitude: number, longitude: number, name: string, address: string) => Promise<boolean>;
  latitude: number;
  longitude: number;
  sending?: boolean;
}

export function LocationSendModal({
  open,
  onClose,
  onSend,
  latitude,
  longitude,
  sending = false
}: LocationSendModalProps) {
  const [locationName, setLocationName] = useState('');
  const [address, setAddress] = useState('');
  const [loadingAddress, setLoadingAddress] = useState(false);

  // Reverse geocoding to get address
  useEffect(() => {
    if (!open || !latitude || !longitude) return;

    const fetchAddress = async () => {
      setLoadingAddress(true);
      try {
        const { data, error } = await supabase.functions.invoke('tomtom-reverse-geocode', {
          body: { lat: latitude, lon: longitude }
        });

        if (!error && data?.address) {
          setAddress(data.address);
          // Set a default location name if we have the street
          if (data.street) {
            setLocationName(data.street);
          }
        }
      } catch (err) {
        console.error('Error fetching address:', err);
      } finally {
        setLoadingAddress(false);
      }
    };

    fetchAddress();
  }, [open, latitude, longitude]);

  const handleSend = async () => {
    const success = await onSend(latitude, longitude, locationName, address);
    if (success) {
      onClose();
      setLocationName('');
      setAddress('');
    }
  };

  const handleClose = () => {
    onClose();
    setLocationName('');
    setAddress('');
  };

  // Generate static map URL using TomTom
  const mapPreviewUrl = `https://api.tomtom.com/map/1/staticimage?layer=basic&style=main&format=png&zoom=15&center=${longitude},${latitude}&width=400&height=200&view=Unified&key=${import.meta.env.VITE_TOMTOM_API_KEY || ''}`;

  // Fallback to OpenStreetMap static image if no TomTom key
  const osmMapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=15&size=400x200&markers=${latitude},${longitude},red-pushpin`;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Enviar Localização
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Map Preview */}
          <div className="relative rounded-lg overflow-hidden bg-muted h-[200px]">
            <img 
              src={osmMapUrl} 
              alt="Localização no mapa"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://via.placeholder.com/400x200?text=Lat:${latitude.toFixed(4)}+Lon:${longitude.toFixed(4)}`;
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-primary text-primary-foreground rounded-full p-2 shadow-lg">
                <MapPin className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Coordinates display */}
          <div className="text-xs text-muted-foreground text-center">
            {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </div>

          {/* Location Name */}
          <div className="space-y-2">
            <Label htmlFor="location-name">Nome do Local (opcional)</Label>
            <Input
              id="location-name"
              placeholder="Ex: Nosso Escritório, Ponto de Encontro..."
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <div className="relative">
              <Input
                id="address"
                placeholder={loadingAddress ? 'Buscando endereço...' : 'Endereço do local'}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={loadingAddress}
                maxLength={200}
              />
              {loadingAddress && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={sending || loadingAddress}>
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 mr-2" />
                Enviar Localização
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
