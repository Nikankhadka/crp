import LoginForm from '../../components/LoginForm';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">cpilot</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to tailor your resume.</p>
        <LoginForm />
      </div>
    </main>
  );
}
