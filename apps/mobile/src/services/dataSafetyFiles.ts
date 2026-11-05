import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export interface PickedBackupFile {
  name: string;
  text: string;
}

export async function pickBackupFile(): Promise<PickedBackupFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/json', 'text/plain'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) throw new Error('没有选择备份文件');
  const file = new File(asset.uri);
  return {
    name: asset.name,
    text: await file.text(),
  };
}

export async function shareTextFile(options: {
  content: string;
  fileName: string;
  mimeType: string;
  dialogTitle: string;
}): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('当前设备不支持系统文件分享');
  }
  const file = new File(Paths.cache, options.fileName);
  if (file.exists) file.delete();
  file.create({ intermediates: true, overwrite: true });
  await file.write(options.content);
  try {
    await Sharing.shareAsync(file.uri, {
      dialogTitle: options.dialogTitle,
      mimeType: options.mimeType,
    });
  } finally {
    if (file.exists) file.delete();
  }
}
