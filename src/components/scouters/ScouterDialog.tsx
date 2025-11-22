import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Loader2 } from "lucide-react";

const scouterSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  photo_url: z.string().optional(),
  status: z.enum(["ativo", "inativo", "standby", "blacklist"]),
  notes: z.string().optional(),
});

type ScouterFormData = z.infer<typeof scouterSchema>;

interface Scouter {
  id: string;
  name: string;
  photo_url?: string;
  whatsapp?: string;
  phone?: string;
  email?: string;
  status: string;
  notes?: string;
}

interface ScouterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scouter?: Scouter;
  onSave: (data: ScouterFormData) => Promise<void>;
}

export function ScouterDialog({ open, onOpenChange, scouter, onSave }: ScouterDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!scouter;

  const form = useForm<ScouterFormData>({
    resolver: zodResolver(scouterSchema),
    defaultValues: {
      name: "",
      phone: "",
      whatsapp: "",
      email: "",
      photo_url: "",
      status: "ativo",
      notes: "",
    },
  });

  useEffect(() => {
    if (scouter) {
      form.reset({
        name: scouter.name,
        phone: scouter.phone || "",
        whatsapp: scouter.whatsapp || "",
        email: scouter.email || "",
        photo_url: scouter.photo_url || "",
        status: scouter.status as any,
        notes: scouter.notes || "",
      });
    } else {
      form.reset({
        name: "",
        phone: "",
        whatsapp: "",
        email: "",
        photo_url: "",
        status: "ativo",
        notes: "",
      });
    }
  }, [scouter, form]);

  const handleSubmit = async (data: ScouterFormData) => {
    setIsSubmitting(true);
    try {
      await onSave(data);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Scouter" : "Cadastrar Novo Scouter"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações do scouter"
              : "Preencha os dados para cadastrar um novo scouter"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Photo Preview */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={form.watch("photo_url")} alt="Preview" />
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {form.watch("name") ? getInitials(form.watch("name")) : "SC"}
                </AvatarFallback>
              </Avatar>
              <FormField
                control={form.control}
                name="photo_url"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>URL da Foto</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          placeholder="https://exemplo.com/foto.jpg"
                          {...field}
                        />
                      </FormControl>
                      <Button type="button" variant="outline" size="icon">
                        <Upload className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Nome */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nome Completo *</FormLabel>
                    <FormControl>
                      <Input placeholder="João da Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* WhatsApp */}
              <FormField
                control={form.control}
                name="whatsapp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp</FormLabel>
                    <FormControl>
                      <Input placeholder="(11) 99999-9999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Telefone */}
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(11) 3333-3333" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="joao@exemplo.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ativo">Scouter Ativo</SelectItem>
                        <SelectItem value="inativo">Scouter Inativo</SelectItem>
                        <SelectItem value="standby">Scouter Standby</SelectItem>
                        <SelectItem value="blacklist">Black-list</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Observações */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Informações adicionais sobre o scouter..."
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Salvar Alterações" : "Cadastrar Scouter"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
