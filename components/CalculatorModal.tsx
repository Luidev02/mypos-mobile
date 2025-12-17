import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface CalculatorModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CalculatorModal({ visible, onClose }: CalculatorModalProps) {
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('');
  const expressionRef = useRef('');

  useEffect(() => {
    expressionRef.current = expression;
  }, [expression]);

  // Escuchar teclado cuando modal está abierto
  useEffect(() => {
    if (!visible) {
      setExpression('');
      setResult('');
      expressionRef.current = '';
      return;
    }

    const handleKeyPress = (e: any) => {
      const key = e.key;
      if (key >= '0' && key <= '9') handleInput(key);
      else if (['+', '-', '*', '/'].includes(key)) handleInput(key);
      else if (key === '.') handleInput('.');
      else if (key === 'Enter' || key === '=') handleCalculate();
      else if (key === 'Backspace') handleBackspace();
      else if (key === 'Escape' || key === 'Delete') handleClear();
    };

    // Solo funciona en web
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [visible]);

  const handleInput = (input: string) => {
    const lastChar = expressionRef.current.slice(-1);
    const operators = ['+', '-', '*', '/'];

    // Prevenir operadores múltiples consecutivos
    if (operators.includes(input) && operators.includes(lastChar)) {
      expressionRef.current = expressionRef.current.slice(0, -1) + input;
    } else {
      expressionRef.current = `${expressionRef.current}${input}`;
    }
    setExpression(expressionRef.current);
    setResult(''); // Limpiar resultado mientras se escribe
  };

  const handleCalculate = () => {
    if (!expressionRef.current.trim()) return;

    try {
      // Evaluar expresión de forma segura
      const evaluatedResult = Function('"use strict"; return (' + expressionRef.current + ')')();
      const formattedResult = Number.isInteger(evaluatedResult)
        ? evaluatedResult.toString()
        : evaluatedResult.toFixed(2);
      setResult(formattedResult);
    } catch (error) {
      setResult('Error');
    }
  };

  const handleBackspace = () => {
    expressionRef.current = expressionRef.current.slice(0, -1);
    setExpression(expressionRef.current);
    setResult('');
  };

  const handleClear = () => {
    expressionRef.current = '';
    setExpression('');
    setResult('');
  };

  const handleUseResult = () => {
    if (result && result !== 'Error') {
      expressionRef.current = result;
      setExpression(result);
      setResult('');
    }
  };

  const Button = ({
    label,
    onPress,
    variant = 'default',
    span = 1,
  }: {
    label: string;
    onPress: () => void;
    variant?: 'default' | 'operator' | 'equals' | 'clear';
    span?: number;
  }) => {
    const buttonStyle = [
      styles.button,
      variant === 'operator' && styles.buttonOperator,
      variant === 'equals' && styles.buttonEquals,
      variant === 'clear' && styles.buttonClear,
      span === 2 && styles.buttonSpan2,
    ];

    const textStyle = [
      styles.buttonText,
      (variant === 'operator' || variant === 'equals' || variant === 'clear') &&
        styles.buttonTextWhite,
    ];

    return (
      <TouchableOpacity style={buttonStyle} onPress={onPress} activeOpacity={0.7}>
        <Text style={textStyle}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Calculadora</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.display}>
          <Text style={styles.expressionText} numberOfLines={2}>
            {expression || '0'}
          </Text>
          {result && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultText}>{result}</Text>
              {result !== 'Error' && (
                <TouchableOpacity onPress={handleUseResult} style={styles.useResultButton}>
                  <Text style={styles.useResultText}>Usar</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View style={styles.keyboard}>
          {/* Fila 1 */}
          <View style={styles.row}>
            <Button label="C" onPress={handleClear} variant="clear" />
            <Button label="⌫" onPress={handleBackspace} variant="operator" />
            <Button label="/" onPress={() => handleInput('/')} variant="operator" />
            <Button label="*" onPress={() => handleInput('*')} variant="operator" />
          </View>

          {/* Fila 2 */}
          <View style={styles.row}>
            <Button label="7" onPress={() => handleInput('7')} />
            <Button label="8" onPress={() => handleInput('8')} />
            <Button label="9" onPress={() => handleInput('9')} />
            <Button label="-" onPress={() => handleInput('-')} variant="operator" />
          </View>

          {/* Fila 3 */}
          <View style={styles.row}>
            <Button label="4" onPress={() => handleInput('4')} />
            <Button label="5" onPress={() => handleInput('5')} />
            <Button label="6" onPress={() => handleInput('6')} />
            <Button label="+" onPress={() => handleInput('+')} variant="operator" />
          </View>

          {/* Fila 4 */}
          <View style={styles.row}>
            <Button label="1" onPress={() => handleInput('1')} />
            <Button label="2" onPress={() => handleInput('2')} />
            <Button label="3" onPress={() => handleInput('3')} />
            <Button label="=" onPress={handleCalculate} variant="equals" />
          </View>

          {/* Fila 5 */}
          <View style={styles.row}>
            <Button label="0" onPress={() => handleInput('0')} span={2} />
            <Button label="." onPress={() => handleInput('.')} />
            <View style={{ width: 70 }} />
          </View>
        </View>

        <View style={styles.hints}>
          <Text style={styles.hintText}>💡 Atajos de teclado (Web):</Text>
          <Text style={styles.hintText}>Enter/= → Calcular • Esc → Limpiar • Backspace → Borrar</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    ...Shadow.sm,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  display: {
    backgroundColor: Colors.white,
    padding: Spacing.xl,
    minHeight: 140,
    justifyContent: 'flex-end',
    ...Shadow.sm,
  },
  expressionText: {
    fontSize: 36,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'right',
  },
  resultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  resultText: {
    fontSize: 28,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  useResultButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  useResultText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  keyboard: {
    flex: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flex: 1,
  },
  button: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
    minHeight: 70,
  },
  buttonSpan2: {
    flex: 2,
  },
  buttonOperator: {
    backgroundColor: Colors.primary,
  },
  buttonEquals: {
    backgroundColor: Colors.success,
  },
  buttonClear: {
    backgroundColor: Colors.error,
  },
  buttonText: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  buttonTextWhite: {
    color: Colors.white,
  },
  hints: {
    padding: Spacing.md,
    gap: Spacing.xs,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  hintText: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    textAlign: 'center',
  },
});
