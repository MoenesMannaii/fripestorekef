import { Gift, TriangleAlert, Clock, Calendar, Receipt, Search, X, Plus, ArrowRight, ArrowLeft, Tags, Star } from 'lucide-react';
import { useState, useRef, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useAlert } from '../AlertContext';

interface Product {
  id: number;
  name: string;
  stock: number;
  price: number;
  image: string;
  barcode?: string;
  description?: string;
  sku?: string;
  cost_price?: number;
  category?: string;
  has_sub_units?: boolean;
  pieces_per_box?: number;
  sell_by_weight?: boolean;
  parent_id?: number;
  attributes?: any;
  remise_percentage?: number;
}

interface ProductImage {
  id: number;
  url: string;
  is_primary: boolean;
  product_id: number;
}

interface ProductWithImages extends Product {
  ProductImages?: ProductImage[];
}

interface ProductsProps {
  onAddToCart?: (product: Product) => void;
}

export interface ProductsRefHandle {
  refresh: () => void;
}

// Storage keys - defined once to avoid typos
const STORAGE_KEYS = {
  FAVORITE_CATEGORIES: 'pos_favoriteCategories',
  FAVORITE_PRODUCTS: 'pos_favoriteProducts',
} as const;

const Products = forwardRef<ProductsRefHandle, ProductsProps>(function Products({ onAddToCart }, ref) {
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [products, setProducts] = useState<ProductWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSilentRefreshing, setIsSilentRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>(['Tous']);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [activePromotions, setActivePromotions] = useState<any[]>([]);

  // Category favorites - only affects category slider order
  const [favoriteCategories, setFavoriteCategories] = useState<Set<string>>(new Set());
  // Product favorites - affects product list order (stored as strings for consistency)
  const [favoriteProducts, setFavoriteProducts] = useState<Set<string>>(new Set());

  // Track if favorites have been loaded from localStorage
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);

  const categoriesScrollRef = useRef<HTMLDivElement>(null);
  const productSearchInputRef = useRef<HTMLInputElement>(null);
  const categorySearchInputRef = useRef<HTMLInputElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSearching, setIsSearching] = useState(false);
  const { showConfirm } = useAlert();

  // Sub-Unit Sale Modal State
  const [selectedSubUnitProduct, setSelectedSubUnitProduct] = useState<Product | null>(null);

  // Variant Selection State
  const [selectedMasterProduct, setSelectedMasterProduct] = useState<Product | null>(null);
  const [productVariants, setProductVariants] = useState<Product[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);

  // Products per page for table view
  const PRODUCTS_PER_PAGE = 50;

  // Load favorites from localStorage on mount (runs once)
  useEffect(() => {
    const loadFavorites = () => {
      try {
        // Load category favorites
        const savedCategories = localStorage.getItem(STORAGE_KEYS.FAVORITE_CATEGORIES);
        if (savedCategories) {
          const parsed = JSON.parse(savedCategories);
          if (Array.isArray(parsed)) {
            setFavoriteCategories(new Set(parsed.filter((c: string) => typeof c === 'string')));
          }
        }

        // Load product favorites (stored as strings for type safety)
        const savedProducts = localStorage.getItem(STORAGE_KEYS.FAVORITE_PRODUCTS);
        if (savedProducts) {
          const parsed = JSON.parse(savedProducts);
          if (Array.isArray(parsed)) {
            // Convert all to strings to ensure consistency with product.id comparisons
            const stringIds = parsed.map((id: number | string) => String(id));
            setFavoriteProducts(new Set(stringIds));
          }
        }
      } catch (err) {
        console.error('Error loading favorites from localStorage:', err);
      } finally {
        setFavoritesLoaded(true);
      }
    };

    loadFavorites();
  }, []);

  // Save category favorites to localStorage when they change
  useEffect(() => {
    if (!favoritesLoaded) return; // Don't save until we've loaded

    try {
      const categoriesArray = Array.from(favoriteCategories);
      localStorage.setItem(STORAGE_KEYS.FAVORITE_CATEGORIES, JSON.stringify(categoriesArray));
    } catch (err) {
      console.error('Error saving favorite categories:', err);
    }
  }, [favoriteCategories, favoritesLoaded]);

  // Save product favorites to localStorage when they change
  useEffect(() => {
    if (!favoritesLoaded) return; // Don't save until we've loaded

    try {
      const productsArray = Array.from(favoriteProducts);
      localStorage.setItem(STORAGE_KEYS.FAVORITE_PRODUCTS, JSON.stringify(productsArray));
    } catch (err) {
      console.error('Error saving favorite products:', err);
    }
  }, [favoriteProducts, favoritesLoaded]);

  // Toggle favorite status for a category (only affects slider order)
  const toggleFavoriteCategory = (category: string) => {
    if (category === 'Tous') return;

    setFavoriteCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Toggle favorite status for a product (affects product list order)
  const toggleFavoriteProduct = (productId: number) => {
    const productIdStr = String(productId); // Ensure string for consistency

    setFavoriteProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productIdStr)) {
        newSet.delete(productIdStr);
      } else {
        newSet.add(productIdStr);
      }
      return newSet;
    });
  };

  // Check if a category is favorited
  const isCategoryFavorited = (category: string): boolean => {
    return favoriteCategories.has(category);
  };

  // Check if a product is favorited (handles both number and string IDs)
  const isProductFavorited = (productId: number): boolean => {
    return favoriteProducts.has(String(productId));
  };

  // Update current time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);


  // Fetch products from backend
  const fetchProducts = useCallback(async (searchQuery: string = '', silent: boolean = false) => {
    try {
      if (silent) {
        setIsSilentRefreshing(true);
      } else {
        setLoading(true);
      }
      const token = localStorage.getItem('authToken');
      if (!token) {
        setLoading(false);
        setIsSilentRefreshing(false);
        return;
      }

      const params = new URLSearchParams();
      if (searchQuery) {
        params.append('q', searchQuery);
      }

      const response = await fetch(`http://localhost:4000/api/products?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();
      setProducts(data.products || []);

      const productCategories = data.products
        .filter((product: ProductWithImages) => product.category && product.category.trim() !== '')
        .map((product: ProductWithImages) => product.category as string);

      const uniqueCategories = ['Tous', ...Array.from(new Set(productCategories)) as string[]];
      setCategories(uniqueCategories);
      setAvailableCategories(uniqueCategories.filter(cat => cat !== 'Tous'));

    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      // Fetch promotions separately and silently
      fetchPromotions();
      if (silent) {
        setIsSilentRefreshing(false);
      } else {
        setLoading(false);
      }
      setIsSearching(false);
    }
  }, []);

  const fetchPromotions = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      const response = await fetch('http://localhost:4000/api/promotions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setActivePromotions(data.promotions || []);
      }
    } catch (err) {
      console.error('Failed to fetch promotions:', err);
    }
  };

  // Sync products across tabs/components when a sale occurs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pos-refresh') {
        fetchProducts('', true);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [fetchProducts]);

  // Initial fetch
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Silent polling every 30 seconds to auto-detect new products
  useEffect(() => {
    const interval = setInterval(() => {
      fetchProducts('', true);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchProducts]);

  // Expose refresh method to parent via ref
  useImperativeHandle(ref, () => ({
    refresh: () => fetchProducts('', true)
  }));

  // Search on change with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (productSearchQuery || categorySearchQuery) {
        setIsSearching(true);
        const searchTerm = productSearchQuery || categorySearchQuery;
        fetchProducts(searchTerm);
        setCurrentPage(1);
      } else {
        setIsSearching(true);
        fetchProducts('');
        setCurrentPage(1);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [productSearchQuery, categorySearchQuery, fetchProducts]);

  // Clear searches
  const handleClearProductSearch = () => {
    setProductSearchQuery('');
    setCategorySearchQuery('');
    setCurrentPage(1);
    productSearchInputRef.current?.focus();
  };

  const handleClearCategorySearch = () => {
    setCategorySearchQuery('');
    setProductSearchQuery('');
    setCurrentPage(1);
    categorySearchInputRef.current?.focus();
  };

  // Handle category selection
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setProductSearchQuery('');
    setCategorySearchQuery('');
    setCurrentPage(1);
  };

  // Sort categories: favorites first, then alphabetically, with "Tous" always first
  const sortedCategories = [...categories].sort((a, b) => {
    if (a === 'Tous') return -1;
    if (b === 'Tous') return 1;

    const aFav = isCategoryFavorited(a);
    const bFav = isCategoryFavorited(b);

    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;

    return a.localeCompare(b);
  });

  // Filter products by selected category (local filtering)
  const filteredProducts = products.filter(product => {
    return selectedCategory === 'Tous' || product.category === selectedCategory;
  });

  // Sort products: favorited products FIRST, then by name
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const aFav = isProductFavorited(a.id);
    const bFav = isProductFavorited(b.id);

    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;

    return a.name.localeCompare(b.name);
  });

  const totalPages = Math.ceil(sortedProducts.length / PRODUCTS_PER_PAGE);

  const currentProducts = sortedProducts.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE
  );

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoriesScrollRef.current) {
      const scrollAmount = 200;
      categoriesScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Handle add to cart
  const handleAddToCartClick = (product: Product) => {
    // Check if this is a master product (has variants)
    const hasVariants = products.some(p => p.parent_id === product.id);

    if (hasVariants) {
      handleOpenVariantSelection(product);
    } else if (product.has_sub_units && product.pieces_per_box && product.pieces_per_box > 0) {
      setSelectedSubUnitProduct(product);
    } else {
      handleAddToCart(product);
    }
  };

  const handleOpenVariantSelection = async (masterProduct: Product) => {
    setSelectedMasterProduct(masterProduct);
    setLoadingVariants(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:4000/api/products?parent_id=${masterProduct.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setProductVariants(data.products || []);
    } catch (err) {
      console.error("Failed to fetch variants:", err);
    } finally {
      setLoadingVariants(false);
    }
  };

  const handleAddToCart = (product: Product, isSubUnit: boolean = false) => {
    if (onAddToCart) {
      if (isSubUnit && product.pieces_per_box) {
        // Modify the product payload passed to the cart to uniquely identify it as a Unit
        onAddToCart({
          ...product,
          id: `${product.id}_unit` as any,
          name: `${product.name} (Unité)`,
          price: parseFloat((product.price / product.pieces_per_box).toFixed(3)),
          stock: Math.floor(product.stock * product.pieces_per_box), // display stock in units
          // additional fields passed to cart for Server preparation
          original_product_price: product.price,
          is_sub_unit: true,
          pieces_per_box: product.pieces_per_box
        } as any);
      } else {
        onAddToCart(product);
      }
    }
    setSelectedSubUnitProduct(null);
  };

  // Show search hints
  const showProductSearchHint = productSearchQuery.length === 1;

  const formattedDate = currentTime.toLocaleDateString('fr-FR');
  const formattedTime = currentTime.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // Get product image URL
  const getImageUrl = (product: ProductWithImages) => {
    if (product.ProductImages && product.ProductImages.length > 0) {
      const imageUrl = product.ProductImages[0].url;
      if (imageUrl && imageUrl.trim() !== '') {
        return `http://localhost:4000${imageUrl}`;
      }
    }
    if (product.image && product.image.trim() !== '') {
      if (product.image.startsWith('http')) {
        return product.image;
      } else {
        return `http://localhost:4000${product.image}`;
      }
    }
    return null;
  };

  const formatStockDisplay = (product: Product) => {
    if (!product.has_sub_units || !product.pieces_per_box) return `${product.stock}`;
    const boxes = Math.floor(product.stock);
    const fractional = product.stock - boxes;
    const loose = Math.round(fractional * product.pieces_per_box);

    if (boxes > 0 && loose > 0) return `${boxes} Bt. + ${loose} Un.`;
    if (boxes > 0) return `${boxes} Bt.`;
    return `${loose} Un.`;
  };

  // Reset all searches and filters
  const handleClearAllSearches = () => {
    setSelectedCategory('Tous');
    setProductSearchQuery('');
    setCategorySearchQuery('');
    setCurrentPage(1);
    productSearchInputRef.current?.focus();
  };

  // Clear ALL favorites (for debugging or user preference)
  const handleClearAllFavorites = async () => {
    if (await showConfirm('ÃŠtes-vous sÃ»r de vouloir supprimer tous vos favoris ?')) {
      setFavoriteCategories(new Set());
      setFavoriteProducts(new Set());
      localStorage.removeItem(STORAGE_KEYS.FAVORITE_CATEGORIES);
      localStorage.removeItem(STORAGE_KEYS.FAVORITE_PRODUCTS);
    }
  };

  // Determine if we're currently searching
  const isCurrentlySearching = productSearchQuery || categorySearchQuery;

  // Show loading state only if products haven't loaded AND favorites haven't loaded
  if (loading && products.length === 0 && !favoritesLoaded) {
    return (
      <div className="flex-1 py-2 sm:py-4 h-full flex flex-col">
        <div className="flex justify-center items-center h-48 sm:h-64">
          <div className="text-lg uppercase font-black border-2 border-gray-900 px-4 py-2">Chargement...</div>
        </div>
      </div>
    );
  }

  if (error) {
    const skeletonCount = 8;

    return (
      <>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
          {[...Array(skeletonCount)].map((_, index) => (
            <div
              key={index}
              className="border border-gray-200 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="w-18 h-18 bg-gray-200 shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2 py-1">
                    <div className="h-4 bg-gray-200 w-3/4" />
                    <div className="h-3 bg-gray-200 w-1/2" />
                    <div className="flex items-center gap-4 mt-1">
                      <div className="h-4 bg-gray-200 w-1/4" />
                      <div className="h-3 bg-gray-200 w-1/3" />
                    </div>
                  </div>
                </div>

                <div className="shrink-0 ml-4">
                  <div className="h-12 w-12 bg-gray-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className='flex justify-center mx-auto'>
          <button onClick={() => fetchProducts()}
            className='block mt-2 px-6 py-4 bg-gray-600 text-white hover:bg-gray-700'>Réessayer</button>
        </div>
      </>
    );
  }

  return (
    <div className="flex-1 py-2 sm:py-0 h-full flex flex-col">
      {/* Variant Selection Modal */}
      {selectedMasterProduct && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-9999">
          <div className="bg-white shadow w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-5 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-800">Choisir une variante: {selectedMasterProduct.name}</h3>
              <button onClick={() => setSelectedMasterProduct(null)} className="p-2 hover:bg-gray-200"><X size={24} /></button>
            </div>
            <div className="p-6">
              {loadingVariants ? (
                <div className="text-center py-10">Chargement des variantes...</div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {productVariants.map(variant => (
                    <button
                      key={variant.id}
                      onClick={() => handleAddToCartClick(variant)}
                      className="p-4 border border-gray-200 hover:border-gray-800 hover:bg-gray-50 text-left"
                    >
                      <div className="font-bold text-gray-900">{variant.name}</div>
                      <div className="text-sm text-gray-500">{variant.price.toFixed(3)} DT</div>
                      <div className="text-xs text-gray-400">Stock: {variant.stock}</div>
                    </button>
                  ))}
                  {productVariants.length === 0 && (
                    <div className="col-span-2 text-center py-10 text-gray-500">Aucune variante disponible.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sub-Unit Sale Modal */}
      {selectedSubUnitProduct && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-9999">
          <div className="bg-white shadow w-full max-w-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="bg-gray-100 p-2 rounded-lg text-gray-600">
                  <Receipt className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 tracking-tight">Mode de Vente</h3>
              </div>
              <button
                onClick={() => setSelectedSubUnitProduct(null)}
                className="p-4 flex items-center bg-gray-100 text-gray-600 hover:text-gray-700 hover:bg-gray-100 focus:outline-none"
              >
                <X className="w-6 h-6" /> Fermer
              </button>
            </div>
            <div className="p-8 bg-gray-50/50">
              <div className="text-center mb-8">
                <p className="text-base text-gray-600">Choisissez comment débiter</p>
                <p className="text-xl font-black text-gray-900 mt-1 uppercase tracking-wider">{selectedSubUnitProduct.name}</p>
              </div>
              <div className="flex flex-col gap-4 text-sm font-medium">
                <button
                  onClick={() => handleAddToCart(selectedSubUnitProduct, false)}
                  className="group relative w-full overflow-hidden bg-zinc-800 p-4 shadow-sm border border-gray-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-lg text-white font-bold">Vendre 1 Carton</span>
                      <span className="text-xs text-gray-100">Débite 1 boîte de {selectedSubUnitProduct.pieces_per_box} pièces</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-xl font-black text-white">{selectedSubUnitProduct.price.toFixed(3)}</span>
                      <span className="block text-xs text-gray-100 font-bold uppercase">DT</span>
                    </div>
                  </div>
                  <div className="absolute inset-0 border-2 border-transparent rounded-xl"></div>
                </button>

                <div className="flex items-center justify-center gap-3 my-2 opacity-60">
                  <div className="h-px bg-gray-300 w-12"></div>
                  <span className="text-xs uppercase font-bold text-gray-500 tracking-widest">OU</span>
                  <div className="h-px bg-gray-300 w-12"></div>
                </div>

                <button
                  onClick={() => handleAddToCart(selectedSubUnitProduct, true)}
                  className="group relative w-full overflow-hidden bg-emerald-700 p-4 shadow-sm border border-gray-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-lg text-white font-bold">Vendre 1 Unité</span>
                      <span className="text-xs text-gray-100">Débite 1/{selectedSubUnitProduct.pieces_per_box} de ce carton</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-xl font-black text-white">{(selectedSubUnitProduct.price / (selectedSubUnitProduct.pieces_per_box || 1)).toFixed(3)}</span>
                      <span className="block text-xs text-gray-100 font-bold uppercase">DT</span>
                    </div>
                  </div>
                  <div className="absolute inset-0 border-2 border-transparent rounded-xl"></div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-2 sm:px-4 mb-1 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-3xl font-black text-gray-800 mb-2 uppercase">
          Espace Vente
        </h1>

        {/* Quick Stats */}
        <div className="flex flex-row justify-between items-end xs:items-center gap-4 text-sm text-gray-600 mb-4">
          <span className={isSearching ? '' : ''}>
            {isSearching
              ? 'Recherche en cours...'
              : `${sortedProducts.length} ${sortedProducts.length % 2 === 1 ? 'produit' : 'produits'} ${sortedProducts.length % 2 === 1 ? 'trouvé' : 'trouvés'}`}
          </span>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">{formattedDate}</span>
              <Clock className="w-3 h-3 sm:w-4 sm:h-4 ml-2" />
              <span className="text-xs sm:text-sm">{formattedTime}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Categories and Search Section */}
      <div className="space-y-3 sm:space-y-4 mb-2 px-2 sm:px-4">
        {/* Categories Row */}
        <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1 sm:gap-2 w-full">
            <button
              onClick={() => scrollCategories('left')}
              className="px-4 sm:px-4 py-4 border border-gray-400 text-sm hover:bg-gray-100 flex items-center justify-center shrink-0 active:bg-gray-200"
            >
              <ArrowLeft className="w-3 h-3" />
            </button>

            <div
              ref={categoriesScrollRef}
              className="flex gap-2 sm:gap-4 overflow-x-auto scrollbar-hide flex-1 scroll-smooth pt-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {sortedCategories.map((category) => (
                <div key={category} className="relative flex items-center">
                  <button
                    onClick={() => handleCategorySelect(category)}
                    className={`px-2 sm:px-4 py-4 capitalize text-xs sm:text-sm min-w-16 sm:min-w-24 whitespace-nowrap shrink-0 border ${selectedCategory === category
                      ? 'bg-gray-600 text-white border-gray-600'
                      : 'border-gray-400 hover:bg-gray-50'
                      }`}
                  >
                    {category}
                  </button>
                  {category !== 'Tous' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavoriteCategory(category);
                      }}
                      className={`absolute -top-1 -right-2.5 p-1 shadow rounded-full z-50 ${isCategoryFavorited(category)
                        ? 'text-yellow-500 bg-white shadow-sm'
                        : 'text-gray-400 hover:text-yellow-500 bg-white'
                        }`}
                      title={isCategoryFavorited(category) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                    >
                      {isCategoryFavorited(category) ? (
                        <Star className="fill-current w-3 h-3" />
                      ) : (
                        <Star className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => scrollCategories('right')}
              className="px-4 sm:px-4 py-4 border border-gray-400 text-sm hover:bg-gray-100 flex items-center justify-center shrink-0 active:bg-gray-200"
            >
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Dual Search Inputs Row */}
        <div className="flex flex-col lg:flex-row gap-3 w-full">
          {/* Product Name Search */}
          <div className="flex-1">
            <label htmlFor="product-search" className="block text-xs font-medium text-gray-700 mb-2">
              Recherche par nom de produit
            </label>
            <div className="relative">
              <div className="flex items-center">
                <input
                  ref={productSearchInputRef}
                  id="product-search"
                  type="text"
                  placeholder="Rechercher un produit par nom..."
                  value={productSearchQuery}
                  onChange={(e) => {
                    setProductSearchQuery(e.target.value);
                    setCategorySearchQuery('');
                  }}
                  className="pl-2 sm:pl-3 pr-10 py-4 border border-gray-400 text-sm w-full focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-transparent"
                />

                {productSearchQuery ? (
                  <button
                    onClick={handleClearProductSearch}
                    className="absolute right-2 p-1 text-gray-400 hover:text-gray-600"
                    title="Effacer la recherche produit"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="absolute right-2 p-1 text-gray-400">
                    <Search className="w-4 h-4" />
                  </div>
                )}
              </div>

              {showProductSearchHint && (
                <div className="absolute top-full left-0 right-0 bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs px-2 p-1 mt-1 z-10">
                  La recherche se déclenche automatiquement
                </div>
              )}
            </div>
          </div>

          {/* Category Name Search */}
          <div className="flex-1">
            <label htmlFor="category-search" className="block text-xs font-medium text-gray-700 mb-2">
              Recherche par catégorie
            </label>
            <div className="relative">
              <div className="flex items-center">
                <Tags className="absolute left-2 sm:left-3 text-gray-400 w-4 h-4" />
                <input
                  ref={categorySearchInputRef}
                  id="category-search"
                  type="text"
                  placeholder="Rechercher par nom de catégorie..."
                  value={categorySearchQuery}
                  onChange={(e) => {
                    setCategorySearchQuery(e.target.value);
                    setProductSearchQuery('');
                  }}
                  className="pl-8 sm:pl-10 pr-10 py-4 border border-gray-400 text-sm w-full focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-transparent "
                  list="category-options"
                />

                {categorySearchQuery ? (
                  <button
                    onClick={handleClearCategorySearch}
                    className="absolute right-2 p-1 text-gray-400 hover:text-gray-600 "
                    title="Effacer la recherche catégorie"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="absolute right-2 p-1 text-gray-400">
                    <Search className="w-4 h-4" />
                  </div>
                )}
              </div>

              <datalist id="category-options">
                {availableCategories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </div>
          </div>
        </div>

<div className='flex justify-between items-center gap-4'>

  {(selectedCategory !== 'Tous' || isCurrentlySearching || favoriteProducts.size > 0) && (
          <div className="text-sm text-gray-600 bg-gray-50 p-2 w-full flex flex-wrap items-center gap-2">
            {selectedCategory !== 'Tous' && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                Catégorie: {selectedCategory}
              </span>
            )}
            {productSearchQuery && (
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                Produit: "{productSearchQuery}"
                <button
                  onClick={handleClearProductSearch}
                  className="hover:text-green-900"
                  title="Effacer la recherche produit"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {categorySearchQuery && (
              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                Catégorie: "{categorySearchQuery}"
                <button
                  onClick={handleClearCategorySearch}
                  className="hover:text-purple-900"
                  title="Effacer la recherche catégorie"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {favoriteProducts.size > 0 && (
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                {favoriteProducts.size} favori{favoriteProducts.size > 1 ? 's' : ''}
              </span>
            )}
            <div className="flex gap-6 ml-auto">
              <button
                onClick={handleClearAllFavorites}
                className="flex items-center gap-2 border border-gray-400 px-3 sm:px-4 py-2 text-sm text-red-500 hover:text-red-700"
                title="Supprimer tous les favoris"
              >
                <TriangleAlert className='w-3.5 h-3.5' />
                Effacer favoris
              </button>
              <button
                onClick={handleClearAllSearches}
                className="border border-gray-400 px-3 sm:px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                Tout effacer
              </button>
            </div>
          </div>
        )}

  {/* Pagination Row */}
        {totalPages > 1 && (
          <div className="flex justify-center sm:justify-end">
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className={`px-3 sm:px-4 py-2 border border-gray-400 text-sm  flex items-center gap-1 ${currentPage === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'hover:bg-gray-100 active:bg-gray-200'
                  }`}
              >
                <ArrowLeft className="w-3 h-3" />
                <span className="hidden sm:inline">Précédent</span>
              </button>

              <span className="text-sm text-gray-600 px-2 min-w-20 text-center">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className={`px-3 sm:px-4 py-2 border border-gray-400 text-sm  flex items-center gap-1 ${currentPage === totalPages
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'hover:bg-gray-100 active:bg-gray-200'
                  }`}
              >
                <span className="hidden sm:inline">Suivant</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

      
        </div>
      </div>

      {/* Products Section */}
      <div className="flex-1 flex flex-col px-2 sm:px-4">
        {/* Active Filters Info */}
      
        {/* Products Grid */}
        <div className="flex-1 overflow-hidden">
          {currentProducts.length === 0 && !isSearching ? (
            <div className="border-2 border-dashed border-gray-300 p-4 sm:p-8 h-full flex flex-col items-center justify-center bg-linear-to-br from-gray-50 to-gray-100">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-4">
                  <Receipt className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" />
                </div>

                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Aucun produit trouvé
                </h3>
                <p className="text-gray-600 mb-4 text-sm sm:text-base">
                  {isCurrentlySearching
                    ? `Aucun produit ne correspond Ã  votre recherche`
                    : selectedCategory !== 'Tous'
                      ? `Aucun produit dans la catégorie "${selectedCategory}"`
                      : 'Aucun produit disponible'
                  }
                </p>

                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    onClick={handleClearAllSearches}
                    className="px-4 py-2 bg-gray-600 text-white text-sm font-medium hover:bg-gray-700 "
                  >
                    Voir tous les produits
                  </button>
                  {isCurrentlySearching && (
                    <button
                      onClick={() => {
                        if (productSearchQuery) {
                          productSearchInputRef.current?.focus();
                        } else {
                          categorySearchInputRef.current?.focus();
                        }
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 "
                    >
                      Modifier la recherche
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {isSearching ? (
                <div className="flex justify-center items-center h-full bg-gray-50 border-2 border-dashed border-gray-300">
                  <div className="text-lg ">Recherche en cours...</div>
                </div>
              ) : (
                <>
                  {/* Products Grid Layout */}
                  <div className="bg-white border h-full border-gray-300 overflow-hidden">
                    <div
                      className="overflow-y-auto scrollbar-hidden"
                      style={{
                        maxHeight: 'calc(100vh - 420px)',
                        minHeight: '200px'
                      }}
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
                        {currentProducts.map((product) => {
                          const imageUrl = getImageUrl(product);
                          const isFavorited = isProductFavorited(product.id);

                          return (
                            <div
                              key={product.id}
                              className={`border p-4  relative border-gray-200 hover:bg-gray-50`}
                            >
                              {/* Favorite Star Button - Top Right of Card */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavoriteProduct(product.id);
                                }}
                                className={`absolute top-0 left-0 p-2  z-0 ${isFavorited
                                  ? 'text-yellow-500 bg-white'
                                  : 'text-gray-300 hover:text-yellow-500 bg-white/80 hover:bg-white'
                                  }`}
                                title={isFavorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                              >
                                {isFavorited ? (
                                  <Star className="fill-current w-4 h-4" />
                                ) : (
                                  <Star className="w-4 h-4" />
                                )}
                              </button>

                              <div className="flex items-center justify-between">
                                {/* Left Section - Product Info */}
                                <div className="flex items-center space-x-3 flex-1 min-w-0 pr-6">
                                  {/* Product Image */}
                                  <div className="w-20 h-20 flex items-center justify-center bg-gray-50 shrink-0">
                                    {imageUrl ? (
                                      <img
                                        src={imageUrl}
                                        alt={product.name}
                                        className="w-full h-full object-contain mix-blend-multiply bg-white"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      <div className="text-gray-400">
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          fill="currentColor"
                                          className="w-6 h-6"
                                          viewBox="0 0 16 16"
                                        >
                                          <path d="M7 2.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0m4.225 4.053a.5.5 0 0 0-.577.093l-3.71 4.71-2.66-2.772a.5.5 0 0 0-.63.062L.002 13v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4.5z" />
                                        </svg>
                                      </div>
                                    )}
                                  </div>

                                  {/* Product Details */}
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-sm text-gray-800 truncate uppercase">
                                      {product.name}
                                    </h3>
                                    {product.category && (
                                      <p className="text-xs text-gray-500 uppercase truncate flex items-center gap-1">
                                        {product.category}
                                        {isCategoryFavorited(product.category) && (
                                          <span title="Catégorie favorite"><Star className="fill-current w-3 h-3 text-yellow-500 shrink-0" /></span>
                                        )}
                                      </p>
                                    )}
                                    <div className="flex flex-col mt-1">
                                      {(product.remise_percentage || 0) > 0 ? (
                                        <div className="flex items-center gap-2">
                                          <span className="line-through text-gray-400 text-xs">
                                            {product.price.toFixed(3)} DT
                                          </span>
                                          <span className="font-bold text-red-600 text-sm">
                                            {(product.price * (1 - (product.remise_percentage || 0) / 100)).toFixed(3)} DT
                                          </span>
                                          <span className="bg-red-100 text-red-700 text-[10px] px-1 font-bold rounded">
                                            -{product.remise_percentage}%
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="font-bold text-gray-800 text-sm">
                                          {product.price.toFixed(3)} DT
                                        </span>
                                      )}
                                     <div className='flex items-center gap-2 mt-0.5'>
                                      {activePromotions.some(p => p.product_id === product.id && p.type === 'bundle' && p.is_active) && (
                                        <div className="flex items-center gap-1 mt-0.5 ">
                                          <span className="bg-yellow-100 items-center flex text-yellow-700 text-[10px] px-1.5 py-0.5 font-bold border border-yellow-200 uppercase tracking-tighter">
                                            Promo Offerte <Gift className='w-3 h-3 text-yellow-700 inline ml-1' />
                                          </span>
                                        </div>
                                      )}
                                      <span className={`text-xs capitalize font-medium ${product.stock > 10
                                        ? 'text-green-700'
                                        : product.stock > 0
                                          ? 'text-yellow-700'
                                          : 'text-red-700'
                                        }`}>
                                        {product.stock > 10
                                          ? `${formatStockDisplay(product)} en stock`
                                          : product.stock > 0
                                            ? `Stock faible: ${formatStockDisplay(product)}`
                                            : 'Rupture de stock'
                                        }
                                      </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Right Section - Add to Cart Button */}
                                <div className="shrink-0 ml-4">
                                  <button
                                    onClick={() => handleAddToCartClick(product)}
                                    disabled={product.stock === 0}
                                    className={`
                                      flex items-center justify-center
                                      px-6 py-5
                                      
                                      
                                      touch-manipulation
                                      ${product.stock === 0
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-gray-600 hover:bg-gray-700 active:bg-gray-800'
                                      } 
                                      text-white
                                      text-sm font-medium
                                    `}
                                  >
                                    <Plus className="w-8 h-8" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export default Products;

