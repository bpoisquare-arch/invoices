export const dynamic = 'force-dynamic'

import { LoginForm } from "@/components/login-form"

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-4 md:p-8 bg-[#f8fafc]">
      <div className="w-full max-w-[400px]">
        <LoginForm />
      </div>
    </div>
  )
}
