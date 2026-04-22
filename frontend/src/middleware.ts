import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('access_token')?.value
  const role  = request.cookies.get('user_role')?.value

  const isHRRoute        = pathname.startsWith('/hr')
  const isProtectedUser  = pathname.startsWith('/my-applications') || pathname.startsWith('/jobs/')
  const isAuthRoute      = pathname.startsWith('/auth')

  // Not logged in → redirect to login
  if (!token && (isHRRoute || isProtectedUser)) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Applicant trying HR pages → redirect to jobs
  if (token && role === 'APPLICANT' && isHRRoute) {
    return NextResponse.redirect(new URL('/jobs', request.url))
  }

  // HR trying applicant-only pages → redirect to dashboard
  if (token && role === 'HR' && isProtectedUser) {
    return NextResponse.redirect(new URL('/hr/dashboard', request.url))
  }

  // Already logged in → skip auth pages
  if (token && isAuthRoute) {
    return NextResponse.redirect(new URL(role === 'HR' ? '/hr/dashboard' : '/jobs', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/hr/:path*', '/my-applications', '/my-applications/:path*', '/auth/:path*'],
}
