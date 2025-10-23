import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createLead } from '@/repositories/leadsRepo'
import type { Lead } from '@/repositories/types'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface CreateLeadDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateLeadDialog({ open, onClose, onSuccess }: CreateLeadDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<Lead>>({
    nome: '',
    telefone: '',
    email: '',
    idade: '',
    projetos: 'Projeto Teste',
    scouter: 'Sistema',
    etapa: 'Contato',
    modelo: '',
    localizacao: '',
  })

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nome || !formData.telefone) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    setLoading(true)
    try {
      await createLead(formData)
      toast.success('Lead criado com sucesso!')
      setFormData({
        nome: '',
        telefone: '',
        email: '',
        idade: '',
        projetos: 'Projeto Teste',
        scouter: 'Sistema',
        etapa: 'Contato',
        modelo: '',
        localizacao: '',
      })
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Erro ao criar lead:', error)
      toast.error('Erro ao criar lead. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Lead</DialogTitle>
          <DialogDescription>
            Preencha as informações do lead para adicioná-lo ao sistema
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">
                Nome <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => handleChange('nome', e.target.value)}
                placeholder="Nome completo"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="telefone">
                Telefone <span className="text-red-500">*</span>
              </Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => handleChange('telefone', e.target.value)}
                placeholder="(11) 99999-9999"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="idade">Idade</Label>
                <Input
                  id="idade"
                  value={formData.idade}
                  onChange={(e) => handleChange('idade', e.target.value)}
                  placeholder="25"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="modelo">Modelo</Label>
                <Input
                  id="modelo"
                  value={formData.modelo}
                  onChange={(e) => handleChange('modelo', e.target.value)}
                  placeholder="Ex: Fashion"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="projeto">Projeto</Label>
                <Select
                  value={formData.projetos}
                  onValueChange={(value) => handleChange('projetos', value)}
                >
                  <SelectTrigger id="projeto">
                    <SelectValue placeholder="Selecione o projeto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Projeto Teste">Projeto Teste</SelectItem>
                    <SelectItem value="Projeto A">Projeto A</SelectItem>
                    <SelectItem value="Projeto B">Projeto B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="etapa">Status</Label>
                <Select
                  value={formData.etapa}
                  onValueChange={(value) => handleChange('etapa', value)}
                >
                  <SelectTrigger id="etapa">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Contato">Contato</SelectItem>
                    <SelectItem value="Agendado">Agendado</SelectItem>
                    <SelectItem value="Convertido">Convertido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="localizacao">Localização</Label>
              <Input
                id="localizacao"
                value={formData.localizacao}
                onChange={(e) => handleChange('localizacao', e.target.value)}
                placeholder="São Paulo, SP"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Lead'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
