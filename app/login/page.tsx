type Props = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { next, error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FBFAF8] px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-xs uppercase tracking-widest text-[#D4A374]">
            instagram-auto
          </div>
          <h1 className="mt-2 text-3xl font-bold text-[#1C343A]">Dashboard</h1>
        </div>

        <form
          action="/api/auth/login"
          method="POST"
          className="space-y-4 rounded-xl border border-[#1C343A]/10 bg-white p-6 shadow-sm"
        >
          <input type="hidden" name="next" value={next ?? "/overview"} />
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#1C343A]">
              Mot de passe
            </span>
            <input
              type="password"
              name="password"
              autoFocus
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-[#1C343A]/20 bg-[#FBFAF8] px-4 py-3 text-[#1C343A] outline-none focus:border-[#D4A374]"
            />
          </label>
          {error && (
            <p className="text-sm text-[#BF2C23]">Mot de passe incorrect.</p>
          )}
          <button
            type="submit"
            className="w-full rounded-lg bg-[#1C343A] px-4 py-3 font-semibold text-[#FBFAF8] transition hover:bg-[#1C343A]/90"
          >
            Entrer
          </button>
        </form>
      </div>
    </main>
  );
}
