import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { User, MapPin, Calendar, Phone } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  const mockLeads = [
    {
      id: 123,
      name: 'Maria Silva',
      age: '35 anos',
      address: 'Rua das Flores, 123 - Centro',
      lastContact: '15/03/2024'
    },
    {
      id: 456,
      name: 'João Santos',
      age: '42 anos',
      address: 'Av. Principal, 456 - Jardim',
      lastContact: '14/03/2024'
    },
    {
      id: 789,
      name: 'Ana Costa',
      age: '28 anos',
      address: 'Rua do Comércio, 789 - Centro',
      lastContact: '13/03/2024'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-6">
        <h1 className="text-3xl font-bold text-foreground">Tabulador Telemarketing</h1>
        <p className="text-muted-foreground mt-1">Gerencie seus leads com eficiência</p>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 bg-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Leads Ativos</p>
                <p className="text-4xl font-bold text-foreground">24</p>
              </div>
              <div className="bg-muted/50 p-4 rounded-full">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Agendamentos</p>
                <p className="text-4xl font-bold text-foreground">12</p>
              </div>
              <div className="bg-muted/50 p-4 rounded-full">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Contatos Hoje</p>
                <p className="text-4xl font-bold text-foreground">8</p>
              </div>
              <div className="bg-muted/50 p-4 rounded-full">
                <Phone className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
          </Card>
        </div>

        {/* Leads List */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-6">Leads para Tabular</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {mockLeads.map((lead) => (
              <Card key={lead.id} className="p-6 bg-card">
                <div className="flex items-start gap-4 mb-4">
                  <div className="bg-muted/50 p-3 rounded-full">
                    <User className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-foreground">{lead.name}</h3>
                    <p className="text-sm text-muted-foreground">{lead.age}</p>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{lead.address}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Último contato: {lead.lastContact}
                  </p>
                </div>

                <Button
                  onClick={() => navigate(`/lead/${lead.id}`)}
                  className="w-full bg-success hover:bg-success/90 text-success-foreground"
                >
                  Abrir Tabulação
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
