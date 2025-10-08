import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Edit, HelpCircle, Loader2, X, Settings, Plus, Minus } from "lucide-react";
import UserMenu from "@/components/UserMenu";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useHotkeys } from "@/hooks/useHotkeys";
import { saveChatwootContact, type ChatwootEventData } from "@/lib/chatwoot";
import {
  BUTTON_CATEGORIES,
  categoryOrder,
  ensureButtonLayout,
  type ButtonCategory,
  type ButtonLayout,
} from "@/lib/button-layout";

type DynamicProfile = Record<string, any>;

interface SubButton {
  subLabel: string;
  subWebhook: string;
  subField: string;
  subValue: string;
  subHotkey?: string;
}

interface ButtonConfig {
  id: string;
  label: string;
  color: string;
  webhook_url: string;
  field: string;
  value?: string;
  field_type: string;
  action_type: string;
  hotkey?: string;
  sort: number;
  pos: any;
  sub_buttons: any;
  category?: string | null;
}

interface FieldMapping {
  id?: string;
  profile_field: string;
  chatwoot_field: string;
  display_name?: string;
  is_profile_photo?: boolean;
}

const emptyProfile: DynamicProfile = {};

const LeadTab = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<DynamicProfile>(emptyProfile);
  const [buttons, setButtons] = useState<ButtonConfig[]>([]);
  const [chatwootData, setChatwootData] = useState<any>(null);
  const [loadingButtons, setLoadingButtons] = useState(false);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [buttonColumns, setButtonColumns] = useState(3);

  // 🧩 Carrega campos e botões iniciais
  useEffect(() => {
    loadButtons();
    loadFieldMappings();
  }, []);

  const loadFieldMappings = async () => {
    const { data, error } = await supabase.from("profile_field_mapping").select("*");
    if (error) {
      toast.error("Erro ao carregar campos");
      return;
    }
    setFieldMappings(data || []);
  };

  const loadButtons = async () => {
    setLoadingButtons(true);
    const { data, error } = await supabase.from("button_config").select("*").order("sort", { ascending: true });
    if (error) {
      toast.error("Erro ao carregar botões");
      setLoadingButtons(false);
      return;
    }
    setButtons(data || []);
    setLoadingButtons(false);
  };

  // 🎧 Listener do Chatwoot
  useEffect(() => {
    console.log("🎧 Listener de mensagens do Chatwoot ativado na página LeadTab");

    const handleChatwootMessage = async (event: MessageEvent) => {
      try {
        // 🔍 Expor evento cru no console global
        (window as any).lastEventData = event.data;

        let raw = event.data;

        if (typeof raw === "string") {
          try {
            raw = JSON.parse(raw);
          } catch {
            return;
          }
        }

        const sender = raw?.conversation?.meta?.sender || raw?.data?.contact;
        const attrs = sender?.custom_attributes || {};
        if (!sender) return;

        console.log("✅ Dados do Chatwoot recebidos:", sender);

        // 🧠 Cria perfil dinâmico
        const newProfile: DynamicProfile = {};
        fieldMappings.forEach((mapping) => {
          const parts = mapping.chatwoot_field.split(".");
          let value: any = sender;
          for (const part of parts) {
            value = value?.[part];
            if (!value) break;
          }
          newProfile[mapping.profile_field] = value || "";
        });
        setProfile(newProfile);

        if (attrs.idbitrix) {
          const contactData = {
            bitrix_id: String(attrs.idbitrix),
            conversation_id: raw?.conversation?.id || raw?.data?.conversation?.id || 0,
            contact_id: sender.id,
            name: sender.name,
            phone_number: sender.phone_number,
            email: sender.email,
            thumbnail: sender.thumbnail || attrs.foto,
            custom_attributes: attrs,
            additional_attributes: sender.additional_attributes || {},
          };

          setChatwootData(contactData);

          // ✅ Expor também no escopo global do navegador
          (window as any).chatwootData = contactData;

          await saveChatwootContact(contactData);
          toast.success("Lead atualizado do Chatwoot!");
        }
      } catch (err) {
        console.error("❌ Erro ao processar evento do Chatwoot:", err);
      }
    };

    window.addEventListener("message", handleChatwootMessage);
    // 📤 Avisar Chatwoot que o app está pronto
    window.parent.postMessage({ ready: true }, "*");

    return () => {
      console.log("🔌 Listener de mensagens removido");
      window.removeEventListener("message", handleChatwootMessage);
    };
  }, [fieldMappings]);

  // 🧩 Atualiza cache no Supabase
  const updateCache = async () => {
    if (!chatwootData) {
      toast.error("Nenhum dado do Chatwoot disponível");
      return;
    }
    setSavingProfile(true);
    try {
      const updatedAttributes = { ...chatwootData.custom_attributes };
      fieldMappings.forEach((mapping) => {
        const value = profile[mapping.profile_field];
        if (mapping.chatwoot_field.startsWith("contact.custom_attributes.")) {
          const attrKey = mapping.chatwoot_field.replace("contact.custom_attributes.", "");
          updatedAttributes[attrKey] = value;
        }
      });
      await saveChatwootContact({ ...chatwootData, custom_attributes: updatedAttributes });
      toast.success("Perfil salvo!");
    } catch (e) {
      toast.error("Erro ao salvar perfil");
    } finally {
      setSavingProfile(false);
    }
  };

  const getProfilePhotoUrl = () => {
    const photoField = fieldMappings.find((f) => f.is_profile_photo);
    return profile[photoField?.profile_field || ""] || chatwootData?.thumbnail || "/placeholder.svg";
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        <Card className="p-6 flex flex-col items-center gap-4">
          <h2 className="text-xl font-bold mb-4">Perfil do Lead (Chatwoot)</h2>

          <img
            src={getProfilePhotoUrl()}
            alt={chatwootData?.name || "Lead"}
            className="rounded-full w-32 h-32 border-4 border-green-500 shadow-lg object-cover"
          />
          <h3 className="text-lg font-semibold mt-2">{chatwootData?.name || "Aguardando dados..."}</h3>

          <div className="w-full space-y-2 text-sm mt-4">
            {fieldMappings.map((mapping) => (
              <p key={mapping.profile_field}>
                <strong>{mapping.display_name || mapping.profile_field}:</strong>{" "}
                {profile[mapping.profile_field] || "—"}
              </p>
            ))}
          </div>

          <Button onClick={updateCache} disabled={savingProfile} className="mt-4">
            {savingProfile ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Salvando...
              </>
            ) : (
              "💾 Atualizar Cache"
            )}
          </Button>

          <div className="text-xs text-gray-400 mt-4 text-center">
            🔍 Dica: digite <code>chatwootData</code> ou <code>lastEventData</code> no console do navegador
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LeadTab;
