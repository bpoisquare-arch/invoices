import AIMTPayslipForm from '@/components/payslips/aimt-payslip-form'

export const metadata = {
  title: 'Create AIMT Payslip | Client Management System',
  description: 'Generate and export a new AIMT College employee payslip',
}

export default function NewPayslipPage() {
  return <AIMTPayslipForm />
}
