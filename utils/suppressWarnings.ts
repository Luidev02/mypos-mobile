// Suprimir warnings de terceros conocidos en desarrollo
if (__DEV__) {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    const message = args[0];
    
    // Suprimir warnings conocidos de react-native-web
    if (
      typeof message === 'string' &&
      (message.includes('props.pointerEvents is deprecated') ||
       message.includes('shadow*" style props are deprecated'))
    ) {
      return;
    }
    
    originalWarn(...args);
  };
}

export { };

