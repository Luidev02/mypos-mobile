import { BorderRadius, Colors, FontSize, Spacing } from '@/constants/theme';
import { municipalityService } from '@/services/extended';
import type { Municipality } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface MunicipalityAutocompleteProps {
  /** Texto inicial a mostrar (ej. "Bogotá — Cundinamarca" al editar). */
  initialLabel?: string;
  hasSelection: boolean;
  onSelect: (municipality: Municipality) => void;
  onClear: () => void;
}

// Réplica del autocompletado de `customers/form.jsx`: debounce de 300ms,
// mínimo 2 caracteres, lista desplegable con nombre + departamento.
export function MunicipalityAutocomplete({
  initialLabel,
  hasSelection,
  onSelect,
  onClear,
}: MunicipalityAutocompleteProps) {
  const [text, setText] = useState(initialLabel || '');
  const [results, setResults] = useState<Municipality[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setText(initialLabel || '');
  }, [initialLabel]);

  const handleChangeText = (value: string) => {
    setText(value);
    onClear();
    setShowDropdown(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        setIsSearching(true);
        const data = await municipalityService.search(value.trim());
        setResults(data);
      } catch (e) {
        console.error('Error buscando municipios:', e);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const handleSelect = (m: Municipality) => {
    const label = `${m.name}${m.department_name ? ` — ${m.department_name}` : ''}`;
    setText(label);
    onSelect(m);
    setShowDropdown(false);
    setResults([]);
  };

  return (
    <View>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Buscar municipio..."
          placeholderTextColor={Colors.textLight}
          value={text}
          onChangeText={handleChangeText}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          autoCapitalize="words"
        />
        {isSearching && <ActivityIndicator size="small" color={Colors.primary} style={styles.spinner} />}
        {!isSearching && hasSelection && (
          <Ionicons name="checkmark-circle" size={20} color={Colors.success} style={styles.spinner} />
        )}
      </View>

      {showDropdown && results.length > 0 && (
        <ScrollView style={styles.dropdown} nestedScrollEnabled keyboardShouldPersistTaps="handled">
          {results.map((m) => (
            <TouchableOpacity key={m.id} style={styles.dropdownItem} onPress={() => handleSelect(m)}>
              <Text style={styles.dropdownItemName}>{m.name}</Text>
              {m.department_name && <Text style={styles.dropdownItemDept}> — {m.department_name}</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    paddingRight: Spacing.xl + Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: Colors.white,
  },
  spinner: {
    position: 'absolute',
    right: Spacing.md,
  },
  dropdown: {
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    maxHeight: 220,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  dropdownItemName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  dropdownItemDept: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
  },
});
