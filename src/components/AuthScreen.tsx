import { useState, FormEvent } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { auth, googleProvider, setAccessToken } from '../firebase';
import { 
  Compass, Mail, Lock, User, AlertCircle, CheckCircle2, ArrowRight, Loader2, Eye, EyeOff
} from 'lucide-react';

export default function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetFormState = () => {
    setError(null);
    setSuccess(null);
  };

  const handleEmailAuth = async (e: FormEvent) => {
    e.preventDefault();
    resetFormState();
    setLoading(true);

    try {
      if (mode === 'signin') {
        await signInWithEmailAndPassword(auth, email, password);
      } else if (mode === 'signup') {
        if (password !== confirmPassword) {
          throw new Error('As senhas não coincidem.');
        }
        if (password.length < 6) {
          throw new Error('A senha deve ter no mínimo 6 caracteres.');
        }
        await createUserWithEmailAndPassword(auth, email, password);
        setSuccess('Conta criada com sucesso! Redirecionando...');
      } else if (mode === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        setSuccess('E-mail de recuperação de senha enviado! Verifique sua caixa de entrada.');
      }
    } catch (err: any) {
      console.error(err);
      let translatedError = 'Ocorreu um erro inesperado. Tente novamente.';
      
      if (err.code === 'auth/invalid-email') {
        translatedError = 'E-mail inválido.';
      } else if (err.code === 'auth/user-disabled') {
        translatedError = 'Este usuário foi desativado.';
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        translatedError = 'E-mail ou senha incorretos.';
      } else if (err.code === 'auth/wrong-password') {
        translatedError = 'E-mail ou senha incorretos.';
      } else if (err.code === 'auth/email-already-in-use') {
        translatedError = 'Este e-mail já está em uso por outra conta.';
      } else if (err.code === 'auth/weak-password') {
        translatedError = 'A senha informada é muito fraca.';
      } else if (err.code === 'auth/unauthorized-domain') {
        translatedError = 'Domínio não autorizado no Firebase Auth para este aplicativo.';
      } else if (err.message) {
        translatedError = err.message;
      }
      setError(translatedError);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    resetFormState();
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/unauthorized-domain') {
        setError('Domínio não autorizado no Firebase Auth para login com o Google. Por favor, adicione este domínio no console do Firebase.');
      } else if (err.code !== 'auth/popup-closed-by-user') {
        setError('Falha ao autenticar com o Google. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans antialiased selection:bg-indigo-500/30 selection:text-white">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none z-0"></div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative z-10">
        
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="p-3 bg-indigo-600 rounded-2xl mb-4 shadow-lg shadow-indigo-600/20">
            <Compass className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase leading-none">LogEstoque</h1>
          <p className="text-[11px] text-indigo-400 font-bold tracking-widest uppercase mt-1">
            Sistema Logístico & Controle de Rotas
          </p>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="mb-5 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-5 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-2xl flex items-start gap-3 text-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* Auth form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          
          {mode === 'signup' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Nome</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-950 border border-slate-800 focus:border-indigo-500/50 rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none transition-all"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="email"
                required
                placeholder="exemplo@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-950 border border-slate-800 focus:border-indigo-500/50 rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none transition-all"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Senha</label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      resetFormState();
                    }}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3.5 bg-slate-950 border border-slate-800 focus:border-indigo-500/50 rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Confirmar Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3.5 bg-slate-950 border border-slate-800 focus:border-indigo-500/50 rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 active:shadow-none transition-all cursor-pointer select-none"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>
                  {mode === 'signin' && 'Entrar na Conta'}
                  {mode === 'signup' && 'Cadastrar Nova Conta'}
                  {mode === 'forgot' && 'Enviar Link de Recuperação'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        {mode !== 'forgot' && (
          <div className="relative my-6 text-center">
            <hr className="border-slate-800" />
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 bg-slate-900 text-xs font-bold uppercase tracking-wider text-slate-500">
              ou continue com
            </span>
          </div>
        )}

        {/* Google Authentication Button */}
        {mode !== 'forgot' && (
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full py-3.5 px-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 active:bg-slate-950 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-3 transition-colors cursor-pointer select-none"
          >
            {/* Minimalist Google SVG Icon */}
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.25-3.125C18.29 1.138 15.44 0 12.24 0 5.58 0 0 5.37 0 12s5.58 12 12.24 12c6.96 0 11.57-4.832 11.57-11.758 0-.79-.085-1.393-.19-1.957H12.24z"
              />
            </svg>
            <span>Google</span>
          </button>
        )}

        {/* Alternate mode toggle links */}
        <div className="mt-8 text-center text-sm text-slate-400">
          {mode === 'signin' && (
            <p>
              Não tem uma conta?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  resetFormState();
                }}
                className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Cadastre-se grátis
              </button>
            </p>
          )}

          {mode === 'signup' && (
            <p>
              Já possui uma conta?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  resetFormState();
                }}
                className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Faça login
              </button>
            </p>
          )}

          {mode === 'forgot' && (
            <p>
              Lembrou sua senha?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  resetFormState();
                }}
                className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Voltar para o Login
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
}

