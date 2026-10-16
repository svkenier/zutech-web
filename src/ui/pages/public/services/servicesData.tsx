import React from 'react';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import {
  getServicioMantenimientoUrl,
  getServicioReparacionUrl,
  getServicioAsesoriaUrl,
  getServicioUpgradesUrl,
} from '@ui/utils/whatsapp';

export interface ServiceCard {
  icon: React.ReactNode;
  badge: string;
  title: string;
  bullets: string[];
  tiempo: string;
  getUrl: (phone: string) => string;
  cta: string;
}

export const SERVICES: ServiceCard[] = [
  {
    icon: <BuildOutlinedIcon sx={{ fontSize: 28 }} />,
    badge: 'PREVENTIVO',
    title: 'Mantenimiento Pro',
    bullets: [
      'Limpieza profunda con aire comprimido',
      'Aplicación de pasta térmica premium',
      'Diagnóstico bajo estándar ESD',
      'Revisión de temperaturas y voltajes',
    ],
    tiempo: '~2 horas',
    getUrl: getServicioMantenimientoUrl,
    cta: 'Agendar Mantenimiento',
  },
  {
    icon: <ConstructionOutlinedIcon sx={{ fontSize: 28 }} />,
    badge: 'CORRECTIVO',
    title: 'Reparación y Recuperación',
    bullets: [
      'PC no enciende o pantalla azul (BSOD)',
      'Análisis de placa por esquemático',
      'Reparación de puertos y conectores',
      'Recuperación de datos desde HDD/SSD',
    ],
    tiempo: '24–72 horas',
    getUrl: getServicioReparacionUrl,
    cta: 'Solicitar Diagnóstico',
  },
  {
    icon: <ShoppingCartOutlinedIcon sx={{ fontSize: 28 }} />,
    badge: 'CONSULTORÍA',
    title: 'Asesoría de Compra',
    bullets: [
      '¿Qué PC armar para tu uso real?',
      'Presupuesto honesto sin inflar stock',
      'Compatibilidad entre componentes',
      'Sesión virtual o presencial disponible',
    ],
    tiempo: '~45 min',
    getUrl: getServicioAsesoriaUrl,
    cta: 'Pedir Asesoría',
  },
  {
    icon: <TrendingUpOutlinedIcon sx={{ fontSize: 28 }} />,
    badge: 'UPGRADES',
    title: 'Repotenciación de Equipos',
    bullets: [
      'Migración HDD a SSD sin perder datos',
      'Ampliación de RAM compatible',
      'Cambio de GPU y fuente adecuada',
      'Optimización de Windows y drivers',
    ],
    tiempo: 'Mismo día',
    getUrl: getServicioUpgradesUrl,
    cta: 'Consultar Upgrade',
  },
];

export interface WorkshopStep {
  num: string;
  title: string;
  desc: string;
  tag: string;
}

export const WORKSHOP_STEPS: WorkshopStep[] = [
  {
    num: '01',
    title: 'Check-in y Diagnóstico',
    desc: 'Registramos el equipo, su estado físico y realizamos pruebas iniciales para aislar la falla.',
    tag: 'FOTO + REPORTE INICIAL',
  },
  {
    num: '02',
    title: 'Aprobación del Presupuesto',
    desc: 'Te enviamos el diagnóstico detallado con repuestos necesarios y costo exacto antes de tocar nada.',
    tag: 'CERO SORPRESAS',
  },
  {
    num: '03',
    title: 'Intervención en Taller',
    desc: 'Trabajamos bajo protocolo ESD, usando herramientas profesionales y repuestos verificados.',
    tag: 'ZONA ESD SEGURA',
  },
  {
    num: '04',
    title: 'Pruebas de Estrés y Entrega',
    desc: 'Stress test de CPU/GPU por 30 min mínimo. Si pasa, te avisamos para retiro o coordinamos envío.',
    tag: 'BENCHMARK VERIFICADO',
  },
];

export const TRUST_BADGES: string[] = [
  'Garantía escrita en cada reparación',
  'Sin cobro de diagnóstico si decides no reparar*',
  'Fotos del proceso disponibles a solicitud',
  'Repuestos con trazabilidad confirmada',
];
