import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import type {
  ClipProject,
  CreateProjectRequest,
  ExportableClip,
  ProgressResponse,
  SourceVideoPreflightRequest,
  SourceVideoPreflightResponse,
  UploadLinkRequest,
  UploadLinkResponse,
  ProcessingError,
} from '@/types/api';

const DEVICE_ID_KEY = 'clipforge_device_id';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

let cachedDeviceId: string | null = null;

export async function ensureDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;
  const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (stored) {
    cachedDeviceId = stored;
    return stored;
  }
  const id = Crypto.randomUUID();
  await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  cachedDeviceId = id;
  return id;
}

const client = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use(async (config) => {
  const deviceId = await ensureDeviceId();
  config.headers['x-device-id'] = deviceId;
  return config;
});

function normalizeError(error: unknown): ProcessingError {
  if (error instanceof AxiosError) {
    const message =
      (error.response?.data as { message?: string } | undefined)?.message ||
      error.message ||
      'Something went wrong. Please try again.';
    const err: ProcessingError = new Error(message);
    err.statusCode = error.response?.status;
    return err;
  }
  if (error instanceof Error) return error;
  return new Error('Something went wrong. Please try again.');
}

async function get<T>(url: string): Promise<T> {
  try {
    const { data } = await client.get<T>(url);
    return data;
  } catch (error) {
    throw normalizeError(error);
  }
}

async function post<T>(url: string, body?: unknown): Promise<T> {
  try {
    const { data } = await client.post<T>(url, body);
    return data;
  } catch (error) {
    throw normalizeError(error);
  }
}

function extractList<T>(data: unknown, key: string): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as Record<string, unknown>)[key])) {
    return (data as Record<string, unknown>)[key] as T[];
  }
  return [];
}

export const api = {
  async getProjects(): Promise<ClipProject[]> {
    const data = await get<unknown>('/clip-projects');
    return extractList<ClipProject>(data, 'projects');
  },

  async preflightSourceVideo(
    payload: SourceVideoPreflightRequest
  ): Promise<SourceVideoPreflightResponse> {
    return post<SourceVideoPreflightResponse>('/source-videos', payload);
  },

  async createUploadLink(payload: UploadLinkRequest): Promise<UploadLinkResponse> {
    return post<UploadLinkResponse>('/upload-links-v2', payload);
  },

  async createProject(payload: CreateProjectRequest): Promise<ClipProject> {
    return post<ClipProject>('/clip-projects', payload);
  },

  async getProgress(projectId: string): Promise<ProgressResponse> {
    return get<ProgressResponse>(`/cluster-jobs/${projectId}/progress`);
  },

  async getExportableClips(projectId: string): Promise<ExportableClip[]> {
    const data = await get<unknown>(`/exportable-clips?projectId=${encodeURIComponent(projectId)}`);
    return extractList<ExportableClip>(data, 'clips');
  },
};

export { API_BASE };
