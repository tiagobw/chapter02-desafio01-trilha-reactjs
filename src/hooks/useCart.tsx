import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';
interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  async function getStockById(productId: number) {
    const axiosResponse = await api.get(`/stock/${productId}`);
    const stock: Stock = axiosResponse.data;
    return stock.amount;
  }

  async function getProductById(productId: number) {
    const axiosResponse = await api.get(`/products/${productId}`);
    const product: Omit<Product, 'amount'> = axiosResponse.data;
    return product;
  }

  function setCartAndLocalStorage(cart: Product[]) {
    setCart(() => {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
      return cart;
    });
  }

  const addProduct = async (productId: number) => {
    try {
      const stockProduct = await getStockById(productId);
      const cartProduct = cart.find(product => product.id === productId);

      if (!stockProduct) {
        throw new Error();
      }

      if (stockProduct <= 1) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (!cartProduct) {
        const newProduct = await getProductById(productId);
        const newCart = [...cart, { ...newProduct, amount: 1 }];

        setCartAndLocalStorage(newCart);
        return;
      }

      updateProductAmount({ productId, amount: cartProduct.amount + 1 });
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const isProductInCart = cart.some(product => product.id === productId);

      if (!isProductInCart) {
        throw new Error();
      }

      const newCart = cart.filter(product => product.id !== productId);

      setCartAndLocalStorage(newCart);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount
  }: UpdateProductAmount) => {
    try {
      const stockProduct = await getStockById(productId);

      if (amount > stockProduct) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (amount < 1) {
        throw new Error();
      }

      if (!stockProduct) {
        throw new Error();
      }

      const updatedCart = cart.map(product => {
        if (product.id === productId) {
          return {
            ...product,
            amount: amount
          };
        }
        return product;
      });

      setCartAndLocalStorage(updatedCart);
      return;
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
