import type { User, Period } from '../types';

export const MOCK_USER: User = {
  id: 'u1',
  name: 'Alex',
  role: 'Controller',
  initials: 'A',
  email: 'alex@stackbooks.io',
};

export const MOCK_PERIOD: Period = {
  label: 'June 2026',
  startDate: '2026-06-01',
  endDate: '2026-06-30',
  status: 'open',
};
