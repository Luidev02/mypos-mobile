import { API_CONFIG } from '@/constants/api';
import { storageService } from '@/services/storage';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';

interface CategoryImageProps {
  categoryId: number;
  style?: any;
  placeholderColor?: string;
  placeholderSize?: number;
}

export function CategoryImage({
  categoryId,
  style,
  placeholderColor = '#CBD5E1',
  placeholderSize = 32
}: CategoryImageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadImage();
  }, [categoryId]);

  const loadImage = async () => {
    try {
      setLoading(true);
      setError(false);

      const token = await storageService.getToken();
      if (!token) {
        throw new Error('No token available');
      }

      const baseUrl = API_CONFIG.BASE_URL;
      const imageUrl = `${baseUrl}/api/categories/image/${categoryId}`;

      const response = await fetch(imageUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'image/*'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load image');
      }

      // Check if response is JSON or direct image
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        // If it's JSON, parse and get the image URL
        const data = await response.json();
        if (data && data.url) {
          setImageSrc(data.url);
        } else {
          throw new Error('No image URL in response');
        }
      } else {
        // Direct image response - convert to base64 for Android compatibility
        const blob = await response.blob();
        const reader = new (FileReader as any)();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          setImageSrc(reader.result);
        };
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading image:', err);
      setError(true);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.placeholder, style]}>
        <ActivityIndicator size="small" color={placeholderColor} />
      </View>
    );
  }

  if (error || !imageSrc) {
    return (
      <View style={[styles.placeholder, style]}>
        <Ionicons name="images-outline" size={placeholderSize} color={placeholderColor} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: imageSrc }}
      style={style}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
