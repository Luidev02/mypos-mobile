import React, { createContext, ReactNode, useContext, useState } from 'react';

interface SaleContextData {
  customer: string;
  customerId: number;
  orderType: string;
  saleName: string;
  discount: number;
  couponId: number | null;
  couponCode: string;
  
  setCustomer: (name: string, id: number) => void;
  setOrderType: (type: string) => void;
  setSaleName: (name: string) => void;
  setDiscount: (discount: number, couponId: number | null, code: string) => void;
  clearDiscount: () => void;
  resetSaleData: () => void;
}

const SaleContext = createContext<SaleContextData | undefined>(undefined);

export function SaleProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomerState] = useState('Consumidor Final');
  const [customerId, setCustomerIdState] = useState(1);
  const [orderType, setOrderTypeState] = useState('');
  const [saleName, setSaleNameState] = useState('');
  const [discount, setDiscountState] = useState(0);
  const [couponId, setCouponIdState] = useState<number | null>(null);
  const [couponCode, setCouponCodeState] = useState('');

  const setCustomer = (name: string, id: number) => {
    setCustomerState(name);
    setCustomerIdState(id);
  };

  const setOrderType = (type: string) => {
    setOrderTypeState(type);
  };

  const setSaleName = (name: string) => {
    setSaleNameState(name);
  };

  const setDiscount = (discountValue: number, id: number | null, code: string) => {
    setDiscountState(discountValue);
    setCouponIdState(id);
    setCouponCodeState(code);
  };

  const clearDiscount = () => {
    setDiscountState(0);
    setCouponIdState(null);
    setCouponCodeState('');
  };

  const resetSaleData = () => {
    setCustomerState('Consumidor Final');
    setCustomerIdState(1);
    setOrderTypeState('');
    setSaleNameState('');
    setDiscountState(0);
    setCouponIdState(null);
    setCouponCodeState('');
  };

  return (
    <SaleContext.Provider
      value={{
        customer,
        customerId,
        orderType,
        saleName,
        discount,
        couponId,
        couponCode,
        setCustomer,
        setOrderType,
        setSaleName,
        setDiscount,
        clearDiscount,
        resetSaleData,
      }}
    >
      {children}
    </SaleContext.Provider>
  );
}

export function useSale() {
  const context = useContext(SaleContext);
  if (context === undefined) {
    throw new Error('useSale must be used within a SaleProvider');
  }
  return context;
}
