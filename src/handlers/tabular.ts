import type { Json } from "../integrations/supabase/types";

export interface SupabaseClientLike {
  from<T>(table: string): {
    insert(values: any, options?: any): Promise<{ data: T[] | null; error: Error | null }>;
    upsert?(values: any, options?: any): Promise<{ data: T[] | null; error: Error | null }>;
    update?(values: any, options?: any): any;
  };
  functions: {
    invoke<T = any>(name: string, args: {
      body?: any;
      headers?: Record<string, string>;
      method?: string;
    }): Promise<{ data: T | null; error: Error | null }>;
  };
}

export interface RunTabularParams {
  actionLabel: string;
  webhookUrl?: string | null;
  field: string;
  value: any;
  syncTarget?: "bitrix" | "supabase";
  additionalFields?: Record<string, any>;
  selectedValueDisplay?: string;
  chatwootData?: Record<string, any> | null;
  bitrixFields?: Array<Record<string, any>>;
  metadata?: Record<string, any>;
}

export interface RunTabularOptions {
  leadId: number;
  userId: string | null;
  params: RunTabularParams;
  supabaseClient: SupabaseClientLike;
}

export interface RunTabularResult {
  status: "success" | "error";
  message: string;
  bitrixResponse?: any;
  payload?: Record<string, any>;
}

function buildLogPayload(options: RunTabularOptions, successPayload: Record<string, any>): Json {
  const { params } = options;
  return {
    ...successPayload,
    metadata: params.metadata || null,
  } as Json;
}

function convertEnumerationValue(bitrixFields: Array<Record<string, any>> = [], fieldName: string, value: string) {
  if (!value || !fieldName) return value;
  const fieldDef = bitrixFields.find((f) =>
    f?.ID === fieldName ||
    f?.FIELD_NAME === fieldName ||
    f?.name === fieldName
  );

  if (!fieldDef || fieldDef.type !== "enumeration" || !Array.isArray(fieldDef.items)) {
    return value;
  }

  const item = fieldDef.items.find((entry: any) => entry?.VALUE === value || entry?.ID === value);
  return item?.ID ?? value;
}

export async function runTabular(options: RunTabularOptions): Promise<RunTabularResult> {
  const { leadId, userId, params, supabaseClient } = options;
  const {
    actionLabel,
    webhookUrl,
    field,
    value,
    syncTarget = "bitrix",
    additionalFields = {},
    selectedValueDisplay,
    chatwootData,
    bitrixFields,
  } = params;

  const selectedValue =
    selectedValueDisplay ??
    (typeof value === "string" ? value : Array.isArray(value) ? value.join(", ") : JSON.stringify(value));

  const baseLogPayload = {
    field,
    value,
    additional_fields: additionalFields,
    action_type: syncTarget,
    webhook: webhookUrl,
  };

  try {
    if (syncTarget === "supabase") {
      const leadPayload: Record<string, any> = { id: leadId, [field]: value, ...additionalFields };

      if (typeof supabaseClient.from("leads").upsert === "function") {
        const { error: leadError } = await supabaseClient
          .from("leads")
          .upsert?.([leadPayload], { onConflict: "id" });
        if (leadError) {
          throw leadError;
        }
      }

      if (chatwootData) {
        const updatedContact = {
          bitrix_id: chatwootData.bitrix_id ?? String(leadId),
          conversation_id: chatwootData.conversation_id ?? null,
          contact_id: chatwootData.contact_id ?? null,
          name: chatwootData.name ?? null,
          phone_number: chatwootData.phone_number ?? null,
          email: chatwootData.email ?? null,
          thumbnail: chatwootData.thumbnail ?? null,
          custom_attributes: {
            ...(chatwootData.custom_attributes || {}),
            [field]: value,
            ...additionalFields,
          },
          additional_attributes: chatwootData.additional_attributes || {},
          last_activity_at: chatwootData.last_activity_at ?? null,
          updated_at: new Date().toISOString(),
        };

        const { error: contactError } = await supabaseClient
          .from("chatwoot_contacts")
          .upsert?.(updatedContact, { onConflict: "bitrix_id" });

        if (contactError) {
          throw contactError;
        }
      }

      if (webhookUrl) {
        const { error: syncError } = await supabaseClient.functions.invoke("sync-to-bitrix", {
          body: {
            lead: leadPayload,
            webhook: webhookUrl,
            source: "supabase",
          },
        });

        if (syncError) {
          throw syncError;
        }
      }

      await supabaseClient.from("actions_log").insert([
        {
          lead_id: leadId,
          action_label: actionLabel,
          payload: buildLogPayload(options, baseLogPayload),
          status: "OK",
          user_id: userId,
        },
      ]);

      return {
        status: "success",
        message: `Dados sincronizados para o lead ${leadId}.`,
        payload: leadPayload,
      };
    }

    if (!webhookUrl) {
      throw new Error("Webhook URL não configurada para o botão");
    }

    const processedAdditionalFields = Object.fromEntries(
      Object.entries(additionalFields).map(([key, val]) => [
        key,
        typeof val === "string" ? convertEnumerationValue(bitrixFields, key, val) : val,
      ]),
    );

    const mainValue = typeof value === "string" ? convertEnumerationValue(bitrixFields, field, value) : value;
    const allFields = {
      [field]: mainValue,
      ...processedAdditionalFields,
    };

    const paramsSearch = new URLSearchParams();
    paramsSearch.append("ID", String(leadId));

    Object.entries(allFields).forEach(([key, val]) => {
      if (Array.isArray(val)) {
        val.forEach((entry) => paramsSearch.append(`FIELDS[${key}][]`, String(entry)));
        return;
      }

      if (val && typeof val === "object") {
        Object.entries(val as Record<string, any>).forEach(([subKey, subVal]) => {
          paramsSearch.append(`FIELDS[${key}][${subKey}]`, String(subVal));
        });
        return;
      }

      paramsSearch.append(`FIELDS[${key}]`, String(val ?? ""));
    });

    const response = await fetch(`${webhookUrl}?${paramsSearch.toString()}`, {
      method: "GET",
    });

    let responseData: any = null;
    try {
      responseData = await response.json();
    } catch (parseError) {
      responseData = null;
    }

    if (!response.ok || (responseData && responseData.error)) {
      const message = responseData?.error_description || responseData?.error || response.statusText;
      throw new Error(message || "Erro desconhecido ao chamar o webhook");
    }

    await supabaseClient.from("actions_log").insert([
      {
        lead_id: leadId,
        action_label: actionLabel,
        payload: buildLogPayload(options, {
          ...baseLogPayload,
          all_fields: allFields,
          response: responseData,
        }),
        status: "OK",
        user_id: userId,
      },
    ]);

    return {
      status: "success",
      message: `Lead ${leadId} atualizado com sucesso`,
      bitrixResponse: responseData,
      payload: allFields,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await supabaseClient.from("actions_log").insert([
      {
        lead_id: leadId,
        action_label: actionLabel,
        payload: buildLogPayload(options, {
          ...baseLogPayload,
          error: message,
        }),
        status: "ERROR",
        error: message,
        user_id: userId,
      },
    ]);

    return {
      status: "error",
      message,
    };
  }
}
