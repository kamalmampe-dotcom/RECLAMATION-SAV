// Types partagés du frontend — miroir des réponses de l'API.

export type Role =
  | 'ADMIN'
  | 'TELECONSEILLERE'
  | 'CRM_MANAGER'
  | 'CONSEILLER_SAV'
  | 'CHEF_ATELIER'
  | 'RESPONSABLE_SAV'
  | 'DIRECTION';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ComplaintStatus =
  | 'NEW'
  | 'QUALIFIED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'PENDING_PARTS'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'CLOSED'
  | 'CANCELLED';

export interface SiteRef {
  id: string;
  code: string;
  name: string;
  city: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  siteId: string | null;
  site?: SiteRef | null;
}

export interface UserRow extends CurrentUser {
  phone?: string | null;
  active: boolean;
  managerId?: string | null;
}

export interface Category {
  id: string;
  code: string;
  labelFr: string;
}

export interface RootCause {
  id: string;
  code: string;
  labelFr: string;
}

export interface ComplaintListItem {
  id: string;
  reference: string;
  clientName: string;
  clientPhone: string;
  vehiclePlate: string | null;
  vehicleModel: string | null;
  priority: Priority;
  status: ComplaintStatus;
  escalationLevel: number;
  slaDueAt: string | null;
  createdAt: string;
  category: { code: string; labelFr: string } | null;
  site: { code: string; city: string } | null;
  assignedTo: { id: string; fullName: string } | null;
  createdBy: { id: string; fullName: string } | null;
}

export interface ComplaintList {
  items: ComplaintListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ComplaintDetail extends ComplaintListItem {
  clientEmail: string | null;
  vehicleVin: string | null;
  vehicleYear: number | null;
  mileage: number | null;
  description: string;
  qualifiedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  category: { id: string; code: string; labelFr: string } | null;
  site: { id: string; code: string; city: string; name: string } | null;
  assignedTo: { id: string; fullName: string; role: Role } | null;
  createdBy: { id: string; fullName: string; role: Role } | null;
  rootCauses: { rootCause: RootCause }[];
  statusHistory: {
    id: string;
    fromStatus: ComplaintStatus | null;
    toStatus: ComplaintStatus;
    comment: string | null;
    createdAt: string;
    changedBy: { fullName: string; role: Role } | null;
  }[];
  escalations: { id: string; reason: string; level: number; note: string | null; createdAt: string }[];
  nps: { score: number | null; category: string | null } | null;
}
