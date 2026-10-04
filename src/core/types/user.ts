/**
 * Tipos TypeScript para el sistema de Usuarios, Roles y Autenticación.
 * Basado en la jerarquía de roles definida en src/docs/Rules.md.
 *
 * Almacenamiento: Upstash Redis — NUNCA en GitHub público.
 * Autenticación: JWT firmado guardado en `localStorage`.
 * TTL: 30 días de inactividad desconectada (cancelado al iniciar sesión).
 */

// ─── Jerarquía de Roles ──────────────────────────────────────────────────────

/**
 * Roles del sistema en orden ascendente de privilegios:
 *
 * - `empleado`  (Nivel 1): Crear/editar fichas de productos y fotos.
 * - `encargado`   (Nivel 2): Todo lo anterior + gestionar empleados.
 * - `superadmin`  (Nivel 3): Control total. Cuenta permanente (sin TTL).
 */
export type UserRole = 'owner' | 'superadmin' | 'encargado' | 'empleado';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner: 4,
  superadmin: 3,
  encargado: 2,
  empleado: 1,
};

// ─── Interfaz de Usuario en KV ───────────────────────────────────────────────

/**
 * Representación completa de un usuario almacenado en Upstash Redis.
 * Clave de acceso: `user:{username}`.
 *
 * IMPORTANTE: `password_hash` NUNCA se expone al frontend.
 * El campo se incluye aquí únicamente para operaciones del backend.
 */
export interface KVUser {
  /** Identificador único alfanumérico en minúsculas. Ej: "jdoe". */
  username: string;

  /**
   * Hash bcrypt de la contraseña — solo existe en el backend/Upstash Redis.
   * Nunca se serializa ni se envía al cliente.
   */
  password_hash: string;

  /** Rol y nivel de privilegios del usuario. */
  role: UserRole;

  /**
   * Username del usuario que creó esta cuenta.
   * Útil para auditoría y validación de jerarquía al eliminar.
   */
  created_by: string;

  /** Fecha de creación de la cuenta en formato ISO 8601. */
  created_at: string;

  /**
   * Fecha del último inicio de sesión exitoso en formato ISO 8601.
   * Se actualiza en cada llamada a `POST /api/auth/login`.
   */
  last_login?: string;

  /** Fecha de expiración de la cuenta por inactividad (ISO 8601). */
  expires_at?: string;

  /**
   * Versión del token para invalidación global de sesiones.
   * Se incrementa al cambiar contraseñas o forzar cierre de sesión.
   */
  tokenVersion?: number;

  /**
   * Indica si la cuenta es inmutable.
   * El usuario raíz con esta bandera no puede ser eliminado, expirado ni degradado.
   */
  isProtected?: boolean;
}

// ─── Datos seguros para el Frontend ──────────────────────────────────────────

/**
 * Versión segura del usuario para enviar al cliente.
 * EXCLUYE `password_hash` y cualquier secreto.
 */
export type PublicUser = Omit<KVUser, 'password_hash'>;

// ─── Payload del JWT (claims) ─────────────────────────────────────────────────

/**
 * Contenido del token JWT firmado y almacenado en `localStorage`.
 * Verificado en cada petición a los endpoints protegidos.
 */
export interface JWTPayload {
  /** Identificador del usuario (equals `username`). */
  sub: string;
  /** Rol del usuario en el momento de emisión del token. */
  role: UserRole;
  /** Timestamp de emisión (Unix seconds). */
  iat: number;
  /** Timestamp de expiración (Unix seconds). */
  exp: number;
  /** Versión del token para validar contra base de datos. */
  tokenVersion?: number;
}

// ─── Estado de Autenticación (contexto React) ─────────────────────────────────

/**
 * Estado global de autenticación disponible a través del contexto de la app.
 */
export interface AuthState {
  /** Usuario autenticado actualmente, o `null` si no hay sesión. */
  user: PublicUser | null;
  /** Token JWT en texto plano almacenado en `localStorage`. */
  token: string | null;
  /** `true` mientras se verifica el token al cargar la app. */
  isLoading: boolean;
  /** `true` si hay un usuario autenticado con token válido. */
  isAuthenticated: boolean;
}

// ─── DTOs de Peticiones a la API ─────────────────────────────────────────────

/** Payload para `POST /api/auth/login`. */
export interface LoginRequest {
  username: string;
  password: string;
}

/** Respuesta exitosa de `POST /api/auth/login`. */
export interface LoginResponse {
  token: string;
  user: PublicUser;
}

/** Payload para `POST /api/users/create`. */
export interface CreateUserRequest {
  username: string;
  password: string;
  role: Exclude<UserRole, 'owner'> | 'owner'; // superadmin/owner logic is handled by canCreateRole
}

/** Payload para `POST /api/users/reset-password` (solo SuperAdmin). */
export interface ResetPasswordRequest {
  /** Username del usuario al que se le resetea la contraseña. */
  target_username: string;
  /** Nueva contraseña en texto plano (se hashea en el backend). */
  new_password: string;
}

/** Payload para `POST /api/auth/rescue` (recuperación de SuperAdmin). */
export interface RescueRequest {
  new_password: string;
  master_rescue_key: string;
}

/** Respuesta de `GET /api/users/list`. */
export interface UsersListResponse {
  users: PublicUser[];
  total: number;
}

// ─── Permisos y Guardias ──────────────────────────────────────────────────────

/**
 * Devuelve `true` si el `actorRole` tiene suficiente nivel
 * para administrar (crear/eliminar) al `targetRole`.
 *
 * Reglas:
 * - `superadmin` puede gestionar a `encargado` y `empleado`.
 * - `encargado`  puede gestionar solo a `empleado`.
 * - `empleado` no puede gestionar a nadie.
 */
export function canManage(actorRole: UserRole, targetRole: UserRole): boolean {
  return ROLE_HIERARCHY[actorRole] > ROLE_HIERARCHY[targetRole];
}

/**
 * Devuelve `true` si el `actorRole` puede crear usuarios del `newRole`.
 *
 * Reglas adicionales:
 * - Solo `owner` puede crear `superadmin`.
 * - `encargado` solo puede crear `empleado`.
 */
export function canCreateRole(actorRole: UserRole, newRole: UserRole): boolean {
  if (actorRole === 'owner') return true;
  if (actorRole === 'superadmin') return newRole !== 'owner' && newRole !== 'superadmin';
  if (actorRole === 'encargado')  return newRole === 'empleado';
  return false;
}
