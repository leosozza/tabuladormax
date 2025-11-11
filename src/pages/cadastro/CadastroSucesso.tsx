import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CheckCircle2, Instagram } from 'lucide-react';

export default function CadastroSucesso() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <Card className="max-w-md w-full shadow-lg">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Parabéns!</h1>
            <p className="text-lg">Seu cadastro foi atualizado com sucesso</p>
          </div>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-muted-foreground">
            Agora só aguardar o atendimento com o produtor
          </p>
          
          <Button 
            className="w-full gap-2" 
            size="lg"
            onClick={() => window.open('https://instagram.com/maxfama_oficial', '_blank', 'noopener,noreferrer')}
          >
            <Instagram className="w-5 h-5" />
            Seguir @maxfama_oficial no Instagram
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
