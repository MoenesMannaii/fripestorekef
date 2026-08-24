"use client";
import React, { useState, useEffect } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'worker';
  pin?: string;
  created_at: string;
}

interface UserFormData {
  name: string;
  email: string;
  phone: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const UserProfile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

  // Fetch current user data on component mount
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:4000/api/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setFormData(prev => ({
          ...prev,
          name: data.user.name,
          email: data.user.email || '',
          phone: data.user.phone || ''
        }));
      } else {
        throw new Error('Failed to fetch user data');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setMessage('Error loading user data');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('authToken');
      const updateData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone
      };

      const response = await fetch('http://localhost:4000/api/users/me', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setMessage('Profile updated successfully!');
      } else {
        const error = await response.json();
        setMessage(`Error: ${error.message}`);
      }
    } catch (error) {
      setMessage('Error updating profile');
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

const handlePasswordUpdate = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setMessage('');

  if (formData.newPassword !== formData.confirmPassword) {
    setMessage('New passwords do not match');
    setLoading(false);
    return;
  }

  try {
    const token = localStorage.getItem('authToken');
    const updateData = {
      currentPassword: formData.currentPassword, // Make sure this is included
      newPassword: formData.newPassword
    };

    const response = await fetch('http://localhost:4000/api/users/me', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    if (response.ok) {
      setMessage('Password updated successfully!');
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } else {
      const error = await response.json();
      setMessage(`Error: ${error.message}`);
    }
  } catch (error) {
    setMessage('Error updating password');
    console.error('Error updating password:', error);
  } finally {
    setLoading(false);
  }
};

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto my-10 p-6">
        <div className="">Loading user data...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto my-10">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'profile'
                ? 'border-gray-600 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Personal Information
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'password'
                ? 'border-gray-600 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Password Management
          </button>
        </nav>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`p-4 rounded-md mb-6 ${
          message.includes('Error') 
            ? 'bg-red-100 text-red-700 border border-red-200' 
            : 'bg-green-100 text-green-700 border border-green-200'
        }`}>
          {message}
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="border border-gray-200 p-6 bg-white">
          <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage your personal details.
          </p>

          <form onSubmit={handleProfileUpdate} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input 
                type="text" 
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 px-3 py-4 text-sm text-gray-800 focus:ring-1 focus:ring-gray-500 focus:border-gray-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email Address</label>
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 px-3 py-4 text-sm text-gray-800 focus:ring-1 focus:ring-gray-500 focus:border-gray-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input 
                type="text" 
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 px-3 py-4 text-sm text-gray-800 focus:ring-1 focus:ring-gray-500 focus:border-gray-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <div className="relative w-full inline-block">
                <select
                  value={user.role}
                  disabled
                  className="appearance-none border border-gray-300 text-gray-700 bg-gray-100 px-4 py-4 pr-10 text-sm w-full cursor-not-allowed"
                >
                  <option>Admin</option>
                  <option>Worker</option>
                </select>
                <svg
                  className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <p className="text-xs text-gray-500 mt-1">Role cannot be changed</p>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium px-5 py-4 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <div className="border border-gray-200 p-6 bg-white">
          <h2 className="text-xl font-semibold text-gray-900">Password Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Update your account password.
          </p>

          <form onSubmit={handlePasswordUpdate} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Current Password</label>
              <div className="relative mt-1">
                <input 
                  type={showCurrentPassword ? "text" : "password"}
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleInputChange}
                  required
                  className="block w-full border border-gray-300 px-3 py-4 text-sm text-gray-800 focus:ring-1 focus:ring-gray-500 focus:border-gray-500 outline-none pr-10"
                />
                <button 
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">New Password</label>
              <div className="relative mt-1">
                <input 
                  type={showNewPassword ? "text" : "password"}
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  required
                  className="block w-full border border-gray-300 px-3 py-4 text-sm text-gray-800 focus:ring-1 focus:ring-gray-500 focus:border-gray-500 outline-none pr-10"
                />
                <button 
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
              <div className="relative mt-1">
                <input 
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  className="block w-full border border-gray-300 px-3 py-4 text-sm text-gray-800 focus:ring-1 focus:ring-gray-500 focus:border-gray-500 outline-none pr-10"
                />
                <button 
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium px-5 py-4 disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
