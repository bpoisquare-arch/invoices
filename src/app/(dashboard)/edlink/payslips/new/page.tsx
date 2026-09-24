import EdLinkPayslipForm from '@/components/payslips/edlink-payslip-form'

export const metadata = {
  title: 'Create EdLink Payslip | MIS - Management Information System',
  description: 'Generate and export a new EdLink Australia employee payslip',
}

export default function NewEdLinkPayslipPage() {
  return <EdLinkPayslipForm />
}
