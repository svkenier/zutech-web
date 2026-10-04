export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  twitter?: string;
}

export interface Settings {
  store_name?: string;
  rif?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  map_url?: string;
  social_links?: SocialLinks;
  domainExpirationDate?: string;
  domainAlertEnabled?: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  store_name: '',
  rif: '',
  phone: '',
  whatsapp: '',
  email: '',
  address: '',
  map_url: '',
  domainExpirationDate: '2027-10-02',
  domainAlertEnabled: false,
};
