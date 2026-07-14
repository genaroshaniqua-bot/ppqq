import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const publicPath = (pathname: string) => pathname === "/login" || pathname.startsWith("/artists/");

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  try {
    const pathname = request.nextUrl.pathname;
    const isArtistWorkspace = pathname === "/artist" || pathname.startsWith("/artist/");
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      if (publicPath(pathname)) return response;
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(loginUrl);
    }

    const [{ data: profile }, { data: artist }] = await Promise.all([
      supabase.from("profiles").select("role, account_status").eq("id", user.id).single(),
      isArtistWorkspace
        ? supabase.from("artist_profiles").select("review_status").eq("user_id", user.id).maybeSingle()
        : Promise.resolve({ data: null })
    ]);

    if (profile?.account_status === "suspended") {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("reason", "suspended");
      return NextResponse.redirect(loginUrl);
    }

    const adminAllowedPath =
      pathname.startsWith("/admin") ||
      pathname.startsWith("/profile") ||
      pathname.startsWith("/artists/") ||
      pathname === "/login";

    if (profile?.role === "admin" && !adminAllowedPath) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    if (pathname.startsWith("/admin") && profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/home", request.url));
    }

    if (isArtistWorkspace && (profile?.role !== "artist" || artist?.review_status !== "approved")) {
      return NextResponse.redirect(new URL("/profile?apply=artist", request.url));
    }
  } catch {
    // 页面级权限守卫继续兜底；瞬时网络波动不应直接把页面变成 500。
    return response;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.svg|images/|brand/).*)"]
};
