import React from 'react';
import { Link } from 'react-router-dom';

export default function TermsOfService() {
  return (
    <div className="p-8 max-w-2xl mx-auto font-sans text-gray-800">
      <Link to="/" className="text-indigo-600 hover:text-indigo-800 font-bold mb-4 inline-block">&larr; Voltar</Link>
      <h1 className="text-2xl font-bold mb-4">Termos de Serviço</h1>
      <p className="mb-4">
        Bem-vindo ao "Controle de Clientes". Ao utilizar este aplicativo, você concorda com estes Termos de Serviço.
      </p>
      <p className="mb-4">
        O aplicativo é fornecido "como está" para fins de organização pessoal.
      </p>
      <p>
        Reservamo-nos o direito de modificar ou descontinuar o serviço a qualquer momento.
      </p>
    </div>
  );
}
