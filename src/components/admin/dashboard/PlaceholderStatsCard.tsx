/**
 * Placeholder Statistics Card
 * Empty card to be defined later
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpCircle } from 'lucide-react';

export function PlaceholderStatsCard() {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-muted/30 rounded-bl-full opacity-50" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          A Definir
        </CardTitle>
        <div className="p-2 rounded-full bg-muted/30">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-center h-[88px]">
        <p className="text-sm text-muted-foreground italic">
          Painel em branco
        </p>
      </CardContent>
    </Card>
  );
}
