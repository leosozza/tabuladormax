import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadBatchSelector } from "@/components/discador/LeadBatchSelector";

export default function DiscadorEnviarLeads() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Enviar Leads para Campanha</h1>
        <p className="text-muted-foreground">Selecione os leads e a campanha de destino</p>
      </div>

      <LeadBatchSelector />
    </div>
  );
}
