import React from 'react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="p-8 max-w-2xl mx-auto font-sans text-gray-800">
      <Link to="/" className="text-indigo-600 hover:text-indigo-800 font-bold mb-4 inline-block">&larr; Voltar</Link>
      <h1 className="text-2xl font-bold mb-4">Política de Privacidade</h1>
      <p className="mb-4">
        Esta Política de Privacidade descreve como o aplicativo "Controle de Clientes" trata suas informações.
      </p>
      <p className="mb-4">
        Não coletamos, armazenamos ou compartilhamos dados pessoais dos usuários.
      </p>
      <p>
        Se você tiver dúvidas, entre em contato conosco.
      </p>
    </div>
  );
}
