import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { uploadFarmPhoto } from '../data/mutations';
import { friendlyDbError } from '../domain/listing';
import { colors, radius, space, type } from '../theme';
import { Notice } from './FormBits';
import { Pad } from './EditorBits';
import { Button, Icon } from './ui';

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
    return (
      <Pad>
        <Notice kind="info">Save your listing once first, then you can add photos.</Notice>
      </Pad>
    );
  }

  return (
    <Pad>
      <Text style={styles.hint}>Photos of your farm, stall or produce help people trust you. Up to {MAX_PHOTOS}.</Text>
      <View style={styles.grid}>
        {photos.map((uri) => (
          <View key={uri} style={styles.tile}>
            <Image source={{ uri }} style={styles.thumb} contentFit="cover" cachePolicy="memory-disk" accessibilityLabel="Listing photo" />
            <Pressable
              onPress={() => onChange(photos.filter((p) => p !== uri))}
              accessibilityRole="button"
              accessibilityLabel="Remove this photo"
              hitSlop={8}
              style={({ pressed }) => [styles.remove, pressed && { opacity: 0.6 }]}
            >
              <Icon name="minus.circle.fill" size={24} color={colors.red} />
            </Pressable>
          </View>
        ))}
        {photos.length < MAX_PHOTOS && (
          <Pressable
            onPress={() => add('library')}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Choose a photo"
            accessibilityState={{ disabled: busy, busy }}
            style={({ pressed }) => [styles.tile, styles.add, pressed && { opacity: 0.6 }, busy && { opacity: 0.4 }]}
          >
            <Icon name="plus" size={28} color={colors.tint} weight="medium" />
            <Text style={styles.addLabel}>{busy ? 'Adding photo…' : 'Choose a photo'}</Text>
          </Pressable>
        )}
      </View>
      {photos.length < MAX_PHOTOS && (
        <Button label="Take a photo" variant="tinted" size="small" onPress={() => add('camera')} disabled={busy} style={styles.camera} />
      )}
      {message && <Notice kind={message.kind}>{message.text}</Notice>}
      {message?.settings && <Button label="Open Settings" variant="tinted" size="small" onPress={() => Linking.openSettings()} style={styles.camera} />}
    </Pad>
  );
}

const styles = StyleSheet.create({
  hint: { ...type.subheadline, color: colors.secondaryLabel },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: radius.group,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: colors.fill,
  },
  thumb: { width: '100%', height: '100%' },
  remove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.cell,
    alignItems: 'center',
    justifyContent: 'center',
  },
  add: { alignItems: 'center', justifyContent: 'center', gap: space.xs, padding: space.sm },
  addLabel: { ...type.caption, color: colors.tint, textAlign: 'center', fontWeight: '600' },
  camera: { alignSelf: 'flex-start' },
});
