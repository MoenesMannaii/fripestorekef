import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CheckCircle, AlertTriangle, Info, X, HelpCircle } from 'lucide-react';

type AlertType = 'info' | 'success' | 'error' | 'warning';

interface AlertState {
  isOpen: boolean;
  message: string;
  type: AlertType;
}

interface ConfirmState {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

interface AlertContextProps {
  showAlert: (message: string, type?: AlertType) => void;
  hideAlert: () => void;
  showConfirm: (message: string) => Promise<boolean>;
}

const AlertContext = createContext<AlertContextProps | undefined>(undefined);

export const AlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [alertState, setAlertState] = useState<AlertState>({
    isOpen: false,
    message: '',
    type: 'info',
  });
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    message: '',
    onConfirm: () => {},
    onCancel: () => {},
  });

  const showAlert = (message: string, type: AlertType = 'info') => {
    setAlertState({ isOpen: true, message, type });
  };

  const hideAlert = () => {
    setAlertState(prev => ({ ...prev, isOpen: false }));
  };

  const showConfirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        message,
        onConfirm: () => {
          setConfirmState(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setConfirmState(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        }
      });
    });
  };

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert, showConfirm }}>
      {children}

      {/* Global Alert Modal */}
      {alertState.isOpen && (
        <div className="fixed inset-0 z-9999 bg-black/60  flex items-center justify-center p-4">
          <div 
            className="bg-white max-w-md w-full p-6 transform  flex flex-col items-center text-center    "
          >
            <div className="mb-4">
              {alertState.type === 'success' && <CheckCircle className="w-12 h-12 text-green-500" />}
              {alertState.type === 'error' && <X className="w-12 h-12 text-red-500 bg-red-100 rounded-full p-1" />}
              {alertState.type === 'warning' && <AlertTriangle className="w-12 h-12 text-yellow-500" />}
              {alertState.type === 'info' && <Info className="w-12 h-12 text-blue-500" />}
            </div>
            
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {alertState.type === 'error' ? 'Erreur' : 
               alertState.type === 'success' ? 'Succès' : 
               alertState.type === 'warning' ? 'Attention' : 'Information'}
            </h3>
            
            <p className="text-sm text-gray-600 mb-6">{alertState.message}</p>
            
            <button
              onClick={hideAlert}
              className="w-full py-4 px-4 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-none  focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
            >
              Compris
            </button>
          </div>
        </div>
      )}

      {/* Global Confirm Modal */}
      {confirmState.isOpen && (
        <div className="fixed inset-0 z-9999 bg-black/60  flex items-center justify-center p-4">
          <div 
            className="bg-white max-w-md w-full p-6 transform  flex flex-col items-center text-center    "
          >
            <div className="mb-4">
              <HelpCircle className="w-12 h-12 text-blue-500" />
            </div>
            
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Confirmation
            </h3>
            
            <p className="text-sm text-gray-600 mb-6">{confirmState.message}</p>
            
            <div className="flex w-full gap-3">
              <button
                onClick={confirmState.onCancel}
                className="w-1/2 py-4 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-none  focus:ring-2 focus:ring-gray-200 focus:ring-offset-2"
              >
                Annuler
              </button>
              <button
                onClick={confirmState.onConfirm}
                className="w-1/2 py-4 px-4 bg-gray-700 hover:bg-gray-800 text-white font-medium rounded-none  focus:ring-1 focus:ring-gray-900 focus:ring-offset-2"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

