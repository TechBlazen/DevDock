import { DashboardGrid } from '../components/dashboard/DashboardGrid';

interface DashboardPageProps {
  editMode: boolean;
}

export const DashboardPage = ({ editMode }: DashboardPageProps) => (
  <DashboardGrid editMode={editMode} />
);
