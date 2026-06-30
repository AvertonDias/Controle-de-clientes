import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

export default function InstallPwaModal() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowModal(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('Usuário aceitou a instalação');
    }
    setDeferredPrompt(null);
    setShowModal(false);
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col gap-4">
        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
          <Download className="w-6 h-6" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-slate-900">Instalar LogEstoque</h3>
          <p className="text-sm text-slate-500 mt-2">
            Tenha acesso rápido e funcionalidade offline instalando o LogEstoque no seu dispositivo.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowModal(false)}
            className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200"
          >
            Agora não
          </button>
          <button
            onClick={handleInstall}
            className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700"
          >
            Instalar
          </button>
        </div>
      </div>
    </div>
  );
}
