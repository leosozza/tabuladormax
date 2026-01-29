
# Plano: Integração Click-to-Call com MicroSIP

## Resumo

Adicionar botão "Ligar" no header da Central de Atendimento que, ao ser clicado, abre o MicroSIP (ou outro softphone SIP instalado) com o número do contato já preenchido, utilizando o protocolo `sip:` URI.

## Como Funciona

O protocolo `sip:` funciona de forma similar ao `mailto:` - quando o navegador encontra um link como `sip:5511999999999@sip.falefacil.com.br`, ele abre o aplicativo de telefone SIP padrão registrado no sistema operacional (no caso, o MicroSIP).

```text
+------------------+     sip: URI      +------------------+
|  Central de      |------------------>|  MicroSIP        |
|  Atendimento     |                   |  (Softphone)     |
|  (Browser)       |                   |                  |
+------------------+                   +------------------+
                                              |
                                              | SIP Protocol
                                              v
                                       +------------------+
                                       |  Fale Fácil      |
                                       |  SIP PBX         |
                                       +------------------+
```

## Implementação

### Arquivo: `src/components/whatsapp/WhatsAppHeader.tsx`

Adicionar botão "Ligar" ao lado dos outros botões de ação:

```typescript
// Nova função para iniciar chamada
const handleClickToCall = () => {
  if (!phoneNumber) return;
  
  // Formatar número (remover caracteres especiais, manter apenas dígitos)
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  
  // Domínio SIP da Fale Fácil
  const sipDomain = 'sip.falefacilvoip.com.br';
  
  // Construir URI SIP
  const sipUri = `sip:${cleanNumber}@${sipDomain}`;
  
  // Abrir no softphone
  window.location.href = sipUri;
  
  toast.info('Iniciando chamada no MicroSIP...');
};
```

**Posição do botão**: Entre as informações do contato e os botões de ação (antes do "Encerrar").

**Estilo**: Botão verde com ícone de telefone para destacar a ação de ligação.

### Alterações no Código

| Local | Alteração |
|-------|-----------|
| Linha 4 | Adicionar import `PhoneCall` do lucide-react |
| Linha 63 | Adicionar função `handleClickToCall` |
| Linha 104-106 | Inserir novo botão após `rightContent` |

### Visual do Botão

```tsx
<Button
  variant="default"
  size="sm"
  onClick={handleClickToCall}
  className="gap-1.5 text-xs bg-green-600 hover:bg-green-700"
  title="Ligar via MicroSIP"
>
  <PhoneCall className="w-3.5 h-3.5" />
  Ligar
</Button>
```

## Requisitos

1. **MicroSIP instalado** no computador do operador
2. **MicroSIP configurado** como aplicativo padrão para links `sip:`
3. **Conta SIP configurada** no MicroSIP (já feito conforme screenshot)

## Configuração no MicroSIP

O operador precisa garantir que:
1. MicroSIP está registrado como handler de URIs `sip:`
2. A conta SIP da Fale Fácil está configurada e conectada
3. Headset/microfone funcionando

## Notas Técnicas

- O domínio SIP `sip.falefacilvoip.com.br` será usado como padrão
- Se necessário, futuramente pode-se adicionar configuração por operador para domínios diferentes
- Funciona em Windows, Mac e Linux (desde que tenha softphone SIP instalado)
