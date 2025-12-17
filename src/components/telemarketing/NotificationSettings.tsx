import { Bell, Volume2, VolumeX, BellOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  useNotificationSettings, 
  useBrowserNotification,
  useNotificationSound 
} from '@/hooks/useTelemarketingNotifications';
import { Settings } from 'lucide-react';
import { NotificationBlockedHelp } from './NotificationBlockedHelp';
import { useState } from 'react';

export const NotificationSettings = () => {
  const { settings, updateSettings } = useNotificationSettings();
  const { permission, requestPermission } = useBrowserNotification();
  const { playSound } = useNotificationSound();
  const [isChecking, setIsChecking] = useState(false);

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    if (granted) {
      updateSettings({ push_enabled: true });
    }
  };

  const handleTestSound = () => {
    playSound('new_message');
  };

  const handleCheckPermission = async () => {
    setIsChecking(true);
    // Force a permission check by requesting again
    const granted = await requestPermission();
    if (granted) {
      updateSettings({ push_enabled: true });
    }
    setIsChecking(false);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Configurações de Notificação
          </DialogTitle>
          <DialogDescription>
            Configure como deseja receber alertas de novas mensagens
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Som */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {settings.sound_enabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
                <Label htmlFor="sound">Som de notificação</Label>
              </div>
              <Switch
                id="sound"
                checked={settings.sound_enabled}
                onCheckedChange={(checked) => updateSettings({ sound_enabled: checked })}
              />
            </div>

            {settings.sound_enabled && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-muted-foreground">Volume</Label>
                  <span className="text-sm text-muted-foreground">{settings.sound_volume}%</span>
                </div>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[settings.sound_volume]}
                    onValueChange={([value]) => updateSettings({ sound_volume: value })}
                    max={100}
                    step={10}
                    className="flex-1"
                  />
                  <Button variant="outline" size="sm" onClick={handleTestSound}>
                    Testar
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Push Notifications */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {permission === 'denied' ? (
                  <BellOff className="h-4 w-4 text-destructive" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
                <Label htmlFor="push">Notificações do navegador</Label>
              </div>
              <Switch
                id="push"
                checked={settings.push_enabled && permission === 'granted'}
                onCheckedChange={(checked) => {
                  if (checked && permission !== 'granted') {
                    handleRequestPermission();
                  } else {
                    updateSettings({ push_enabled: checked });
                  }
                }}
                disabled={permission === 'denied'}
              />
            </div>

            {permission === 'denied' && (
              <div className="space-y-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-xs text-destructive font-medium">
                  ⚠️ Notificações bloqueadas pelo navegador
                </p>
                <div className="flex flex-wrap gap-2">
                  <NotificationBlockedHelp />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleCheckPermission}
                    disabled={isChecking}
                    className="gap-1.5"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                    Verificar agora
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Sons e alertas no app continuam funcionando normalmente.
                </p>
              </div>
            )}

            {permission === 'default' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRequestPermission}
                className="w-full"
              >
                Permitir notificações
              </Button>
            )}
          </div>

          {/* Preview */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="preview">Mostrar preview da mensagem</Label>
              <p className="text-xs text-muted-foreground">
                Exibe o conteúdo da mensagem na notificação
              </p>
            </div>
            <Switch
              id="preview"
              checked={settings.show_preview}
              onCheckedChange={(checked) => updateSettings({ show_preview: checked })}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};