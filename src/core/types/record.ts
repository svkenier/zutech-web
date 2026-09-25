export interface BaseRecord {
  id: string;
  title: string;
  description: string;
  type: string; // Used to distinguish categories if needed
  main_image: string;
  gallery: string[];
  status: 'active' | 'inactive' | 'archived' | string;
  attributes: Record<string, any>; // Flexible for any domain
  created_at: string;
  updated_at: string;
}

export interface RecordUpsertBody {
  id?: string;
  title: string;
  description: string;
  type?: string;
  status?: string;
  attributes?: Record<string, any>;
  
  // Handling image uploads
  main_image_base64?: string;
  gallery_base64?: string[];
  gallery_existing?: string[];
  
  // We keep main_image explicit for URL preservation, but they're mostly manipulated on the backend
  main_image_url?: string;
}

export interface RecordDeleteBody {
  id: string;
}

export interface PaginatedRecords {
  records: BaseRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface ProductAttributes {
  price: number;
  brand: string;
  category: string;
  in_stock: boolean;
  featured: boolean;
  specs?: Record<string, string | number>;
  [key: string]: any;
}

export interface Product extends Omit<BaseRecord, 'attributes'> {
  attributes: ProductAttributes;
}
