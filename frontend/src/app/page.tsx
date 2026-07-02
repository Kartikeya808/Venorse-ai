import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center">
      <h1
        className="text-5xl tracking-tight text-gray-900 mb-12"
        style={{ fontFamily: "'Michroma', sans-serif" }}
      >
        VENORSE
      </h1>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="h-11 px-8 rounded-xl bg-gray-900 text-white text-sm font-semibold flex items-center hover:bg-gray-800 transition-colors"
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className="h-11 px-8 rounded-xl border border-gray-300 text-gray-900 text-sm font-semibold flex items-center hover:bg-gray-50 transition-colors"
        >
          Sign up
        </Link>
      </div>
    </main>
  );
}