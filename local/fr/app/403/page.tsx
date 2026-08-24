// components/Forbidden.tsx
"use client"
import React from 'react';

const Forbidden: React.FC = () => {
  const handleGoBack = () => {
    window.history.back();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-center py-16">
          <div className="text-center max-w-md">
            {/* Icône */}
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                className="bi bi-shield-lock-fill w-8 h-8 text-red-600"
                viewBox="0 0 16 16"
              >
                <path
                  fillRule="evenodd"
                  d="M8 0c-.69 0-1.843.265-2.928.56-1.11.3-2.229.655-2.887.87a1.54 1.54 0 0 0-1.044 1.262c-.596 4.477.787 7.795 2.465 9.99a11.777 11.777 0 0 0 2.517 2.453c.386.273.744.482 1.048.625.28.132.581.24.829.24s.548-.108.829-.24a7.159 7.159 0 0 0 1.048-.625 11.775 11.775 0 0 0 2.517-2.453c1.678-2.195 3.061-5.513 2.465-9.99a1.541 1.541 0 0 0-1.044-1.263 62.467 62.467 0 0 0-2.887-.87C9.843.266 8.69 0 8 0zm0 5a1.5 1.5 0 0 1 .5 2.915l.5 1.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5l.5-1.5A1.5 1.5 0 0 1 8 5z"
                />
              </svg>
            </div>

            {/* Titre */}
            <h2 className="text-3xl font-semibold text-gray-900 mb-4">Accès Refusé</h2>

            {/* Message */}
            <p className="text-gray-600 mb-2">
              Vous n'avez pas l'autorisation d'accéder à cette page.
            </p>
            <p className="text-gray-500 text-sm mb-8">
              Veuillez contacter votre administrateur si vous pensez qu'il s'agit d'une erreur.
            </p>

            {/* Actions */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleGoBack}
                className="border border-gray-300 text-gray-700 px-4 py-2 text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-600"
              >
                Retour
              </button>
              <button
                onClick={handleGoHome}
                className="bg-gray-600 text-white px-4 py-2 text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-600"
              >
                Page d'Accueil
              </button>
            </div>

            {/* Aide supplémentaire */}
            <div className="mt-8 p-4 bg-gray-50 rounded border border-gray-200">
              <p className="text-xs text-gray-500">
                <strong>Besoin d'aide ?</strong> Contactez votre administrateur système ou vérifiez vos permissions utilisateur.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Forbidden;