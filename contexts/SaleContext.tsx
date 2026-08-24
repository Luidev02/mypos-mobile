import { createContext, ReactNode, useContext, useRef, useState } from 'react';

interface SaleContextData {
  customer: string;
  customerId: number;
  orderType: string;
  saleName: string;
  discount: number;
  couponId: number | null;
  couponCode: string;
  /** Nombre a mostrar en el POS (`trade_name || name` de la empresa). */
  companyDisplayName: string;
  /** Si la empresa reporta a la DIAN — decide factura POS vs. electrónica. */
  companyReportsDian: boolean;
  /** Cajero del turno — solo para mostrar en cabecera/ticket. */
  employeeName: string;
  /** Del cliente seleccionado — junto con `companyReportsDian` decide el badge de factura. */
  requiresElectronicInvoice: boolean;

  setCustomer: (name: string, id: number, requiresElectronicInvoice?: boolean) => void;
  setOrderType: (type: string) => void;
  setSaleName: (name: string) => void;
  setDiscount: (discount: number, couponId: number | null, code: string) => void;
  clearDiscount: () => void;
  resetSaleData: () => void;
  /**
   * Fija el cliente por defecto ("Consumidor Final") resuelto contra el
   * backend — reemplaza el `customerId: 1` fijo que tenía antes. Igual que
   * `fetchDefaultCustomer` en `Newsales.jsx`, aplica el valor de inmediato Y
   * lo recuerda para que `resetSaleData()` vuelva a él (no a `1`).
   */
  setDefaultCustomer: (name: string, id: number) => void;
  setCompanyInfo: (displayName: string, reportsDian: boolean) => void;
  setEmployeeName: (name: string) => void;
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
  const [companyDisplayName, setCompanyDisplayNameState] = useState('');
  const [companyReportsDian, setCompanyReportsDianState] = useState(false);
  const [employeeName, setEmployeeNameState] = useState('');
  const [requiresElectronicInvoice, setRequiresElectronicInvoiceState] = useState(false);

  // Recordados para que `resetSaleData()` vuelva al cliente por defecto real
  // (resuelto vía `setDefaultCustomer`), no a un `customerId: 1` fijo que
  // podría no existir/ser otro cliente en un tenant distinto.
  const defaultCustomerRef = useRef({ name: 'Consumidor Final', id: 1 });

  const setCustomer = (name: string, id: number, requiresElectronic: boolean = false) => {
    setCustomerState(name);
    setCustomerIdState(id);
    setRequiresElectronicInvoiceState(requiresElectronic);
  };

  const setDefaultCustomer = (name: string, id: number) => {
    defaultCustomerRef.current = { name, id };
    setCustomerState(name);
    setCustomerIdState(id);
    setRequiresElectronicInvoiceState(false);
  };

  const setCompanyInfo = (displayName: string, reportsDian: boolean) => {
    setCompanyDisplayNameState(displayName);
    setCompanyReportsDianState(reportsDian);
  };

  const setEmployeeName = (name: string) => {
    setEmployeeNameState(name);
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
    setCustomerState(defaultCustomerRef.current.name);
    setCustomerIdState(defaultCustomerRef.current.id);
    setOrderTypeState('');
    setSaleNameState('');
    setDiscountState(0);
    setCouponIdState(null);
    setCouponCodeState('');
    setRequiresElectronicInvoiceState(false);
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
        companyDisplayName,
        companyReportsDian,
        employeeName,
        requiresElectronicInvoice,
        setCustomer,
        setOrderType,
        setSaleName,
        setDiscount,
        clearDiscount,
        resetSaleData,
        setDefaultCustomer,
        setCompanyInfo,
        setEmployeeName,
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
