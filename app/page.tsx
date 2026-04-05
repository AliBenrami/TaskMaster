export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-6 py-12">
      <main className="w-full rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-xl font-semibold tracking-tight">TaskMaster AI SDK Foundation</h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          GUI is currently disabled. Use the base agent API endpoint at{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-900">/api/chat</code>.
        </p>
      </main>
    </div>
  );
}
