import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, TrendingUp, DollarSign, MapPin, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import GestaoSidebar from "@/components/gestao/Sidebar";
import StatsComparison from "@/components/gestao/dashboard/StatsComparison";
import LeadsChart from "@/components/gestao/dashboard/LeadsChart";
import ConversionFunnel from "@/components/gestao/dashboard/ConversionFunnel";
import ScouterPerformance from "@/components/gestao/dashboard/ScouterPerformance";
import StatusDistribution from "@/components/gestao/dashboard/StatusDistribution";

export default function GestaoHome() {
  return (
    <div className="flex min-h-screen bg-background">
      <GestaoSidebar />
      
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do sistema de gestão de leads</p>
        </div>

        <StatsComparison />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <LeadsChart />
          <ConversionFunnel />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <ScouterPerformance />
          <StatusDistribution />
        </div>
      </div>
    </div>
  );
}
