"use client"
import { useState, useCallback, useEffect, useRef } from 'react';
import { useAlert } from '../../../components/AlertContext';

interface BusinessInfo {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  vatNumber: string;
}

interface ReceiptContent {
  thankYouMessage: string;
  returnPolicy: string;
}



interface TemplateData {
  business_name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  tax_number: string;
  thank_you_message: string;
  return_policy: string;
  loyalty_ratio: number;
  loyalty_min_points: number;
  loyalty_points_value: number;
  ticket_reset_period: 'none' | 'weekly' | 'monthly';
  logo_path?: string;
  logo_url?: string;
  deletion_secret_code?: string;
  deletion_barcode_1?: string;
  deletion_barcode_2?: string;
  deletion_barcode_3?: string;
  deletion_barcode_4?: string;
  deletion_barcode_5?: string;
  deletion_barcode_6?: string;
  deletion_barcode_7?: string;
  deletion_barcode_8?: string;
  deletion_barcode_9?: string;
  deletion_barcode_10?: string;
}

export default function ReceiptTemplateEditor() {
  const { showAlert } = useAlert();
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    companyName: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    vatNumber: '',
  });

  const [receiptContent, setReceiptContent] = useState<ReceiptContent>({
    thankYouMessage: '',
    returnPolicy: '',
  });
  const [loyaltyRatio, setLoyaltyRatio] = useState<number>(10);
  const [loyaltyMinPoints, setLoyaltyMinPoints] = useState<number>(100);
  const [loyaltyPointsValue, setLoyaltyPointsValue] = useState<number>(30.00);
  const [ticketResetPeriod, setTicketResetPeriod] = useState<'none' | 'weekly' | 'monthly'>('none');



  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [existingLogoPath, setExistingLogoPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [logoDeleted, setLogoDeleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get auth token
  const getAuthToken = () => {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  };

  // Load current template on component mount
  useEffect(() => {
    loadCurrentTemplate();
  }, []);

  const loadCurrentTemplate = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = getAuthToken();
      if (!token) {
        setError('Authentication required. Please log in.');
        setIsLoading(false);
        return;
      }

      const response = await fetch('http://localhost:4000/api/templates/current', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const template: TemplateData = await response.json();
        setBusinessInfo({
          companyName: template.business_name || '',
          address: template.address || '',
          phone: template.phone || '',
          email: template.email || '',
          website: template.website || '',
          vatNumber: template.tax_number || '',
        });
        setReceiptContent({
          thankYouMessage: template.thank_you_message || '',
          returnPolicy: template.return_policy || '',
        });
        setLoyaltyRatio(template.loyalty_ratio || 10);
        setLoyaltyMinPoints(template.loyalty_min_points || 100);
        setLoyaltyPointsValue(template.loyalty_points_value || 30.00);
        setTicketResetPeriod(template.ticket_reset_period || 'none');
        
        // Set existing logo path if available
        if (template.logo_url) {
          setExistingLogoPath(template.logo_url);
        } else if (template.logo_path) {
          setExistingLogoPath(`http://localhost:4000/${template.logo_path}`);
        }
      } else if (response.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else if (response.status === 403) {
        window.location.href = '/403';
      } else {
        setError('Failed to load template');
      }
    } catch (error) {
      console.error('Failed to load template:', error);
      setError('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
      setLogoDeleted(false);
    }
  };

  const handleBusinessInfoChange = useCallback((field: keyof BusinessInfo, value: string) => {
    setBusinessInfo(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleReceiptContentChange = useCallback((field: keyof ReceiptContent, value: string) => {
    setReceiptContent(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      // Validate file size (2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError('File size must be less than 2MB');
        return;
      }

      setLogoFile(file);
      setLogoDeleted(false);
      setError(null);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setExistingLogoPath(null);
    setLogoDeleted(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveTemplate = async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      const token = getAuthToken();
      if (!token) {
        setError('Authentication required. Please log in.');
        return;
      }

      const formData = new FormData();
      
      // Append business info with correct field names for backend
      formData.append('business_name', businessInfo.companyName);
      formData.append('address', businessInfo.address);
      formData.append('phone', businessInfo.phone);
      formData.append('email', businessInfo.email);
      formData.append('website', businessInfo.website);
      formData.append('tax_number', businessInfo.vatNumber);
      
      // Append receipt content
      formData.append('thank_you_message', receiptContent.thankYouMessage);
      formData.append('return_policy', receiptContent.returnPolicy);
      formData.append('loyalty_ratio', loyaltyRatio.toString());
      formData.append('loyalty_min_points', loyaltyMinPoints.toString());
      formData.append('loyalty_points_value', loyaltyPointsValue.toString());
      formData.append('ticket_reset_period', ticketResetPeriod);
      formData.append('logo_deleted', logoDeleted.toString());

      // Append logo file if selected
      if (logoFile) {
        formData.append('logo', logoFile);
      }

      const response = await fetch('http://localhost:4000/api/templates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        showAlert('Template saved successfully!', 'success');
        // Reset logo state after successful save
        setLogoFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        // Reload to get the updated template
        await loadCurrentTemplate();
      } else if (response.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else if (response.status === 403) {
        window.location.href = '/403';
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save template');
      }
    } catch (error) {
      console.error('Save error:', error);
      setError(error instanceof Error ? error.message : 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white p-10 text-gray-800 flex items-center justify-center">
        <div className="text-lg">Loading template...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-10 text-gray-800">
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <div className="text-red-600 text-sm">{error}</div>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Left Panel - Form */}
        <div className="space-y-8">
          {/* Business Information */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Renseignement Commercial</h2>
            <div className="space-y-4">
              <BusinessInfoFields
                businessInfo={businessInfo}
                onChange={handleBusinessInfoChange}
              />
            </div>
          </div>

          {/* Business Logo */}
          <LogoUploadSection
            onLogoChange={handleLogoChange}
            onRemoveLogo={handleRemoveLogo}
            logoPreview={logoPreview}
            existingLogoPath={existingLogoPath}
            fileInputRef={fileInputRef}
          />

          {/* Receipt Content */}
          <ReceiptContentFields
            receiptContent={receiptContent}
            onChange={handleReceiptContentChange}
            loyaltyRatio={loyaltyRatio}
            onLoyaltyRatioChange={setLoyaltyRatio}
            loyaltyMinPoints={loyaltyMinPoints}
            onLoyaltyMinPointsChange={setLoyaltyMinPoints}
            loyaltyPointsValue={loyaltyPointsValue}
            onLoyaltyPointsValueChange={setLoyaltyPointsValue}
            ticketResetPeriod={ticketResetPeriod}
            onTicketResetPeriodChange={setTicketResetPeriod}
          />



          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <button
              onClick={handleSaveTemplate}
              disabled={isSaving}
              className="px-6 py-4 bg-gray-800 text-white text-sm hover:bg-gray-900 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </div>

        {/* Right Panel - Preview */}
        <ReceiptPreview
          businessInfo={businessInfo}
          receiptContent={receiptContent}
          logoPreview={logoPreview}
          existingLogoPath={existingLogoPath}
        />
      </div>
    </div>
  );
}

// Sub-components (keep the same as before)
const BusinessInfoFields: React.FC<{
  businessInfo: BusinessInfo;
  onChange: (field: keyof BusinessInfo, value: string) => void;
}> = ({ businessInfo, onChange }) => (
  <>
    {[
      { key: 'companyName' as const, label: 'Nom de l\'entreprise', value: businessInfo.companyName },
      { key: 'address' as const, label: 'Adresse', value: businessInfo.address },
      { key: 'phone' as const, label: 'Numéro de téléphone', value: businessInfo.phone },
      { key: 'email' as const, label: 'Email', value: businessInfo.email },
      { key: 'website' as const, label: 'Website', value: businessInfo.website },
      { key: 'vatNumber' as const, label: 'Numéro de TVA', value: businessInfo.vatNumber },
    ].map(({ key, label, value }) => (
      <div key={key}>
        <label className="block text-sm font-medium mb-1">{label}</label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(key, e.target.value)}
          className="w-full border border-gray-300 px-3 py-4 text-sm focus:ring-1 focus:ring-gray-500 focus:outline-none"
        />
      </div>
    ))}
  </>
);

interface LogoUploadSectionProps {
  onLogoChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveLogo: () => void;
  logoPreview: string | null;
  existingLogoPath: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

const LogoUploadSection: React.FC<LogoUploadSectionProps> = ({
  onLogoChange,
  onRemoveLogo,
  logoPreview,
  existingLogoPath,
  fileInputRef
}) => {
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Logo d'entreprise</h2>
      <div className="flex items-center gap-4">
        <div 
          className="bg-gray-50 border-2 border-dashed border-gray-300 p-4 cursor-pointer hover:bg-gray-100 "
          onClick={handleClick}
        >
          <div className="w-20 h-20 flex items-center justify-center bg-gray-100 overflow-hidden">
            {logoPreview || existingLogoPath ? (
              <img 
                src={logoPreview || existingLogoPath || ''} 
                alt="Company logo" 
                className="w-full h-full object-contain"
              />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
          </div>
        </div>
        <div className="flex-1">
          <input
            type="file"
            ref={fileInputRef}
            onChange={onLogoChange}
            accept="image/*"
            className="hidden"
          />
          <div className="text-sm text-gray-600 mb-2">
            Télécharger le logo (Max 2MB)
            <br />
            <span className="text-xs">Formats supportés: JPG, PNG, GIF</span>
          </div>
          {(logoPreview || existingLogoPath) && (
            <button
              type="button"
              onClick={onRemoveLogo}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Supprimer le logo
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const ReceiptContentFields: React.FC<{
  receiptContent: ReceiptContent;
  onChange: (field: keyof ReceiptContent, value: string) => void;
  loyaltyRatio: number;
  onLoyaltyRatioChange: (value: number) => void;
  loyaltyMinPoints: number;
  onLoyaltyMinPointsChange: (value: number) => void;
  loyaltyPointsValue: number;
  onLoyaltyPointsValueChange: (value: number) => void;
  ticketResetPeriod: 'none' | 'weekly' | 'monthly';
  onTicketResetPeriodChange: (value: 'none' | 'weekly' | 'monthly') => void;
}> = ({ 
  receiptContent, 
  onChange, 
  loyaltyRatio, 
  onLoyaltyRatioChange,
  loyaltyMinPoints,
  onLoyaltyMinPointsChange,
  loyaltyPointsValue,
  onLoyaltyPointsValueChange,
  ticketResetPeriod,
  onTicketResetPeriodChange,
}) => (
  <div className="space-y-8">
    <div>
      <h2 className="text-xl font-semibold mb-4">Programme de Fidélité</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Ratio de Fidélité (1 point par X DT dépensés)</label>
          <div className="flex items-center gap-4">
            <input
              type="number"
              value={loyaltyRatio}
              onChange={(e) => onLoyaltyRatioChange(parseInt(e.target.value) || 0)}
              className="w-32 border border-gray-300 px-3 py-4 text-sm focus:ring-1 focus:ring-gray-500 focus:outline-none"
              min="1"
            />
            <span className="text-sm text-gray-500 italic">Exemple: Si vous mettez 10, le client gagne 1 point pour chaque 10 DT.</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Points minimum pour échange</label>
            <input
              type="number"
              value={loyaltyMinPoints}
              onChange={(e) => onLoyaltyMinPointsChange(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-300 px-3 py-4 text-sm focus:ring-1 focus:ring-gray-500 focus:outline-none"
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Valeur de l'échange (DT)</label>
            <input
              type="number"
              value={loyaltyPointsValue}
              onChange={(e) => onLoyaltyPointsValueChange(parseFloat(e.target.value) || 0)}
              className="w-full border border-gray-300 px-3 py-4 text-sm focus:ring-1 focus:ring-gray-500 focus:outline-none"
              min="0.001"
              step="0.001"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Réinitialisation des tickets</label>
          <div className="flex items-center gap-4">
            <select
              value={ticketResetPeriod}
              onChange={(e) => onTicketResetPeriodChange(e.target.value as 'none' | 'weekly' | 'monthly')}
              className="w-full border border-gray-300 px-3 py-4 text-sm focus:ring-1 focus:ring-gray-500 focus:outline-none"
            >
              <option value="none">Aucune (Continu)</option>
              <option value="weekly">Hebdomadaire (Chaque Lundi)</option>
              <option value="monthly">Mensuelle (Chaque 1er du mois)</option>
            </select>
          </div>
          <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-tighter">
            Définit quand le numéro de ticket repasse à 1.
          </p>
        </div>
        <p className="text-sm text-gray-600 bg-blue-50 p-4 border-l-4 border-blue-400">
          💡 Configuration actuelle : Le client peut échanger {loyaltyMinPoints} points contre une remise de {loyaltyPointsValue.toFixed(3)} DT sur sa commande.
        </p>
      </div>
    </div>

    <div>
      <h2 className="text-xl font-semibold mb-4">Infos Ticket (Bas de page)</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Message de remerciement</label>
          <textarea
            value={receiptContent.thankYouMessage}
            onChange={(e) => onChange('thankYouMessage', e.target.value)}
            className="w-full border border-gray-300 px-3 py-4 text-sm h-16 focus:ring-1 focus:ring-gray-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Politique de retour</label>
          <textarea
            value={receiptContent.returnPolicy}
            onChange={(e) => onChange('returnPolicy', e.target.value)}
            className="w-full border border-gray-300 px-3 py-4 text-sm h-16 focus:ring-1 focus:ring-gray-500 focus:outline-none"
          />
        </div>
      </div>
    </div>
  </div>
);



interface ReceiptPreviewProps {
  businessInfo: BusinessInfo;
  receiptContent: ReceiptContent;
  logoPreview?: string | null;
  existingLogoPath?: string | null;
}

const ReceiptPreview: React.FC<ReceiptPreviewProps> = ({ 
  businessInfo, 
  receiptContent, 
  logoPreview, 
  existingLogoPath 
}) => {
  const currentDate = new Date().toLocaleDateString('fr-FR');
  const currentTime = new Date().toLocaleTimeString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div className="lg:sticky lg:top-10 self-start h-fit">
      <h2 className="text-xl font-semibold mb-4">Aperçu en Direct</h2>
      <div className="border border-gray-300 p-6 w-full max-w-sm mx-auto bg-white shadow-sm">
        {/* Logo */}
        <div className="flex flex-col items-center text-center mb-4">
          <div className="w-12 h-12  mb-2 bg-gray-50 overflow-hidden flex items-center justify-center">
            {logoPreview || existingLogoPath ? (
              <img 
                src={logoPreview || existingLogoPath || ''} 
                alt="Company logo" 
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <span className="text-xs text-gray-400">Logo</span>
              </div>
            )}
          </div>
          <h3 className="font-semibold">{businessInfo.companyName || 'Receiptify Corp.'}</h3>
          <p className="text-xs text-gray-600 leading-4">
            {businessInfo.address || '123 Main St, Anytown, CA 90210'}<br/>
            {businessInfo.phone || '(555) 123-4567'}<br/>
            {businessInfo.email || 'support@receiptify.com'}<br/>
            {businessInfo.website || 'www.receiptify.com'}<br/>
            N° de TVA : {businessInfo.vatNumber.replace('TAX-ID: ', '') || '987654321'}
          </p>
        </div>

        <hr className="my-4 border-gray-200" />
        
        {/* Date/Time */}
        <div className="text-xs mb-3">
          <div className="flex justify-between">
            <span className="font-semibold">Date:</span> 
            <span>{currentDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Heure:</span> 
            <span>{currentTime}</span>
          </div>
        </div>

        <hr className="my-4 border-gray-200" />
        
        {/* Items */}
        <div className="text-xs">
          <p className="font-semibold mb-1">Articles</p>
          <div className="border-t border-dotted border-gray-400 my-1"></div>
          <div className="flex justify-between"><span>Produit A (1x)</span><span>25,00</span></div>
          <div className="flex justify-between"><span>Service B (2x)</span><span>31,00</span></div>
          <div className="flex justify-between"><span>Produit C (1x)</span><span>5,25</span></div>
          <div className="border-t border-dotted border-gray-400 my-2"></div>
          <div className="flex justify-between"><span>Sous-total :</span><span>61,25</span></div>
          <div className="flex justify-between"><span>Taxe (8 %) :</span><span>4,90</span></div>
          <div className="border-t border-gray-300 my-2"></div>
          <div className="flex justify-between font-semibold text-sm"><span>TOTAL :</span><span>66,15</span></div>
        </div>

        <div className="mt-4 text-center text-xs text-gray-700 italic">
          {receiptContent.thankYouMessage || 'Merci pour votre achat !'}<br/>
          <span className="not-italic">{receiptContent.returnPolicy || 'Retours acceptés dans un délai d\'un jour avec le reçu original. Certaines exclusions s\'appliquent.'}</span>
        </div>
      </div>
    </div>
  );
};
