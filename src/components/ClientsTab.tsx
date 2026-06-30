import { useState } from 'react';
import { Client } from '../types';
import { 
  UserPlus, Search, Phone, Mail, MapPin, Trash2, Edit2, Contact
} from 'lucide-react';
import ClientFormModal from './ClientFormModal';
import ConfirmModal from './ConfirmModal';
import { auth } from '../firebase';
// Removed unused import


interface ClientsTabProps {
  clients: Client[];
  onAddClient: (client: Omit<Client, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateClient: (id: string, client: Partial<Client>) => Promise<void>;
  onDeleteClient: (id: string) => Promise<void>;
}

export default function ClientsTab({
  clients,
  onAddClient,
  onUpdateClient,
  onDeleteClient
}: ClientsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<{ id: string; name: string } | null>(null);

  // Search filter
  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  const handleStartEdit = (client: Client) => {
    setSelectedClient(client);
    setIsFormOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedClient(null);
    setIsFormOpen(true);
  };



  const handleImportContactsFromDevice = async () => {
    // @ts-ignore
    if (!('contacts' in navigator && 'ContactsManager' in window)) {
        alert('Seu navegador não suporta a importação direta de contatos.');
        return;
    }

    try {
        // @ts-ignore
        const contacts = await navigator.contacts.select(['name', 'email', 'tel'], { multiple: true });
        
        if (contacts.length === 0) return;

        const newClients = contacts.map((contact: any) => ({
            name: contact.name?.[0] || 'Sem nome',
            email: contact.email?.[0] || '',
            phone: contact.tel?.[0] || '',
            address: 'Endereço não importado',
            coordinates: { lat: 0, lng: 0 }
        }));

        for (const client of newClients) {
            await onAddClient(client);
        }
        
        alert(`${newClients.length} contatos importados do celular com sucesso!`);
    } catch (e: any) {
        console.error("Error importing contacts:", e);
        alert('Erro ao importar contatos do celular.');
    }
  };

  const handleSaveClient = async (clientData: Omit<Client, 'id' | 'createdAt'>) => {
    if (selectedClient) {
      await onUpdateClient(selectedClient.id, clientData);
    } else {
      await onAddClient(clientData);
    }
  };

  const handleConfirmDelete = async () => {
    if (clientToDelete) {
      try {
        await onDeleteClient(clientToDelete.id);
      } catch (e: any) {
        alert(e.message || 'Erro ao excluir cliente.');
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full overflow-hidden">
      {/* Clients List Panel */}
      <div className="flex flex-col w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-6 overflow-hidden h-full">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h2 id="clients-heading" className="text-xl font-bold text-slate-800">Clientes</h2>
            <p className="text-sm text-slate-500">Gerencie a base de clientes para entregas</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleImportContactsFromDevice}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl shadow-sm transition-all duration-200 text-sm cursor-pointer"
            >
              <Contact className="w-4 h-4" />
              <span>Importar dos Contatos</span>
            </button>
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md shadow-indigo-100 hover:shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 text-sm cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Novo Cliente</span>
            </button>
          </div>
        </div>

        {/* Search Box */}
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-3 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por nome, endereço ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 focus:bg-white text-slate-700 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl outline-none transition-all duration-200 text-sm"
          />
        </div>

        {/* Client List */}
        <div className="flex-grow overflow-y-auto pr-1 space-y-3">
          {filteredClients.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <p className="text-slate-500 text-sm font-medium">Nenhum cliente encontrado.</p>
              {searchTerm && <p className="text-slate-400 text-xs mt-1">Experimente limpar a busca.</p>}
            </div>
          ) : (
            filteredClients.map((client) => (
              <div 
                key={client.id}
                className="group flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-white hover:bg-slate-50/70 border border-slate-150 hover:border-slate-300 rounded-xl transition-all duration-200 gap-4"
              >
                <div className="flex-grow space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800 truncate">{client.name}</h3>
                    {client.coordinates && (
                      <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold border border-emerald-100">
                        <MapPin className="w-2.5 h-2.5" /> Localizado
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500">
                    <p className="flex items-center gap-1.5 truncate">
                      <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{client.phone || 'Sem telefone'}</span>
                    </p>
                    {client.email && (
                      <p className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span>{client.email}</span>
                      </p>
                    )}
                    <p className="flex items-center gap-1.5 md:col-span-2 mt-1 truncate" title={client.address}>
                      <MapPin className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                      <span className="text-slate-600">{client.address}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    onClick={() => handleStartEdit(client)}
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors duration-200"
                    title="Editar Cliente"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setClientToDelete({ id: client.id, name: client.name })}
                    className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors duration-200"
                    title="Excluir Cliente"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Dedicated Client Form Modal (Add & Edit) */}
      <ClientFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        client={selectedClient}
        onSave={handleSaveClient}
      />

      {/* Exclusão do Cliente ConfirmModal */}
      <ConfirmModal
        isOpen={clientToDelete !== null}
        onClose={() => setClientToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir Cliente"
        message={`Tem certeza que deseja excluir o cliente "${clientToDelete?.name}"? Esta ação removerá o cliente permanentemente e não poderá ser desfeita.`}
        confirmText="Excluir Cliente"
        cancelText="Cancelar"
        isDestructive={true}
      />
    </div>
  );
}
