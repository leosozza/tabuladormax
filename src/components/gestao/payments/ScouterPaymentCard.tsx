import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatters";
import { User, CheckCircle2, Clock } from "lucide-react";

interface ScouterPaymentCardProps {
  scouter: string;
  totalLeads: number;
  totalPaid: number;
  totalPending: number;
  totalValue: number;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
}

export function ScouterPaymentCard({
  scouter,
  totalLeads,
  totalPaid,
  totalPending,
  totalValue,
  isSelected,
  onSelect,
}: ScouterPaymentCardProps) {
  const percentPaid = totalLeads > 0 ? (totalPaid / totalLeads) * 100 : 0;

  return (
    <Card className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            className="mt-1"
          />
          
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{scouter}</span>
              </div>
              <Badge variant={percentPaid === 100 ? "default" : "secondary"}>
                {percentPaid.toFixed(0)}% Pago
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Leads</p>
                <p className="font-semibold text-lg">{totalLeads}</p>
              </div>
              
              <div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  <span>Pagos</span>
                </div>
                <p className="font-semibold text-lg text-green-600">{totalPaid}</p>
              </div>
              
              <div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3 text-orange-500" />
                  <span>Pendentes</span>
                </div>
                <p className="font-semibold text-lg text-orange-600">{totalPending}</p>
              </div>
            </div>

            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">Valor Total</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(totalValue)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
