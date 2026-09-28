export interface Client {
  id: string;
  name: string;
  brandColor: string | null;
  archived: boolean;
}

export interface Stage {
  id: string;
  key: string;
  label: string;
  stageType: "backlog" | "in_progress" | "internal_review" | "client_review" | "done";
  order: number;
}

export interface ContentItem {
  id: string;
  clientId: string;
  title: string;
  channel: string;
  format: string;
  publishDate: string;
  status: string;
  client?: { id: string; name: string; brandColor: string | null };
  deliverables?: { id: string; title: string; stageId: string; dueDate: string | null }[];
}

export interface DeliverableAssignee {
  id: string;
  user: { id: string; name: string };
}

export interface Deliverable {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  stageId: string;
  stage?: Stage;
  assignees: DeliverableAssignee[];
  contentItem?: { id: string; title: string; clientId: string } | null;
  checklistItems?: { id: string; label: string; done: boolean }[];
  clientId?: string | null;
  client?: { id: string; name: string } | null;
}
export interface Comment {
  id: string;
  body: string;
  visibility: "internal" | "client_visible";
  createdAt: string;
  author: { id: string; name: string; role: string };
}

export interface WorkspaceUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

export interface AssignableUser {
  id: string;
  name: string;
  role: string;
}

export interface AssetVersion {
  id: string;
  versionNumber: number;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  uploadedBy: { id: string; name: string };
}

export interface AssetFeedbackItem {
  id: string;
  versionNumber: number;
  kind: "comment" | "approved" | "changes_requested";
  body: string | null;
  createdAt: string;
  author: { id: string; name: string; role: string };
}

export interface Asset {
  id: string;
  name: string;
  status: "draft" | "in_review" | "approved" | "delivered";
  createdAt: string;
  versions: AssetVersion[];
  feedback: AssetFeedbackItem[];
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface PublishingStatusItem {
  id: string;
  title: string;
  channel: string;
  format: string;
  status: string;
  computed: "published" | "delayed" | "scheduled";
}

export interface PublishingStatusResponse {
  clients: Client[];
  dates: string[];
  today: string;
  cells: Record<string, Record<string, PublishingStatusItem[]>>;
}


