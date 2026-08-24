"use client"
import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import UserModal from './UserModal';
import { useAlert } from '../../../components/AlertContext';

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'worker';
  created_at: string;
}

interface AuditLog {
  id: number;
  actor_id: number;
  action: 'LOGIN' | 'logout' | string;
  created_at: string;
  details: string;
}

interface SelectOption {
  value: string;
  label: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const { showAlert, showConfirm } = useAlert();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [roleFilterOption, setRoleFilterOption] = useState<SelectOption>({ 
    value: 'all', 
    label: 'Tous les rôles' 
  });
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

  // Role filter options
  const roleOptions: SelectOption[] = [
    { value: 'all', label: 'Tous les rôles' },
    { value: 'admin', label: 'Administrateur' },
    { value: 'worker', label: 'Employé' },
  ];

  // Custom styles for react-select with padding
  const customSelectStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      border: '1px solid #d1d5db',
      borderRadius: '0px',
      boxShadow: state.isFocused ? '0 0 0 1px #9ca3af' : 'none',
      '&:hover': {
        borderColor: '#9ca3af',
      },
      minHeight: '48px',
      padding: '0px 4px',
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#4b5563' : state.isFocused ? '#f3f4f6' : 'white',
      color: state.isSelected ? 'white' : '#374151',
      padding: '12px 16px',
      fontSize: '14px',
      '&:hover': {
        backgroundColor: '#f3f4f6',
      },
    }),
    menu: (provided: any) => ({
      ...provided,
      borderRadius: '0px',
      border: '1px solid #d1d5db',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    }),
    menuList: (provided: any) => ({
      ...provided,
      padding: '4px 0',
    }),
    singleValue: (provided: any) => ({
      ...provided,
      fontSize: '14px',
      color: '#374151',
    }),
    placeholder: (provided: any) => ({
      ...provided,
      fontSize: '14px',
      color: '#9ca3af',
    }),
    dropdownIndicator: (provided: any) => ({
      ...provided,
      padding: '8px',
    }),
    clearIndicator: (provided: any) => ({
      ...provided,
      padding: '8px',
    }),
    valueContainer: (provided: any) => ({
      ...provided,
      padding: '4px 12px',
    }),
    input: (provided: any) => ({
      ...provided,
      margin: '0px',
      padding: '0px',
    }),
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');

      // Récupérer les utilisateurs
      const usersRes = await fetch('http://localhost:4000/api/users/workers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!usersRes.ok) {
        throw new Error('Échec de la récupération des utilisateurs');
      }
      
      const usersData = await usersRes.json();
      setUsers(usersData.workers || []);

      // Récupérer les journaux d'audit
      try {
        const logsRes = await fetch('http://localhost:4000/api/audit', {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (logsRes.ok) {
          const logsData: AuditLog[] = await logsRes.json();
          const filteredLogs = logsData.filter(log => log.action === 'LOGIN' || log.action === 'logout');
          setAuditLogs(filteredLogs);
        }
      } catch (error) {
        console.warn('Impossible de récupérer les journaux d\'audit:', error);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      showAlert('Échec du chargement des utilisateurs. Veuillez réessayer.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchQuery) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.phone?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    setFilteredUsers(filtered);
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setShowModal(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
  };

  const handleSaveUser = async (userData: any) => {
    try {
      setSaveLoading(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Token d\'authentification non trouvé');
      }

      const url = editingUser 
        ? `http://localhost:4000/api/users/workers/${editingUser.id}` 
        : 'http://localhost:4000/api/users/workers';
      
      const method = editingUser ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erreur HTTP! statut: ${response.status}`);
      }

      await fetchData();
      handleCloseModal();
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'utilisateur:', error);
      showAlert(error instanceof Error ? error.message : 'Une erreur est survenue lors de la sauvegarde', 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!await showConfirm(`Êtes-vous sûr de vouloir supprimer ${user.name} ? Cette action ne peut pas être annulée.`)) {
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Token d\'authentification non trouvé');
      }

      const response = await fetch(`http://localhost:4000/api/users/workers/${user.id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Échec de la suppression de l\'utilisateur');
      }

      await fetchData();
      showAlert('Utilisateur supprimé avec succès', 'success');
      
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'utilisateur:', error);
      showAlert(error instanceof Error ? error.message : 'Échec de la suppression de l\'utilisateur', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleFilterChange = (newValue: SelectOption | null) => {
    if (newValue) {
      setRoleFilterOption(newValue);
      setRoleFilter(newValue.value);
    }
  };

  const getLastLoginLogout = (userId: number) => {
    const userLogs = auditLogs.filter(log => log.actor_id === userId);
    const lastLogin = userLogs
      .filter(log => log.action === 'LOGIN')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    
    const lastLogout = userLogs
      .filter(log => log.action === 'logout')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    
    return { lastLogin, lastLogout };
  };

  const getRoleDisplay = (role: 'admin' | 'worker') => {
    return role === 'admin' ? 'Administrateur' : 'Employé';
  };

  const getRoleBadgeClass = (role: 'admin' | 'worker') => {
    return role === 'admin' 
      ? 'bg-purple-100 text-purple-800 border border-purple-200' 
      : 'bg-blue-100 text-blue-800 border border-blue-200';
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <svg className=" h-6 w-6 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
          <span className="text-gray-600">Chargement des utilisateurs...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-6 bg-gray-50">
      <div className="max-w-7xl mx-auto bg-white shadow-sm border border-gray-200">
        {/* En-tête */}
        <div className="px-6 py-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h1>
              <p className="text-gray-600 mt-1">
                Gérer les utilisateurs et leurs rôles dans le système
              </p>
            </div>
            <button
              onClick={handleCreateUser}
              disabled={loading}
              className="bg-gray-600 text-white px-4 py-4 text-sm font-medium  hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-600 focus:ring-offset-2 disabled:opacity-50  w-full sm:w-auto"
            >
              Créer un nouvel utilisateur
            </button>
          </div>
        </div>

        {/* Filtres */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Rechercher des utilisateurs par nom, email ou téléphone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-gray-300 pl-10 pr-4 py-3 text-sm  focus:outline-none focus:ring-1 focus:ring-gray-600 focus:border-gray-600"
              />
              <svg 
                className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
              </svg>
            </div>

            <div className="w-full sm:w-48">
              <Select
                value={roleFilterOption}
                onChange={handleRoleFilterChange}
                options={roleOptions}
                styles={customSelectStyles}
                isSearchable={false}
              />
            </div>
          </div>
        </div>

        {/* Tableau des utilisateurs */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-700">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Utilisateur</th>
                <th className="px-6 py-4 font-semibold">Contact</th>
                <th className="px-6 py-4 font-semibold">Rôle</th>
                <th className="px-6 py-4 font-semibold">Dernière activité</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map(user => {
                const { lastLogin, lastLogout } = getLastLoginLogout(user.id);
                const loginTime = lastLogin ? new Date(lastLogin.created_at).toLocaleString() : 'Jamais';
                const logoutTime = lastLogout ? new Date(lastLogout.created_at).toLocaleString() : 'Jamais';

                return (
                  <tr key={user.id} className="hover:bg-gray-50 ">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{user.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900">{user.email}</div>
                      {user.phone && (
                        <div className="text-gray-500 text-sm">{user.phone}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeClass(user.role)}`}>
                        {getRoleDisplay(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="text-gray-900">Connexion: {loginTime}</div>
                        <div className="text-gray-500">Déconnexion: {logoutTime}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-4">
                        <button 
                          onClick={() => handleEditUser(user)}
                          className="inline-flex items-center justify-center p-4 text-gray-600 hover:text-gray-900 bg-gray-100   focus:outline-none focus:ring-1 focus:ring-gray-600 focus:ring-offset-2"
                          title="Modifier l'utilisateur"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
                            <path fillRule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5z"/>
                          </svg>
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user)}
                          className="inline-flex items-center justify-center p-4 text-red-600 hover:text-red-700 bg-red-50   focus:outline-none focus:ring-1 focus:ring-red-600 focus:ring-offset-2"
                          title="Supprimer l'utilisateur"
                          disabled={loading}
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5M11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47M8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* État vide */}
        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun utilisateur trouvé</h3>
            <p className="mt-1 text-sm text-gray-500">
              {users.length === 0 
                ? "Commencez par créer un nouvel utilisateur." 
                : "Essayez d'ajuster votre recherche ou vos critères de filtre."}
            </p>
            {users.length === 0 && (
              <div className="mt-6">
                <button
                  onClick={handleCreateUser}
                  className="inline-flex items-center px-4 py-4 border border-transparent shadow-sm text-sm font-medium  text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-offset-2 focus:ring-gray-600"
                >
                  Créer un nouvel utilisateur
                </button>
              </div>
            )}
          </div>
        )}

        {/* Compteur d'utilisateurs */}
        {filteredUsers.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              Affichage de {filteredUsers.length} utilisateurs sur {users.length}
            </p>
          </div>
        )}
      </div>

      {/* Modale d'utilisateur */}
      {showModal && (
        <UserModal
          user={editingUser}
          onClose={handleCloseModal}
          onSave={handleSaveUser}
        />
      )}
    </div>
  );
};

export default UserManagement;
