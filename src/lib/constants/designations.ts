export const EMPLOYEE_DESIGNATIONS = [
  'Founder',
  'Co-Founder & Director',
  'Director – Australia Office',
  'Head Accountant',
  'Jr. Accountant',
  'Operational Head',
  'HR Generalist',
  'General Manager',
  'Onshore SM Manager',
  'Processing Lead',
  'SM Manager & Graphics Designer',
  'Sales Head',
  'Operational & AfterSales Officer',
  'Branch & After Sales Manager',
  'Offshore Visa File Officer',
  'Onshore Processing Lead',
  'Onshore Processing Officer',
  'Operational Coordinator',
  'Student Counsellor',
  'IELTS/PTE Trainer',
] as const

export type EmployeeDesignation = (typeof EMPLOYEE_DESIGNATIONS)[number] | string
