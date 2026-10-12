export const dynamic = 'force-dynamic'

import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex bg-white font-sans overflow-x-hidden">
      {/* Left Column: Full-height Hero Image */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#001E2F] select-none overflow-hidden min-h-screen">
        <img
          src="/loginpage.png"
          alt="ISquare BPO - People | Process | Performance"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Subtle overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

        {/* Bottom copyright notice on left banner */}
        <div className="absolute bottom-6 left-8 text-xs text-white/70 font-medium tracking-wide drop-shadow-xs">
          © {new Date().getFullYear()} ISquare BPO. All rights reserved.
        </div>
      </div>

      {/* Right Column: Clean Sign In Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 lg:p-14 xl:p-20 bg-white min-h-screen">
        <div className="w-full max-w-[420px]">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
