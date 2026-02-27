export enum UserRole {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  TECHNICIAN = 'TECHNICIAN',
  MANAGER = 'MANAGER'
}

export enum IssueStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED'
}

export enum IssuePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: number;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  data: string; // Base64
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  category: string;
  subCategory?: string;
  place: string;
  reportedBy: string; // User ID
  reportedByName: string;
  assignedTo?: string; // User ID
  assignedToName?: string;
  createdAt: number;
  updatedAt: number;
  comments: Comment[];
  attachments: Attachment[];
  location?: string;
  aiAnalysis?: string; // Field for Gemini AI analysis
}

export interface DashboardStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  critical: number;
}