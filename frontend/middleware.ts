
import { NextResponse } from 'next/server';

export function middleware(req) {
  const token = req.cookies.get('admin_token');

  if (req.nextUrl.pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
