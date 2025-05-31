import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Nếu người dùng truy cập vào route gốc '/', chuyển hướng đến '/pages/home'
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/pages/home', request.url));
  }

  // Kiểm tra xem người dùng có đang truy cập vào các route cũ hay không
  if (pathname === '/pages/home' || pathname === '/pages/admin') {
    // Không cần chuyển hướng, vì chúng ta đã tạo các thư mục con tương ứng
    return NextResponse.next();
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}; 