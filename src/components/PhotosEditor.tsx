import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { uploadFarmPhoto } from '../data/mutations';
import { friendlyDbError } from '../domain/listing';
import { colors, font, radius, space } from '../theme';
import { Btn, Notice } from './FormBits';

const MAX_PHOTOS = 8;

interface PhotosEditorProps {
  /** Saved listing id. Photos can only be added once the listing has been saved once. */
  farmId: string | undefined;
  photos: string[];
  onChange: (next: string[]) => void;
}

export function PhotosEditor({ farmId, photos, onChange }: PhotosEditorProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string; settings?: boolean } | null>(null);

  const add = async (source: 'library' | 'camera') => {
    if (!farmId) return;
    setMessage(null);
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMessage({
        kind: 'error',
        text: `Farm Direct needs permission to use your ${source === 'camera' ? 'camera' : 'photos'}. You can allow it in Settings.`,
        settings: true,
      });
      return;
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 };
    const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets[0]) return;

    setBusy(true);
    try {
      const url = await uploadFarmPhoto(farmId, result.assets[0].uri);
      onChange([...photos, url]);
      setMessage({ kind: 'info', text: 'Photo added. Remember to save your listing.' });
    } catch (e) {
      setMessage({ kind: 'error', text: friendlyDbError((e as Error).message) });
    } finally {
      setBusy(false);
    }
  };

  if (!farmId) {
    return <Notice kind="info">Save your listing once first, then you can add photos.</Notice>;
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>Photos of your farm, stall or produce help people trust you. Up to {MAX_PHOTOS}.</Text>
      <View style={styles.grid}>
        {photos.map((uri) => (
          <View key={uri} style={styles.thumbBox}>
            <Image source={{ uri }} style={styles.thumb} contentFit="cover" cachePolicy="memory-disk" accessibilityLabel="Listing photo" />
            <Btn label="Remove" kind="danger" onPress={() => onChange(photos.filter((p) => p !== uri))} />
          </View>
        ))}
      </View>
      {photos.length < MAX_PHOTOS && (
        <>
          <Btn label={busy ? 'Adding photo…' : 'Choose a photo'} onPress={() => add('library')} disabled={busy} />
          <Btn label="Take a photo" onPress={() => add('camera')} disabled={busy} />
        </>
      )}
      {message && (
        <Notice kind={message.kind}>
          {message.text}
        </Notice>
      )}
      {message?.settings && <Btn label="Open Settings" onPress={() => Linking.openSettings()} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  hint: { fontSize: font.body, color: colors.textMuted },
  grid: { gap: space.md },
  thumbBox: { gap: space.sm },
  thumb: { width: '100%', height: 190, borderRadius: radius.card, backgroundColor: colors.chip },
});
