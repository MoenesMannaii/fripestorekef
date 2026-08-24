"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

// Définition des types pour les entrées du formulaire
// Types for form state
interface ProductFormState {
  productName: string;
  productDescription: string;
  price: any;
  purchasePrice: any;
  category: string;
  quantityInStock: any;
  has_sub_units: boolean;
  pieces_per_box: any;
  loose_units: any;
  barcode: string;
  sku: string;
  remise_percentage: any;
}

interface ProductImage {
  file: File | null;
  previewUrl: string;
}

interface BackendProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  cost_price: number;
  stock: number;
  has_sub_units?: boolean | number;
  pieces_per_box?: number;
  category: string;
  barcode: string;
  sku: string;
  remise_percentage?: number;
  ProductImages?: Array<{
    id: number;
    product_id: number;
    url: string;
    is_primary: boolean;
    created_at: string;
  }>;
}

const EditProductPage: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const productId = searchParams.get("id");

  const [formData, setFormData] = useState<ProductFormState>({
    productName: "",
    productDescription: "",
    price: "",
    purchasePrice: "",
    category: "",
    quantityInStock: "",
    has_sub_units: false,
    pieces_per_box: "",
    loose_units: "",
    barcode: "",
    sku: "",
    remise_percentage: ""
  });

  const [productImage, setProductImage] = useState<ProductImage>({
    file: null,
    previewUrl: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string>("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // État pour les suggestions de catégories
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([]);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);

  // Récupérer les données du produit et les catégories disponibles lors du chargement du composant
  useEffect(() => {
    if (productId) {
      fetchProductData();
      fetchAvailableCategories();
    } else {
      setMessage({ type: "error", text: "ID du produit manquant" });
      setIsLoading(false);
    }
  }, [productId]);

  // Récupérer les catégories disponibles depuis l'API des produits existants
  const fetchAvailableCategories = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch("http://localhost:4000/api/products", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const products = data.products || [];

        // Extraire les catégories uniques des produits
        const productCategories = products
          .filter(
            (product: BackendProduct) =>
              product.category && product.category.trim() !== ""
          )
          .map((product: BackendProduct) => product.category);

        const uniqueCategories = Array.from(
          new Set(productCategories)
        ) as string[];
        setAvailableCategories(uniqueCategories);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des catégories:", error);
      // Retour à un tableau vide si l'API échoue
      setAvailableCategories([]);
    }
  };

  // Gestionnaire de changement de saisie de catégorie avec suggestions
  const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, category: value }));

    if (value.trim()) {
      const filtered = availableCategories.filter((category) =>
        category.toLowerCase().includes(value.toLowerCase())
      );
      setCategorySuggestions(filtered);
      setShowCategorySuggestions(filtered.length > 0);
    } else {
      setCategorySuggestions([]);
      setShowCategorySuggestions(false);
    }
  };

  // Sélectionner une catégorie depuis les suggestions
  const selectCategory = (category: string) => {
    setFormData((prev) => ({ ...prev, category }));
    setCategorySuggestions([]);
    setShowCategorySuggestions(false);
  };

  // Gestionnaire de la modale de succès et redirection
  useEffect(() => {
    if (showSuccessModal) {
      const redirectTimer = setTimeout(() => {
        router.push("/gestion");
      }, 1500);

      return () => clearTimeout(redirectTimer);
    }
  }, [showSuccessModal, router]);

  // Récupérer les données du produit
  const fetchProductData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("authToken");

      if (!token) {
        throw new Error("Token d'authentification non trouvé");
      }

      const response = await fetch(
        `http://localhost:4000/api/products/${productId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Échec de la récupération du produit: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();

      // Gérer les structures de réponse potentielles différentes
      const productData: BackendProduct = result.product || result;

      if (!productData) {
        throw new Error("Aucune donnée produit reçue du serveur");
      }

      // Parse fractional stock back to boxes and loose units if sub_units enabled
      let displayBoxes: any = productData.stock || 0;
      let displayLoose: any = 0;

      const hasSubUnits = !!productData.has_sub_units;
      const piecesPerBox = productData.pieces_per_box || 1;

      if (hasSubUnits && piecesPerBox > 0) {
        displayBoxes = Math.floor(productData.stock);
        const fractionalPart = productData.stock - displayBoxes;
        displayLoose = Math.round(fractionalPart * piecesPerBox);
      }

      // Définir les données backend vers notre état de formulaire
      setFormData({
        productName: productData.name || "",
        productDescription: productData.description || "",
        price: productData.price || "",
        purchasePrice: productData.cost_price || "",
        category: productData.category || "",
        quantityInStock: displayBoxes,
        has_sub_units: hasSubUnits,
        pieces_per_box: hasSubUnits ? piecesPerBox : "",
        loose_units: hasSubUnits ? displayLoose : "",
        barcode: productData.barcode || "",
        sku: productData.sku || "",
        remise_percentage: productData.remise_percentage || 0,
      });

      // Définir l'image existante si disponible
      if (productData.ProductImages && productData.ProductImages.length > 0) {
        const primaryImage =
          productData.ProductImages.find((img: any) => img.is_primary) ||
          productData.ProductImages[0];
        const imageUrl = `http://localhost:4000${primaryImage.url}`;
        setExistingImageUrl(imageUrl);
        setProductImage((prev) => ({ ...prev, previewUrl: imageUrl }));
      } else {
        setExistingImageUrl("");
        setProductImage({ file: null, previewUrl: "" });
      }

      setMessage(null);
    } catch (error) {
      console.error("Erreur lors de la récupération du produit:", error);
      setMessage({
        type: "error",
        text: `Erreur lors du chargement du produit: ${error instanceof Error ? error.message : "Erreur inconnue"
          }`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Gestionnaire de changement de saisie du formulaire
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (name === "category") {
      handleCategoryChange(e as React.ChangeEvent<HTMLInputElement>);
    } else {
      setFormData((prevData) => ({
        ...prevData,
        [name]:
          name.includes("price") || name.includes("quantityInStock") || name.includes("pieces") || name.includes("loose_units") || name === "remise_percentage"
            ? Number(value)
            : value,
      }));
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, has_sub_units: e.target.checked }));
  };

  // Gestionnaire de téléchargement d'image
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Vérifier le type de fichier
      if (!file.type.startsWith("image/")) {
        setMessage({
          type: "error",
          text: "Veuillez télécharger un fichier image",
        });
        return;
      }

      // Vérifier la taille du fichier (5 Mo)
      if (file.size > 5 * 1024 * 1024) {
        setMessage({
          type: "error",
          text: "La taille de l'image doit être inférieure à 5 Mo",
        });
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      setProductImage({
        file,
        previewUrl,
      });
      setExistingImageUrl("");
      setMessage(null);
    }
  };

  // Validation du formulaire
  const validateForm = (): boolean => {
    if (!formData.productName.trim()) {
      setMessage({ type: "error", text: "Le nom du produit est requis" });
      return false;
    }
    if (formData.price <= 0) {
      setMessage({ type: "error", text: "Le prix doit être supérieur à 0" });
      return false;
    }
    if (formData.quantityInStock < 0) {
      setMessage({
        type: "error",
        text: "La quantité en stock ne peut pas être négative",
      });
      return false;
    }
    if (formData.remise_percentage < 0 || formData.remise_percentage > 100) {
      setMessage({
        type: "error",
        text: "La remise doit être entre 0 et 100%",
      });
      return false;
    }
    return true;
  };

  // Gestionnaire de soumission du formulaire pour la mise à jour
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Token d'authentification non trouvé");
      }

      const formDataToSend = new FormData();

      // Ajouter les données du formulaire avec les noms de champs corrects pour le backend
      formDataToSend.append("name", formData.productName);
      formDataToSend.append("description", formData.productDescription);
      formDataToSend.append("price", formData.price.toString());
      formDataToSend.append("cost_price", formData.purchasePrice.toString());

      // Calculate float stock if Sub-Units are enabled
      let calculatedStock = Number(formData.quantityInStock) || 0;
      if (formData.has_sub_units && Number(formData.pieces_per_box) > 0) {
        calculatedStock += (Number(formData.loose_units) || 0) / Number(formData.pieces_per_box);
      }
      formDataToSend.append("stock", calculatedStock.toString());
      formDataToSend.append("has_sub_units", String(formData.has_sub_units));
      formDataToSend.append("pieces_per_box", formData.pieces_per_box ? String(formData.pieces_per_box) : "1");
      formDataToSend.append("remise_percentage", formData.remise_percentage ? String(formData.remise_percentage) : "0");

      formDataToSend.append("category", formData.category);
      formDataToSend.append("barcode", formData.barcode);
      formDataToSend.append("sku", formData.sku);

      // Ajouter l'image si une nouvelle image est sélectionnée
      if (productImage.file) {
        formDataToSend.append("productImage", productImage.file);
      }

      const response = await fetch(
        `http://localhost:4000/api/products/${productId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formDataToSend,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Échec de la mise à jour du produit: ${response.status}`
        );
      }

      setShowSuccessModal(true);
    } catch (error) {
      console.error("Erreur lors de la mise à jour du produit:", error);
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Erreur lors de la mise à jour du produit",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Gestionnaire d'annulation
  const handleCancel = () => {
    router.push("/gestion");
  };

  // Variables d'animation pour la modale
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const modalVariants = {
    hidden: {
      opacity: 0,
      scale: 0.8,
      y: -50,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        damping: 25,
        stiffness: 300,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      y: 50,
      transition: {
        duration: 0.2,
      },
    },
  };

  const checkmarkVariants = {
    hidden: {
      scale: 0,
      rotate: -180,
    },
    visible: {
      scale: 1,
      rotate: 0,
      transition: {
        type: "spring" as const,
        stiffness: 200,
        damping: 15,
        delay: 0.2,
      },
    },
  };

  if (isLoading) {
    return (
      <div className="h-full bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full h-full max-w-full max-h-[90vh] grid grid-rows-[auto_1fr] gap-4">
          <div className="flex justify-center items-center h-full">
            <div className=" rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            <span className="ml-4 text-gray-600">Chargement du produit...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col p-4 md:p-6" dir="ltr">
      <div className="max-w-full mx-auto w-full flex-1 flex flex-col gap-6">
        {/* Header Section */}
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Modifier le Produit</h1>
          {/*   <p className="text-sm text-gray-500 mt-1">ID: {productId}</p> */}
          </div>
          <div className="flex gap-3">
             <button
              onClick={handleCancel}
              className="px-6 py-4 bg-white border border-gray-300 text-gray-700 font-medium hover:bg-gray-50  "
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-4 bg-green-700 text-white font-medium hover:bg-green-800   disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isSubmitting ? "Chargement..." : "Mettre à jour"}
            </button>
          </div>
        </div>

        {/* Message Banner - Errors only */}
        {message && message.type === "error" && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-800 shadow-sm    ">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              <p className="font-medium">{message.text}</p>
            </div>
          </div>
        )}

        {/* Animated success modal */}
        <AnimatePresence>
          {showSuccessModal && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <motion.div
                className="absolute inset-0 bg-white/80 "
                variants={backdropVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              />
              <motion.div
                className="relative bg-white p-8 mx-4 max-w-sm w-full border border-gray-100 shadow-2xl"
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <div className="text-center">
                  <motion.div
                    className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-50 mb-6 border border-green-100"
                    variants={checkmarkVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <motion.svg
                      className="h-10 w-10 text-green-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 0.5, duration: 0.3 }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </motion.svg>
                  </motion.div>
                  <motion.h3 className="text-2xl font-bold text-gray-900 mb-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    Succès!
                  </motion.h3>
                  <motion.p className="text-gray-600 mb-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    Produit mis à jour avec succès
                  </motion.p>
                  <motion.div className="w-full bg-gray-200 rounded-full h-1.5 mt-4 overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                    <motion.div className="bg-green-500 h-1.5 rounded-full" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 1.5, ease: "linear" }} />
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Media & Notes */}
          <div className="lg:col-span-4 space-y-6">
            {/* Image Card */}
            <div className="bg-white border border-gray-200 shadow-sm p-6 overflow-hidden">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Média du Produit</h3>
              <div className="relative group aspect-square bg-gray-50 border-2 border-dashed border-gray-300 flex flex-col items-center  justify-center h-96 w-full overflow-hidden   hover:border-gray-400">
                {productImage.previewUrl ? (
                  <img
                    src={productImage.previewUrl}
                    alt="Aperçu"
                    className="w-full h-full object-contain"
                  />
                ) : existingImageUrl ? (
                    <img
                      src={existingImageUrl}
                      alt="Existant"
                      className="w-full h-full object-contain"
                    />
                ) : (
                  <div className="text-center p-4">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="mt-1 text-sm text-gray-500">Aucune image</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100  flex items-center justify-center">
                  <input
                    type="file"
                    id="productImage"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="productImage"
                    className="cursor-pointer bg-white text-gray-900 px-4 py-2 text-sm font-medium hover:bg-gray-100 transition shadow-lg"
                  >
                    {existingImageUrl ? "Changer l'image" : "Choisir une image"}
                  </label>
                </div>
              </div>
              {productImage.file && (
                <p className="mt-2 text-xs text-center text-gray-500 truncate w-full">
                  {productImage.file.name}
                </p>
              )}
            </div>

            {/* Notes/Description Card */}
            <div className="bg-white border border-gray-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Notes & Description</h3>
              <textarea
                name="productDescription"
                value={formData.productDescription}
                onChange={handleInputChange}
                rows={2}
                placeholder="Détails supplémentaires, ingrédients, notes de stockage..."
                className="w-full border border-gray-300 p-3 text-gray-700 focus:ring-1 focus:ring-gray-500 focus:border-gray-500 focus:outline-none   text-sm leading-relaxed"
              />
            </div>
          </div>

          {/* Right Column: Detailed Form */}
          <div className="lg:col-span-8">
            <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
              <div className="py-4 px-6 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Informations Générales</h3>
              </div>
              
              <div className="p-8 space-y-8">
                {/* Essential Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">Nom du produit *</label>
                    <input
                      type="text"
                      name="productName"
                      value={formData.productName}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 p-3 text-gray-700 focus:ring-1 focus:ring-gray-500 focus:outline-none  "
                      required
                    />
                  </div>

                  <div className="relative space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">Catégorie</label>
                    <input
                      type="text"
                      name="category"
                      value={formData.category}
                      onChange={handleCategoryChange}
                      className="w-full border border-gray-300 p-3 text-gray-700 focus:ring-1 focus:ring-gray-500 focus:outline-none  "
                    />
                    {showCategorySuggestions && (
                      <div className="absolute w-full bg-white border border-gray-200 mt-1 shadow-xl z-20 max-h-48 overflow-y-auto ring-1 ring-black ring-opacity-5">
                        {categorySuggestions.map((category, index) => (
                          <div
                            key={index}
                            className="p-3 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 "
                            onClick={() => selectCategory(category)}
                          >
                            {category}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Pricing Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">Prix de vente (DT) *</label>
                    <div className="relative">
                      <input
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleInputChange}
                        step="0.001"
                        className="w-full border border-gray-300 p-3 pr-12 text-gray-700 focus:ring-1 focus:ring-gray-500 focus:outline-none   font-medium"
                        required
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium pointer-events-none">DT</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">Prix d'achat (DT)</label>
                    <div className="relative">
                      <input
                        type="number"
                        name="purchasePrice"
                        value={formData.purchasePrice}
                        onChange={handleInputChange}
                        step="0.001"
                        className="w-full border border-gray-300 p-3 pr-12 text-gray-700 focus:ring-1 focus:ring-gray-500 focus:outline-none   bg-gray-50/50"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium pointer-events-none">DT</span>
                    </div>
                  </div>

                  {/* Remise & Final Price */}
                  <div className="space-y-1.5 p-4 bg-red-50/50 border border-red-100">
                    <label className="block text-sm font-semibold text-red-700">Remise (%)</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="relative">
                        <input
                          type="number"
                          name="remise_percentage"
                          value={formData.remise_percentage}
                          onChange={handleInputChange}
                          placeholder="0"
                          min="0"
                          max="100"
                          className="w-full border border-red-200 p-3 pr-10 text-red-700 focus:ring-1 focus:ring-red-500 focus:outline-none   font-bold"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-red-400 font-bold pointer-events-none">%</span>
                      </div>
                      <div className="flex flex-col justify-center">
                        <span className="text-xs text-red-600 font-bold uppercase tracking-wider">Prix Final</span>
                        <span className="text-xl font-black text-red-700">
                          {(Number(formData.price) * (1 - (Number(formData.remise_percentage) || 0) / 100)).toFixed(3)} <span className="text-xs">DT</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Inventory Section */}
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Gestion de Stock</h4>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={formData.has_sub_units} 
                        onChange={handleCheckboxChange} 
                        className="w-4 h-4 text-green-700 border-gray-300 rounded focus:ring-green-500  " 
                      />
                      <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 ">Vente en gros & détails ?</span>
                    </label>
                  </div>

                  {formData.has_sub_units ? (
                    <div className="bg-gray-50 p-6 border border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-6   -95 ">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-600 uppercase">Pièces / Boîte *</label>
                        <input type="number" name="pieces_per_box" value={formData.pieces_per_box} onChange={handleInputChange} min="1" className="w-full border border-gray-300 p-2.5 focus:ring-1 focus:ring-gray-500 outline-none   bg-white" required={formData.has_sub_units} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-600 uppercase">Stock (Boîtes) *</label>
                        <input type="number" name="quantityInStock" value={formData.quantityInStock} onChange={handleInputChange} min="0" className="w-full border border-gray-300 p-2.5 focus:ring-1 focus:ring-gray-500 outline-none   bg-white" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-600 uppercase">Unités détachées</label>
                        <input type="number" name="loose_units" value={formData.loose_units} onChange={handleInputChange} min="0" className="w-full border border-gray-300 p-2.5 focus:ring-1 focus:ring-gray-500 outline-none   bg-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-w-sm">
                      <label className="block text-sm font-semibold text-gray-700">Quantité en stock</label>
                      <input
                        type="number"
                        name="quantityInStock"
                        value={formData.quantityInStock}
                        onChange={handleInputChange}
                        min="0"
                        className="w-full border border-gray-300 p-3 text-gray-700 focus:ring-1 focus:ring-gray-500 focus:outline-none  "
                      />
                    </div>
                  )}
                </div>

                {/* Tracking Codes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">Code-barres</label>
                    <input
                      type="text"
                      name="barcode"
                      value={formData.barcode}
                      onChange={handleInputChange}
                      placeholder="Scanner ou saisir..."
                      className="w-full border border-gray-300 p-3 text-gray-700 focus:ring-1 focus:ring-gray-500 focus:outline-none   bg-gray-50/30"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700">SKU</label>
                    <input
                      type="text"
                      name="sku"
                      value={formData.sku}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 p-3 text-gray-700 focus:ring-1 focus:ring-gray-500 focus:outline-none   bg-gray-100 cursor-not-allowed text-sm uppercase"
                      readOnly
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
              {/* <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-8 py-3 bg-white border border-gray-300 text-gray-700 font-medium hover:bg-gray-50  "
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="px-8 py-3 bg-green-700 text-white font-medium hover:bg-green-800   disabled:opacity-50 shadow-sm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Chargement..." : "Mettre à jour le produit"}
                </button>
              </div> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProductPage;

