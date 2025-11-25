import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadBatchSelector } from "@/components/discador/LeadBatchSelector";
import { MainLayout } from "@/components/layouts/MainLayout";

export default function DiscadorEnviarLeads() {
  return (
    <MainLayout
      title="Enviar Leads para Campanha"
      subtitle="Selecione os leads e a campanha de destino"
    >
      <LeadBatchSelector />
    </MainLayout>
  );
}
