import { getAuthPayload } from '../../../../src/core/auth/auth.js';
import type { Env } from '../../../../src/core/auth/auth.js';

/**
 * Categorías canónicas de productos en el catálogo de Zetech.
 * Se inyectan en el enum del responseSchema para forzar alineación con D1.
 */
const CANONICAL_CATEGORIES = [
  'Procesadores',
  'Tarjetas Gráficas',
  'Tarjetas Madre',
  'Memorias RAM',
  'Almacenamiento',
  'Fuentes de Poder',
  'Chasis / Cases',
  'Refrigeración',
  'Periféricos',
  'Laptops',
  'PCs / Computadoras',
  'Servicio Técnico / Software',
  'Otros',
] as const;

type CanonicalCategory = (typeof CANONICAL_CATEGORIES)[number];

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const MAX_PAYLOAD_BYTES = 1048576; // 1 MB límite estricto de seguridad en Edge

interface ScanRequestBody {
  image?: unknown;
  mimeType?: unknown;
}

interface GeminiPart {
  text?: string;
}

interface GeminiContent {
  parts?: GeminiPart[];
  role?: string;
}

interface GeminiCandidate {
  content?: GeminiContent;
  finishReason?: string;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

export interface ScannedProductData {
  title: string;
  brand: string;
  model: string;
  category: CanonicalCategory;
  specs: Record<string, string>;
  description: string;
}

// ============================================================================
// CONFIGURACIÓN DE CASCADA MULTI-MODELO DE ALTA DISPONIBILIDAD
// ============================================================================

export const AI_MODELS_CASCADE = [
  'gemini-flash-lite-latest', // Nivel 1: Ultrarrápido (primer intento)
  'gemini-2.5-flash',         // Nivel 2: Respaldo robusto de alta fidelidad
] as const;

export type AIModelId = (typeof AI_MODELS_CASCADE)[number];

type CascadeDecision =
  | { action: 'SUCCESS'; response: Response }
  | { action: 'FALLBACK_SATURATION'; status: number; message: string }
  | { action: 'FALLBACK_DEPRECATED'; status: number; message: string }
  | { action: 'FATAL_ABORT'; status: number; message: string };

export type CascadeResult =
  | { ok: true; response: Response; usedModel: string; fellBack: boolean }
  | { ok: false; status: number; errorMessage: string; lastModel: string };

/**
 * Clasifica la respuesta HTTP del proveedor de IA para decidir el comportamiento en cascada.
 */
async function classifyGeminiResponse(res: Response, modelId: string): Promise<CascadeDecision> {
  if (res.ok) {
    return { action: 'SUCCESS', response: res };
  }

  const rawError = await res.text().catch(() => '');
  let errorMessage = rawError;

  try {
    const parsed = JSON.parse(rawError) as { error?: { message?: string; status?: string } };
    if (parsed.error?.message) {
      errorMessage = parsed.error.message;
    }
  } catch {
    errorMessage = rawError.slice(0, 300);
  }

  // 1. Errores fatales de autenticación (No recuperables por cambio de modelo)
  if (res.status === 401 || res.status === 403) {
    console.error(`[AI_FATAL_AUTH]: Clave de API rechazada por Google (${res.status}): ${errorMessage}`);
    return { action: 'FATAL_ABORT', status: res.status, message: errorMessage };
  }

  // 2. Errores permanentes de deprecación o modelo no encontrado (404 / 400 específico)
  const isModelMissing =
    res.status === 404 ||
    (res.status === 400 && (errorMessage.toLowerCase().includes('model') || errorMessage.toLowerCase().includes('not found')));

  if (isModelMissing) {
    console.error(
      `[AI_MODEL_DEPRECATION_ALERT] [SEVERITY:CRITICAL] El modelo '${modelId}' ha fallado con estado ${res.status}: "${errorMessage}". ` +
      `Es muy probable que este modelo esté descontinuado o su identificador haya expirado en la API v1beta. ` +
      `Se procederá con fallback transparente al siguiente modelo.`
    );
    return { action: 'FALLBACK_DEPRECATED', status: res.status, message: errorMessage };
  }

  // 3. Errores transitorios de cuota o saturación diurna (503, 429, 504)
  if (res.status === 429 || res.status === 503 || res.status === 504) {
    console.warn(
      `[AI_CASCADE_FAILOVER]: Modelo '${modelId}' saturado (${res.status}): "${errorMessage}". Conmutando al modelo de respaldo...`
    );
    return { action: 'FALLBACK_SATURATION', status: res.status, message: errorMessage };
  }

  // 4. Otros errores de servidor del proveedor (ej: 500 interno) -> Activar respaldo preventivo
  if (res.status >= 500) {
    console.warn(`[AI_CASCADE_FAILOVER]: Error interno del proveedor en '${modelId}' (${res.status}). Conmutando a respaldo...`);
    return { action: 'FALLBACK_SATURATION', status: res.status, message: errorMessage };
  }

  // 5. Errores de cliente (ej: 413, 400 por payload corrupto) -> Abortar para no duplicar errores de entrada
  return { action: 'FATAL_ABORT', status: res.status, message: errorMessage };
}

/**
 * Orquesta la cascada de modelos intentando secuencialmente cada opción dentro del tiempo restante.
 */
async function executeGeminiCascade(
  payload: Record<string, unknown>,
  apiKey: string,
  signal: AbortSignal
): Promise<CascadeResult> {
  const serializedBody = JSON.stringify(payload);
  let lastFailureStatus = 503;
  let lastFailureMessage = 'Servicio de IA temporalmente saturado';
  let lastModelTried: string = AI_MODELS_CASCADE[0];

  for (let i = 0; i < AI_MODELS_CASCADE.length; i++) {
    const modelId = AI_MODELS_CASCADE[i];
    lastModelTried = modelId;
    const isFallback = i > 0;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${encodeURIComponent(apiKey)}`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: serializedBody,
        signal,
      });

      const decision = await classifyGeminiResponse(res, modelId);

      if (decision.action === 'SUCCESS') {
        return {
          ok: true,
          response: decision.response,
          usedModel: modelId,
          fellBack: isFallback,
        };
      }

      lastFailureStatus = decision.status;
      lastFailureMessage = decision.message;

      if (decision.action === 'FATAL_ABORT') {
        return {
          ok: false,
          status: decision.status,
          errorMessage: decision.message,
          lastModel: modelId,
        };
      }
      // Continúa el bucle hacia el siguiente modelo en la cascada
    } catch (err: unknown) {
      if (signal.aborted) {
        throw err;
      }
      console.warn(`[AI_CASCADE_NETWORK_ERROR]: Error de red al consultar '${modelId}':`, err);
      lastFailureStatus = 503;
      lastFailureMessage = err instanceof Error ? err.message : 'Error de conexión con el proveedor';
      // Continúa al siguiente modelo de respaldo
    }
  }

  return {
    ok: false,
    status: lastFailureStatus,
    errorMessage: lastFailureMessage,
    lastModel: lastModelTried,
  };
}

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Allow': 'POST, OPTIONS',
    },
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // 1. Verificación inmediata de Content-Length antes de deserializar
  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader) {
    const parsedLength = parseInt(contentLengthHeader, 10);
    if (!Number.isNaN(parsedLength) && parsedLength > MAX_PAYLOAD_BYTES) {
      return new Response(
        JSON.stringify({ error: 'La imagen excede el límite permitido de 1 MB (Payload Too Large)' }),
        { status: 413, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // 2. Autenticación y Autorización administrativa
  const auth = await getAuthPayload(request, env);
  if (!auth) {
    return new Response(
      JSON.stringify({ error: 'No autorizado para ejecutar inferencia de escáner' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 3. Verificación de clave API de Gemini en variables de entorno
  const apiKey = (env.GEMINI_API_KEY as string | undefined)?.replace(/^["']|["']$/g, '').trim();
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'La clave GEMINI_API_KEY no está configurada en el entorno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 4. Lectura segura del cuerpo de la petición
  let body: ScanRequestBody;
  try {
    body = (await request.json()) as ScanRequestBody;
  } catch {
    return new Response(
      JSON.stringify({ error: 'El cuerpo de la petición debe ser un JSON válido' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!body.image || typeof body.image !== 'string' || body.image.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: 'Se requiere una imagen en formato Base64 en el campo "image"' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 5. Sanitización de Base64 y extracción de mimeType
  let base64Data = body.image.trim();
  let mimeType = typeof body.mimeType === 'string' && body.mimeType.trim().length > 0
    ? body.mimeType.trim().toLowerCase()
    : 'image/jpeg';

  if (base64Data.startsWith('data:')) {
    const commaIndex = base64Data.indexOf(',');
    if (commaIndex !== -1) {
      const header = base64Data.substring(0, commaIndex);
      const mimeMatch = header.match(/^data:([^;]+);base64/i);
      if (mimeMatch && mimeMatch[1]) {
        mimeType = mimeMatch[1].toLowerCase();
      }
      base64Data = base64Data.substring(commaIndex + 1).trim();
    }
  }

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    mimeType = 'image/jpeg';
  }

  // Comprobar tamaño real del Base64 decodificado estimado
  const estimatedByteSize = (base64Data.length * 3) / 4;
  if (estimatedByteSize > MAX_PAYLOAD_BYTES) {
    return new Response(
      JSON.stringify({ error: 'La imagen decodificada supera el límite de 1 MB' }),
      { status: 413, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 6. Configuración de Inferencia en Gemini Flash con Structured Outputs optimizado para mínima latencia
  const geminiPayload = {
    contents: [
      {
        parts: [
          {
            text: `Eres un asistente de hardware informático y electrónica. Analiza la imagen técnica (etiqueta de producto, caja, empaque o placa).
Extrae los datos técnicos del producto de forma rápida y ultra concisa.
Categorías válidas permitidas: ${CANONICAL_CATEGORIES.join(', ')}.`,
          },
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.0,
      topP: 0.8,
      maxOutputTokens: 600,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING', description: 'Nombre comercial conciso del producto' },
          brand: { type: 'STRING', description: 'Marca del fabricante' },
          model: { type: 'STRING', description: 'Código de parte o modelo exacto' },
          category: {
            type: 'STRING',
            enum: [...CANONICAL_CATEGORIES],
            description: 'Categoría exacta seleccionada de las provistas',
          },
          specs: {
            type: 'ARRAY',
            description: 'Máximo 4 especificaciones técnicas clave visibles (ej: RAM, Almacenamiento, Frecuencia)',
            items: {
              type: 'OBJECT',
              properties: {
                key: { type: 'STRING', description: 'Nombre del parámetro técnico' },
                value: { type: 'STRING', description: 'Valor del parámetro técnico' },
              },
              required: ['key', 'value'],
            },
          },
          description: { type: 'STRING', description: 'Resumen técnico legible y conciso de 1 sola frase' },
        },
        required: ['title', 'brand', 'model', 'category', 'specs', 'description'],
      },
      thinkingConfig: {
        thinkingBudget: 1, // Suprime el tiempo excesivo de deliberación interna
      },
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 14000);

  try {
    const cascadeResult = await executeGeminiCascade(geminiPayload, apiKey, controller.signal);

    clearTimeout(timeoutId);

    if (!cascadeResult.ok) {
      if (cascadeResult.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Cuota de IA excedida (429). Por favor espera un momento e intenta nuevamente.' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (cascadeResult.status === 503 || cascadeResult.status === 504) {
        return new Response(
          JSON.stringify({ error: 'El servicio de IA está experimentando alta demanda momentánea. Por favor, intenta de nuevo.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: `Error del proveedor de IA (${cascadeResult.status}): ${cascadeResult.errorMessage}` }),
        { status: cascadeResult.status >= 500 ? 502 : 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const geminiRes = cascadeResult.response;
    const geminiData = (await geminiRes.json()) as GeminiResponse;
    const candidate = geminiData.candidates?.[0];
    const textOutput = candidate?.content?.parts?.[0]?.text;

    if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
      console.warn('[Gemini finishReason]:', candidate.finishReason);
    }

    if (!textOutput) {
      return new Response(
        JSON.stringify({ error: 'La IA no devolvió información analizable para la imagen proporcionada' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let parsed: Record<string, unknown>;
    try {
      const cleanJsonText = textOutput.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleanJsonText) as Record<string, unknown>;
    } catch (err: unknown) {
      console.error('[Scan AI JSON Parse Error]:', err, '\nRaw Gemini Output:', textOutput);
      return new Response(
        JSON.stringify({ error: 'La respuesta estructurada de la IA no pudo ser deserializada' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Normalización estricta del contrato de salida
    const normalizedCategory: CanonicalCategory =
      typeof parsed.category === 'string' && (CANONICAL_CATEGORIES as readonly string[]).includes(parsed.category)
        ? (parsed.category as CanonicalCategory)
        : 'Otros';

    const normalizedSpecs: Record<string, string> = {};
    if (Array.isArray(parsed.specs)) {
      for (const item of parsed.specs) {
        if (item && typeof item === 'object' && 'key' in item && 'value' in item) {
          const k = String(item.key).trim();
          const v = String(item.value).trim();
          if (k && v) {
            normalizedSpecs[k] = v;
          }
        }
      }
    } else if (parsed.specs && typeof parsed.specs === 'object') {
      const rawSpecs = parsed.specs as Record<string, unknown>;
      for (const [key, val] of Object.entries(rawSpecs)) {
        if (typeof val === 'string' || typeof val === 'number') {
          normalizedSpecs[key] = String(val);
        }
      }
    }

    const responsePayload: ScannedProductData = {
      title: typeof parsed.title === 'string' ? parsed.title.trim() : '',
      brand: typeof parsed.brand === 'string' ? parsed.brand.trim() : '',
      model: typeof parsed.model === 'string' ? parsed.model.trim() : '',
      category: normalizedCategory,
      specs: normalizedSpecs,
      description: typeof parsed.description === 'string' ? parsed.description.trim() : '',
    };

    return new Response(JSON.stringify({ data: responsePayload }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'X-AI-Model-Used': cascadeResult.usedModel,
        'X-AI-Cascade-Fallback': cascadeResult.fellBack ? 'true' : 'false',
      },
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const isTimeout = err instanceof Error && err.name === 'AbortError';

    if (isTimeout) {
      return new Response(
        JSON.stringify({ error: 'Tiempo de espera agotado al conectar con el servicio de IA (Timeout)' }),
        { status: 504, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.error('[Scan AI Unexpected Exception]:', err);
    return new Response(
      JSON.stringify({ error: 'Ocurrió un error inesperado al procesar el escaneo del producto' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
