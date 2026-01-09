
export interface CurriculumItem {
  id: string;
  area: string; // COMPTATGE, QUANTITAT, etc.
  competenciaEspecifica: string; // CE1, CE2, etc.
  saber: string; // Saber del currículum
  description: string; // De què parlem?
  planificat: string; // 5è, 6è
  trimestre: string;
  actuacio: string;
  observacions: string;
  criteris: string[]; // New field: List of specific evaluation criteria
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  link?: string; // External URL
  grade: string;
  trimestre: string;
  academicYear: string; // New field: 2024-2025
  curriculumIds: string[]; // IDs linking to CurriculumItem
  criteria: string[]; // New field: Selected evaluation criteria strings
  tags?: string[]; // Custom user labels
  evaluation?: string; // New field: AI generated or manual evaluation indicators/rubric
  createdAt: number;
}

export type ViewState = 'dashboard' | 'activities' | 'curriculum';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isLoading?: boolean;
}
