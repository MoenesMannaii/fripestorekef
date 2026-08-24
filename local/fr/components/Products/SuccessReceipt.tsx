"use client";
import { Printer } from 'lucide-react';


import { useState, useEffect, useRef } from "react";

interface CartItem {
  remise_percentage?: number;
  id: string | number;
  name: string;
  quantity: number;
  price: number;
  stock: number;
  barcode?: string;
  category?: string;
  original_product_price?: number;
  is_sub_unit?: boolean;
  has_remise?: boolean;
  ticket_number?: number;
  pieces_per_box?: number;
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
  logo_url?: string;
  logo_path?: string;
}

interface SuccessReceiptProps {
  order: any;
  cartItems: CartItem[];
  onPrintTicket: () => void;
  onCancelOperation: () => void;
  client?: any | null;
}

export default function SuccessReceipt({
  order,
  cartItems,
  onPrintTicket,
  onCancelOperation,
  client
}: SuccessReceiptProps) {
  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(1);
  const [isPrinting, setIsPrinting] = useState(false);
  const [hasPrinted, setHasPrinted] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null); // Separate error for printing
  const printExecutedRef = useRef(false);

  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString("fr-FR");
  const formattedTime = currentDate.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Load template data
  useEffect(() => {
    loadTemplate();
  }, []);

  // Auto-print countdown - ONLY ONCE
  useEffect(() => {
    if (hasPrinted || printExecutedRef.current) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoPrint();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasPrinted]);

  // 🖨️ REAL PRINT FUNCTION - WITH BETTER ERROR HANDLING
  const handleAutoPrint = async () => {
    if (hasPrinted || printExecutedRef.current) {
      console.log('🛑 Print already executed, skipping');
      return;
    }

    printExecutedRef.current = true;
    setIsPrinting(true);
    setHasPrinted(true);
    setPrintError(null); // Clear previous print errors

    try {
      console.log('🖨️ Sending print request...');
      console.log('📦 Cart items:', cartItems);
      console.log('💰 Order:', order);

      const response = await fetch("http://localhost:4000/api/print", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order: order || {},
          cartItems: cartItems || []
        }),
      });

      const result = await response.json();
      console.log('📄 Print response:', result);

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || 'Print failed');
      }

      console.log('✅ Print request successful');

      // Success - close immediately
      onPrintTicket();

    } catch (err) {
      console.error("❌ Error printing receipt:", err);
      const errorMessage = err instanceof Error ? err.message : 'Printing failed';
      setPrintError(errorMessage);
    } finally {
      setIsPrinting(false);
    }
  };

  const loadTemplate = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token =
        localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
      if (!token) {
        setError("Authentication required");
        setIsLoading(false);
        return;
      }

      const response = await fetch(
        "http://localhost:4000/api/templates/current",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const templateData: TemplateData = await response.json();
        setTemplate(templateData);
      } else {
        console.warn('No template found, using default');
        setTemplate(getDefaultTemplate());
      }
    } catch (error) {
      console.error("Failed to load template:", error);
      setTemplate(getDefaultTemplate());
    } finally {
      setIsLoading(false);
    }
  };

  const getDefaultTemplate = (): TemplateData => ({
    business_name: "Nom de l'entreprise",
    address: "Adresse Line",
    phone: "+216 28-888-XXX",
    email: "",
    website: "",
    tax_number: "",
    thank_you_message: "Merci pour votre achat !",
    return_policy:
      "Retours acceptés dans un délai d'un jour avec le reçu original.",
  });

  const displayItems = order?.OrderItems || cartItems;

  const subtotal = displayItems.reduce(
    (sum: number, item: any) => sum + (item.unit_price || item.price || 0) * item.quantity,
    0
  );

  const totalRemise = displayItems.reduce(
    (sum: number, item: any) => {
      const originalPrice = item.original_unit_price || item.unit_price || item.price || 0;
      const currentPrice = item.unit_price || item.price || 0;
      return sum + (originalPrice - currentPrice) * item.quantity;
    },
    0
  );

  const total = subtotal;
  const pointsDiscount = parseFloat(order?.points_discount || 0);
  const amountToPay = total - pointsDiscount;
  const paidAmount = order?.paid_amount || amountToPay;
  const change = paidAmount - amountToPay;

  const getLogoUrl = () => {
    if (template?.logo_url) return template.logo_url;
    if (template?.logo_path) return `http://localhost:4000/${template.logo_path}`;
    return null;
  };

  if (isLoading) {
    return (
      <div className="w-full bg-white shadow rounded p-4 h-full flex justify-center items-center">
        <div className="text-lg uppercase font-black px-4 py-2 border-2 border-gray-900">
          Template...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white shadow rounded p-4 h-full flex flex-col relative">
      {isPrinting && (
        <div className="absolute inset-0 bg-white z-0 flex flex-col items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Printer className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Impression en cours...
            </h3>
            <p className="text-sm text-gray-600">
              Veuillez patienter pendant l'impression du ticket
            </p>
          </div>
        </div>
      )}


      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-500 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-green-200">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-10 h-10 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">
          Vente Terminée !
        </h1>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-2 px-2 py-1 bg-gray-50 inline-block rounded">
          Ticket #{(order?.ticket_number || order?.id || '---').toString().padStart(6, '0')}
        </p>
      </div>

      {/* RECEIPT PREVIEW */}
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white border border-gray-300 rounded-lg p-4">
          {/* Header */}
          <div className="text-center mb-4">
            <div className="w-12 h-12 border border-gray-200 rounded-md mb-2 bg-gray-50 overflow-hidden flex items-center justify-center mx-auto">
              {getLogoUrl() ? (
                <img
                  src={getLogoUrl() || ""}
                  alt="Logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                  <Printer />
                </div>
              )}
            </div>
            <p className="font-semibold text-sm">
              {template?.business_name || "Nom de l'entreprise"}
            </p>
            <p className="text-xs text-gray-600">
              {template?.address && <>{template.address}<br /></>}
              {template?.phone && <>{template.phone}<br /></>}
              {template?.email && <>{template.email}<br /></>}
              {template?.website && <>{template.website}<br /></>}
            </p>
          </div>

          {/* Client Info */}
          {client && (
            <div className="bg-indigo-50 p-2 mb-3 border border-indigo-100 rounded text-[10px] text-indigo-700">
               <span className="font-bold">Client:</span> {client.name} <br/>
               <span className="font-bold">Fidélité:</span> {client.loyalty_points} pts
            </div>
          )}
          <hr className="my-3 border-gray-300" />

          {/* Products */}
          {displayItems.map((item: any, i: number) => {
            const unitPrice = item.unit_price || item.price || 0;
            const quantity = item.quantity || 1;
            const itemTotal = item.total || (unitPrice * quantity);
            const name = item.name || 'Article';

            return (
              <div key={i} className="flex justify-between text-xs mb-2 items-start">
                <div className="flex-1">
                  <span className="font-medium">{name}</span>
                  <span className="text-[10px] text-gray-500 block">
                    {quantity} x {unitPrice.toFixed(3)} DT
                    {item.remise_percentage && item.remise_percentage > 0 && (
                      <span className="text-red-600 ml-1">(-{item.remise_percentage}%)</span>
                    )}
                  </span>
                </div>
                <div className="font-bold">{parseFloat(itemTotal).toFixed(3)} DT</div>
              </div>
            );
          })}

          <hr className="my-3 border-gray-300" />
          <div className="text-xs space-y-1">
            {totalRemise > 0 && (
              <div className="flex justify-between text-red-600 font-medium">
                <span>Total Remise:</span>
                <span>- {totalRemise.toFixed(3)} DT</span>
              </div>
            )}
            {pointsDiscount > 0 && (
              <div className="flex justify-between text-blue-600 font-medium border-b border-blue-100 pb-1 mb-1">
                <span>Remise Fidélité ({order.points_spent} pts):</span>
                <span>- {pointsDiscount.toFixed(3)} DT</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm">
              <span>Total:</span>
              <span>{amountToPay.toFixed(3)} DT</span>
            </div>
            <div className="flex justify-between">
              <span>Montant reçu:</span> {/* Fixed from "Reçu" */}
              <span>{paidAmount.toFixed(3)} DT</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Monnaie rendue:</span> {/* Fixed from "Monnaie" */}
              <span
                className={change >= 0 ? "text-green-600" : "text-red-600"}
              >
                {change.toFixed(3)} DT
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 text-center text-xs text-gray-700 italic">
            {template?.thank_you_message || "Merci pour votre achat !"}
            <br />
            {template?.return_policy ||
              "Retours acceptés dans un délai d'un jour avec le reçu original."}
          </div>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="mt-6 flex flex-col gap-3">
        
        
        <div className="text-center">
          {countdown > 0 && !hasPrinted ? (
            <p className="text-xs text-blue-600 font-bold">
              Impression automatique dans {countdown}s...
            </p>
          ) : isPrinting ? (
            <div className="flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
              <p className="text-[10px] text-orange-500 font-black uppercase tracking-tighter">
                Envoi à l'imprimante...
              </p>
            </div>
          ) : printError ? (
            <p className="text-[10px] text-red-500 font-bold uppercase p-2 bg-red-50 rounded">
              ⚠️ Erreur d'impression: {printError}
            </p>
          ) : (
            <p className="text-[10px] text-green-600 font-black uppercase tracking-widest bg-green-50 px-2 py-1 rounded inline-block">
              ✨ Prêt pour la commande suivante
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
