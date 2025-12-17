import { API_CONFIG } from '@/constants/api';
import type { User } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

class StorageService {
  // Token management
  async saveToken(token: string): Promise<void> {
    await AsyncStorage.setItem(API_CONFIG.TOKEN_KEY, token);
  }

  async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem(API_CONFIG.TOKEN_KEY);
  }

  async removeToken(): Promise<void> {
    await AsyncStorage.removeItem(API_CONFIG.TOKEN_KEY);
  }

  // User info management
  async saveUserInfo(user: User): Promise<void> {
    await AsyncStorage.setItem(API_CONFIG.USER_INFO_KEY, JSON.stringify(user));
  }

  async getUserInfo(): Promise<User | null> {
    const userInfo = await AsyncStorage.getItem(API_CONFIG.USER_INFO_KEY);
    return userInfo ? JSON.parse(userInfo) : null;
  }

  async removeUserInfo(): Promise<void> {
    await AsyncStorage.removeItem(API_CONFIG.USER_INFO_KEY);
  }

  // Clear all auth data
  async clearAuth(): Promise<void> {
    await Promise.all([
      this.removeToken(),
      this.removeUserInfo(),
    ]);
  }

  // Generic storage methods
  async setItem(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  }

  async getItem(key: string): Promise<string | null> {
    return await AsyncStorage.getItem(key);
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }

  async setObject<T>(key: string, value: T): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  }

  async getObject<T>(key: string): Promise<T | null> {
    const item = await AsyncStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  }
}

export const storageService = new StorageService();
