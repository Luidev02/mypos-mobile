import { ENDPOINTS } from '@/constants/api';
import type { ImportExportEntity, ImportResult } from '@/types';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { apiService } from './api';

const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

async function downloadAndShare(buffer: ArrayBuffer, filename: string): Promise<void> {
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(new Uint8Array(buffer));

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: EXCEL_MIME, dialogTitle: 'Compartir archivo' });
  } else {
    throw new Error('No hay una forma de compartir archivos disponible en este dispositivo');
  }
}

// `services/importExport.ts` — igual que el `import-export.api.js` del web,
// pero adaptado a RN: el web usa `Blob` + `URL.createObjectURL` + `<a
// download>`, que no existen en RN. Acá se descarga el binario real
// (`responseType: 'arraybuffer'`, confirmado que el backend envía un buffer
// real vía `res.send(Buffer.from(buffer))`, no una URL/base64), se escribe a
// un archivo temporal y se entrega al share sheet nativo.
export const importExportService = {
  async downloadTemplate(entity: ImportExportEntity): Promise<void> {
    const buffer = await apiService.getToken<ArrayBuffer>(ENDPOINTS.IMPORT_EXPORT.TEMPLATE(entity), {
      responseType: 'arraybuffer',
    });
    await downloadAndShare(buffer, `plantilla_${entity}.xlsx`);
  },

  async exportData(entity: ImportExportEntity): Promise<void> {
    const buffer = await apiService.getToken<ArrayBuffer>(ENDPOINTS.IMPORT_EXPORT.EXPORT(entity), {
      responseType: 'arraybuffer',
    });
    const today = new Date().toISOString().split('T')[0];
    await downloadAndShare(buffer, `${entity}_${today}.xlsx`);
  },

  // `fileUri`/`fileName`/`mimeType` vienen de `expo-document-picker`. El
  // backend espera multipart con un campo llamado exactamente `file`
  // (`multer` con `.single('file')`).
  async importFile(entity: ImportExportEntity, fileUri: string, fileName: string, mimeType?: string): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: mimeType || EXCEL_MIME,
    } as any);

    const response = await apiService.postToken<{ data: ImportResult; message: string }>(
      ENDPOINTS.IMPORT_EXPORT.IMPORT(entity),
      formData
    );
    return response.data;
  },
};
