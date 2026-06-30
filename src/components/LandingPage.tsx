import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 p-8 flex flex-col items-center justify-center text-center">
      <h1 className="text-4xl font-black mb-6 text-indigo-900">Controle de Clientes</h1>
      <p className="text-xl mb-8 max-w-lg text-slate-600">
        Sistema logístico integrado para organização de estoque, controle de entregas e gestão de clientes.
      </p>
      
      <div className="space-x-4">
        <Link 
          to="/app" 
          className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Acessar Sistema
        </Link>
      </div>

      <div className="mt-12 flex gap-6 text-sm text-slate-500">
        <Link to="/privacy" className="hover:text-indigo-600">Política de Privacidade</Link>
        <Link to="/terms" className="hover:text-indigo-600">Termos de Serviço</Link>
      </div>
    </div>
  );
}
