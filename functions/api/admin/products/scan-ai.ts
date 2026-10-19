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
      temperature: 0.1,
      topP: 0.8,
      maxOutputTokens: 2048,
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
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 11000);

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${encodeURIComponent(apiKey)}`;
    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(geminiPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      console.error('[Gemini Flash Error]:', geminiRes.status, errorText);

      if (geminiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Cuota de IA excedida (429). Por favor espera un momento e intenta nuevamente.' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: `Error del proveedor de IA (${geminiRes.status})` }),
        { status: geminiRes.status >= 500 ? 502 : 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

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
