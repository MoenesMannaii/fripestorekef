import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className=" rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600 text-sm sm:text-base">Chargement des statistiques...</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
