import { Helmet } from 'react-helmet-async';

export const DEFAULT_SITE_URL = 'https://zetech-web.pages.dev';
export const DEFAULT_SITE_NAME = 'ZuTech Store';

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface ProductSchemaData {
  name: string;
  description?: string;
  image?: string;
  sku?: string;
  brand?: string;
  price?: number;
  priceCurrency?: string;
  inStock?: boolean;
  category?: string;
}

export interface SEOProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: string;
  schemaType?: 'Organization' | 'Product' | 'WebSite' | 'Store' | string;
  noIndex?: boolean;
  product?: ProductSchemaData;
  breadcrumbs?: BreadcrumbItem[];
}

export default function SEO({ 
  title, 
  description, 
  image = '/hero-desktop.webp', 
  url, 
  type = 'website',
  schemaType = 'Store',
  noIndex = false,
  product,
  breadcrumbs
}: SEOProps) {
  let baseUrl = import.meta.env.VITE_SITE_URL || DEFAULT_SITE_URL;
  // Limpiar posible formato Markdown accidental como "[https://...](https://...)"
  baseUrl = baseUrl.replace(/^\[.*\]\((.*)\)$/, '$1').replace(/\/+$/, '');
  
  const finalUrl = url 
    ? (url.startsWith('http') ? url : `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`) 
    : baseUrl;

  const siteName = import.meta.env.VITE_SITE_NAME || DEFAULT_SITE_NAME;
  const fullTitle = title.includes(siteName) ? title : `${title} · ${siteName}`;
  const fullImage = image
    ? (image.startsWith('http') ? image : `${baseUrl}${image.startsWith('/') ? '' : '/'}${image}`)
    : `${baseUrl}/hero-desktop.webp`;

  // Construcción del grafo de datos estructurados Schema.org
  const graph: Record<string, unknown>[] = [
    {
      "@type": "Store",
      "@id": `${baseUrl}/#store`,
      "name": siteName,
      "url": baseUrl,
      "logo": `${baseUrl}/logo.webp`,
      "image": `${baseUrl}/hero-desktop.webp`,
      "description": "Tienda especializada en computación, hardware y servicio técnico profesional en Maracaibo.",
      "priceRange": "$$"
    }
  ];

  // Entidad Producto con Oferta
  if (schemaType === 'Product' && product) {
    const prodImg = product.image
      ? (product.image.startsWith('http') ? product.image : `${baseUrl}${product.image.startsWith('/') ? '' : '/'}${product.image}`)
      : fullImage;

    const productEntity: Record<string, unknown> = {
      "@type": "Product",
      "@id": `${finalUrl}/#product`,
      "name": product.name || title,
      "description": product.description || description,
      "image": [prodImg],
      "brand": {
        "@type": "Brand",
        "name": product.brand || 'ZuTech'
      }
    };

    if (product.sku) {
      productEntity.sku = product.sku;
      productEntity.mpn = product.sku;
    }

    if (product.category) {
      productEntity.category = product.category;
    }

    if (product.price !== undefined) {
      productEntity.offers = {
        "@type": "Offer",
        "url": finalUrl,
        "priceCurrency": product.priceCurrency || "USD",
        "price": Number(product.price).toFixed(2),
        "availability": product.inStock !== false ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "itemCondition": "https://schema.org/NewCondition"
      };
    }

    graph.push(productEntity);
  }

  // Entidad BreadcrumbList
  if (breadcrumbs && breadcrumbs.length > 0) {
    graph.push({
      "@type": "BreadcrumbList",
      "itemListElement": breadcrumbs.map((crumb, idx) => ({
        "@type": "ListItem",
        "position": idx + 1,
        "name": crumb.name,
        "item": crumb.url.startsWith('http') ? crumb.url : `${baseUrl}${crumb.url.startsWith('/') ? '' : '/'}${crumb.url}`
      }))
    });
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": graph
  };

  return (
    <Helmet>
      {/* Estándar */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={finalUrl} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:url" content={finalUrl} />

      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />

      {/* JSON-LD Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
}

