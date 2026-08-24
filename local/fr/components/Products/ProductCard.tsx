"use client";
import { Plus } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  stock: number;
  price: number;
  image: string;
  barcode?: string;
  description?: string;
  category?: string;
  remise_percentage?: number;
  ProductImages?: Array<{
    id: number;
    url: string;
    is_primary: boolean;
    product_id: number;
  }>;
}

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const handleAddToCart = () => {
    if (onAddToCart && product.stock > 0) {
      onAddToCart(product);
    }
  };

  const getImageUrl = () => {
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

  const imageUrl = getImageUrl();

  return (
    <div className="
      border border-gray-300 
      p-2 
      
      bg-white 
      w-full
      h-16 sm:h-20
      flex items-center
      gap-4
      touch-pan-y
    ">
      {/* Product Image */}
      <div className="relative w-16 h-16 sm:w-16 sm:h-16 flex items-center justify-center bg-gray-100 shrink-0">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={product.name}
            className="w-full h-full object-contain rounded mix-blend-multiply"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="text-gray-400">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              fill="currentColor" 
              className="w-8 h-8" 
              viewBox="0 0 16 16"
            >
              <path d="M7 2.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0m4.225 4.053a.5.5 0 0 0-.577.093l-3.71 4.71-2.66-2.772a.5.5 0 0 0-.63.062L.002 13v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4.5z"/>
            </svg>
          </div>
        )}
      </div>

      {/* Product Info - Flex grow to take available space */}
      <div className="flex-1 flex items-center justify-between gap-4 min-w-0">
        {/* Left Section - Product Details */}
        <div className="flex items-center w-full justify-between min-w-0">
          {/* Product Name - Top Row */}
          <h3 className="font-semibold text-xs sm:text-sm truncate uppercase tracking-wide">
            {product.name}
          </h3>
          
          {/* Bottom Row - Category, Price, Stock */}
          <div className="flex flex-col gap-1 w-full mt-1">
            <div className="flex items-center gap-2 text-sm justify-between">
              {/* Price Logic */}
              <div className="flex items-baseline gap-2">
                {product.remise_percentage && product.remise_percentage > 0 ? (
                  <>
                    <span className="font-bold text-red-600">
                      {(product.price * (1 - product.remise_percentage / 100)).toFixed(3)} DT
                    </span>
                    <span className="text-xs text-gray-400 line-through">
                      {product.price.toFixed(3)}
                    </span>
                  </>
                ) : (
                  <span className="font-bold text-gray-800">
                    {product.price.toFixed(3)} DT
                  </span>
                )}
              </div>
              
              {/* Discount Badge */}
              {product.remise_percentage && product.remise_percentage > 0 ? (
                <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold uppercase rounded-none border border-red-200">
                  -{product.remise_percentage}%
                </span>
              ) : null}
            </div>
            
            {/* Stock */}
            <span className={`text-[10px] sm:text-xs capitalize font-medium ${product.stock > 0 ? 'text-green-700' : 'text-red-700'}`}>
              {product.stock > 0 ? `${Math.floor(product.stock)} en stock` : 'Rupture de stock'}
            </span>
          </div>
        </div>

        {/* Right Section - Add to Cart Button */}
        <button
          onClick={handleAddToCart}
          disabled={product.stock === 0}
          className={`
            flex items-center gap-2
            px-4 py-4
            rounded-lg
            touch-manipulation
            shrink-0
            ${product.stock === 0 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-gray-600 hover:bg-gray-700 active:bg-gray-800'
            } 
            text-white
            text-sm font-medium
          `}
        >
          {product.stock === 0 ? (
            'RUPTURE'
          ) : (
            <>
              <Plus className="w-6 h-6" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}