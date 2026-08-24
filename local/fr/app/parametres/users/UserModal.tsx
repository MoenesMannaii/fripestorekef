"use client";
import React, { useState, useEffect, useRef } from "react";
import Select from 'react-select';

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: "admin" | "worker";
}

interface UserModalProps {
  user: User | null;
  onClose: () => void;
  onSave: (userData: any) => void;
}

interface SelectOption {
  value: string;
  label: string;
}

const UserModal: React.FC<UserModalProps> = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    pin: "",
    role: "worker" as "admin" | "worker",
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const modalRef = useRef<HTMLDivElement>(null);

  // Role options for React-Select
  const roleOptions: SelectOption[] = [
    { value: "worker", label: "Employé" },
    { value: "admin", label: "Administrateur" },
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
      minHeight: '53px',
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
    if (user) {
      setFormData({
        name: user.name,
        email: user.email || "",
        phone: user.phone || "",
        password: "",
        pin: "",
        role: user.role,
      });
    } else {
      setFormData({
        name: "",
        email: "",
        phone: "",
        password: "",
        pin: "",
        role: "worker",
      });
    }
    setErrors({});
  }, [user]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Le nom est requis";
    }

    if (!user && !formData.password) {
      newErrors.password = "Le mot de passe est requis pour les nouveaux utilisateurs";
    }

    if (formData.password && formData.password.length < 6) {
      newErrors.password = "Le mot de passe doit contenir au moins 6 caractères";
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Veuillez saisir une adresse email valide";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    const submitData: any = {
      name: formData.name.trim(),
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      role: formData.role,
    };

    if (formData.password.trim()) submitData.password = formData.password;
    if (formData.pin.trim()) submitData.pin = formData.pin;

    try {
      await onSave(submitData);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de l'utilisateur:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    // Effacer l'erreur lorsque l'utilisateur commence à taper
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleRoleChange = (newValue: SelectOption | null) => {
    if (newValue) {
      setFormData((prev) => ({
        ...prev,
        role: newValue.value as "admin" | "worker",
      }));
    }
  };

  const getSelectedRoleOption = () => {
    return roleOptions.find(option => option.value === formData.role) || roleOptions[0];
  };

  const canSubmit =
    formData.name.trim() !== "" && (user ? true : formData.password.trim() !== "");

  return (
    <div
      className="fixed inset-0 bg-white flex items-center justify-center p-4 z-50"
      aria-modal="true"
      role="dialog"
      aria-labelledby="modal-title"
      ref={modalRef}
    >
      <div className="bg-white w-full max-w-3xl shadow-lg ring-1 ring-gray-500  max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b px-6 py-4 sticky top-0 bg-white">
          <h2
            id="modal-title"
            className="text-xl font-semibold text-gray-900 select-none"
          >
            {user ? "Modifier l'utilisateur" : "Créer un nouvel utilisateur"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-600 p-1 rounded-none"
            disabled={loading}
            aria-label="Fermer la modale"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block mb-1 text-sm font-medium text-gray-700"
            >
              Nom <span className="text-red-600">*</span>
            </label>
            <input
              id="name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              disabled={loading}
              className={`w-full border px-3 py-4 text-sm rounded-none placeholder-gray-400 focus:outline-none focus:ring-1 disabled:bg-gray-100 transition ${
                errors.name 
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500" 
                  : "border-gray-300 focus:border-gray-600 focus:ring-gray-600"
              }`}
              placeholder="Nom complet"
              autoComplete="name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="email"
              className="block mb-1 text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              className={`w-full border px-3 py-4 text-sm rounded-none placeholder-gray-400 focus:outline-none focus:ring-1 disabled:bg-gray-100 transition ${
                errors.email 
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500" 
                  : "border-gray-300 focus:border-gray-600 focus:ring-gray-600"
              }`}
              placeholder="exemple@exemple.com"
              autoComplete="email"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="phone"
              className="block mb-1 text-sm font-medium text-gray-700"
            >
              Téléphone
            </label>
            <input
              id="phone"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              disabled={loading}
              className="w-full border border-gray-300 px-3 py-4 text-sm rounded-none placeholder-gray-400 focus:border-gray-600 focus:ring-1 focus:ring-gray-600 disabled:bg-gray-100 outline-none transition"
              placeholder="+33123456789"
              autoComplete="tel"
            />
          </div>

          <div>
            <label
              htmlFor="pin"
              className="block mb-1 text-sm font-medium text-gray-700"
            >
              Code PIN
            </label>
            <input
              id="pin"
              type="text"
              name="pin"
              value={formData.pin}
              onChange={handleChange}
              disabled={loading}
              className="w-full border border-gray-300 px-3 py-4 text-sm rounded-none placeholder-gray-400 focus:border-gray-600 focus:ring-1 focus:ring-gray-600 disabled:bg-gray-100 outline-none transition"
              placeholder="Code PIN"
            />
          </div>

          <div>
            <label
              htmlFor="role"
              className="block mb-1 text-sm font-medium text-gray-700"
            >
              Rôle
            </label>
            <Select
              value={getSelectedRoleOption()}
              onChange={handleRoleChange}
              options={roleOptions}
              styles={customSelectStyles}
              isSearchable={false}
              isDisabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500">
              Les utilisateurs administrateurs ont un accès complet pour gérer le système
            </p>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block mb-1 text-sm font-medium text-gray-700"
            >
              {user ? "Nouveau mot de passe (laisser vide pour garder l'actuel)" : "Mot de passe *"}
            </label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required={!user}
              disabled={loading}
              className={`w-full border px-3 py-4 text-sm rounded-none placeholder-gray-400 focus:outline-none focus:ring-1 disabled:bg-gray-100 transition ${
                errors.password 
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500" 
                  : "border-gray-300 focus:border-gray-600 focus:ring-gray-600"
              }`}
              placeholder={user ? "Entrer le nouveau mot de passe" : "Entrer le mot de passe"}
              autoComplete={user ? "new-password" : "password"}
              minLength={6}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
            {!errors.password && (
              <p className="mt-1 text-xs text-gray-500">
                Le mot de passe doit contenir au moins 6 caractères
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-300">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 border border-gray-300 text-gray-700 px-4 py-4 text-sm font-medium rounded-none hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-600 disabled:opacity-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!canSubmit || loading}
              className={`flex-1 bg-gray-600 text-white px-4 py-4 text-sm font-medium rounded-none hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-600 disabled:opacity-50 transition flex justify-center items-center min-h-[44px]`}
            >
              {loading ? (
                <svg
                  className=" h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-label="Indicateur de chargement"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  ></path>
                </svg>
              ) : user ? (
                "Mettre à jour l'utilisateur"
              ) : (
                "Créer l'utilisateur"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;
