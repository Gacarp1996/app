// components/academia-settings/index.ts

// Reexportar desde /sections
export { AcademiaInfoSection } from './sections/AcademiaInfoSection';
export { ChangeAcademiaSection } from './sections/ChangeAcademiaSection';
export { DeleteAcademiaSection } from './sections/DeleteAcademiaSection';
export { MainConfigModal } from './sections/MainConfigModal';
export { AdvancedConfigModal } from './sections/AdvancedConfigModal';
export { ExerciseStructureConfig } from './sections/ExerciseStructureConfig';
export { SurveyConfig } from './sections/SurveyConfig';

// Reexportar desde /users
export { UserCard } from './users/UserCard';
export { RoleBadge } from './users/RoleBadge';
export { UserManagementSection } from './users/UserManagementSection';
export { default as RoleChangeModal } from './users/RoleChangeModal';

// Reexportar desde /shared
export { LoadingSpinner } from './shared/LoadingSpinner';
export { PermissionError } from './shared/PermissionError';
export { DashboardRenderer } from './shared/DashboardRenderer';