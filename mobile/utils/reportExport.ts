import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export async function shareCsvReport(csv: string, fileName: string): Promise<void> {
  const content = String(csv || '').trim();
  if (!content) {
    throw new Error('Report is empty');
  }

  const safeName = fileName.replace(/[^\w.-]/g, '_') || 'report.csv';
  const fileUri = `${FileSystem.cacheDirectory}${safeName}`;

  await FileSystem.writeAsStringAsync(fileUri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    Alert.alert('Export saved', `Report saved to cache as ${safeName}`);
    return;
  }

  // expo-sharing only accepts file:// URIs (not content://)
  await Sharing.shareAsync(fileUri, {
    mimeType: 'text/csv',
    dialogTitle: 'Save or share report',
    UTI: 'public.comma-separated-values-text',
  });
}
