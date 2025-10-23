import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";

export const columns = (): ColumnDef<any>[] => [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "criado_em",
    header: "Criado em",
    cell: ({ row }) => {
      const date = new Date(row.getValue("criado_em"));
      return (
        <div className="text-sm">
          {date.toLocaleDateString('pt-BR')} às {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      );
    },
  },
  {
    accessorKey: "scouter",
    header: "Scouter",
  },
  {
    accessorKey: "projeto",
    header: "Projetos Comerciais",
  },
];