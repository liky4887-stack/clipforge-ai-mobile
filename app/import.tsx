import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, ArrowRight, Link2, Upload, Video } from 'lucide-react-native';
import { Screen } from '@/components/ui';
import { useDraftStore, type DraftVideoAsset } from '@/store/useAppStore';
import { colors, fonts, radius, spacing } from '@/lib/theme';
import { formatDuration, formatFileSize, isValidYouTubeUrl } from '@/lib/utils';

export default function ImportScreen() {
  const router = useRouter();
  const {
    sourceType,
    videoAsset,
    youtubeUrl,
    setSourceType,
    setVideoAsset,
    setYoutubeUrl,
    resetDraft,
  } = useDraftStore();
  const [picking, setPicking] = useState(false);

  const youtubeValid = isValidYouTubeUrl(youtubeUrl);
  const canProceed = sourceType === 'local' ? !!videoAsset : youtubeValid;

  const pickVideo = async () => {
    setPicking(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow access to your photo library to pick a video.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        quality: 1,
        videoMaxDuration: 3600,
      });
      if (result.canceled || result.assets.length === 0) return;
      const asset = result.assets[0];
      const draft: DraftVideoAsset = {
        uri: asset.uri,
        title: asset.fileName || asset.assetId || 'My Video',
        durationMs: Math.round((asset.duration ?? 0) * 1000),
        fileSize: asset.fileSize ?? null,
      };
      setVideoAsset(draft);
    } catch {
      Alert.alert('Error', 'Could not pick the video. Please try again.');
    } finally {
      setPicking(false);
    }
  };

  const goNext = () => {
    if (!canProceed) return;
    router.push('/ai-settings');
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
          onPress={() => {
            resetDraft();
            router.back();
          }}
        >
          <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>Import Video</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.tabRow}>
          {(['local', 'youtube'] as const).map((type) => (
            <Pressable
              key={type}
              style={[styles.tab, sourceType === type && styles.tabActive]}
              onPress={() => setSourceType(type)}
            >
              {type === 'local' ? (
                <Upload size={16} color={sourceType === type ? colors.primary : colors.textMuted} strokeWidth={2} />
              ) : (
                <Link2 size={16} color={sourceType === type ? colors.primary : colors.textMuted} strokeWidth={2} />
              )}
              <Text style={[styles.tabText, sourceType === type && styles.tabTextActive]}>
                {type === 'local' ? 'Local Upload' : 'YouTube Link'}
              </Text>
            </Pressable>
          ))}
        </View>

        {sourceType === 'local' ? (
          <View style={styles.section}>
            <Pressable
              style={({ pressed }) => [styles.dropZone, pressed && { opacity: 0.7 }]}
              onPress={pickVideo}
            >
              {picking ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : videoAsset ? (
                <Video size={40} color={colors.primary} strokeWidth={1.5} />
              ) : (
                <Upload size={40} color={colors.textMuted} strokeWidth={1.5} />
              )}
              {videoAsset ? (
                <>
                  <Text style={styles.pickTitle}>{videoAsset.title}</Text>
                  <Text style={styles.pickMeta}>
                    {videoAsset.durationMs ? formatDuration(videoAsset.durationMs) : ''}
                    {videoAsset.fileSize ? `  ·  ${formatFileSize(videoAsset.fileSize)}` : ''}
                  </Text>
                  <Text style={styles.pickAgain}>Tap to choose a different video</Text>
                </>
              ) : (
                <>
                  <Text style={styles.pickTitle}>Choose from gallery</Text>
                  <Text style={styles.pickMeta}>MP4, MOV up to 2 hours</Text>
                </>
              )}
            </Pressable>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.label}>YouTube URL</Text>
            <TextInput
              style={styles.input}
              placeholder="https://youtube.com/watch?v=…"
              placeholderTextColor={colors.textMuted}
              value={youtubeUrl}
              onChangeText={setYoutubeUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            {youtubeUrl.length > 0 && !youtubeValid ? (
              <Text style={styles.hintError}>Enter a valid YouTube video link</Text>
            ) : (
              <Text style={styles.hint}>Paste any public YouTube video link</Text>
            )}
          </View>
        )}

        <View style={styles.footerSpace} />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.nextButton,
            !canProceed && styles.nextButtonDisabled,
            pressed && canProceed && { opacity: 0.85 },
          ]}
          onPress={goNext}
          disabled={!canProceed}
        >
          <Text style={[styles.nextButtonText, !canProceed && { color: colors.textMuted }]}>
            Next: AI Settings
          </Text>
          <ArrowRight
            size={18}
            color={canProceed ? '#FFFFFF' : colors.textMuted}
            strokeWidth={2.5}
          />
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl + 8,
    paddingBottom: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    fontFamily: fonts.semiBold,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingTop: spacing.md,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  tabActive: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    fontFamily: fonts.semiBold,
  },
  tabTextActive: {
    color: colors.primary,
  },
  section: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    fontFamily: fonts.semiBold,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.regular,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fonts.regular,
  },
  hintError: {
    fontSize: 12,
    color: colors.error,
    fontFamily: fonts.regular,
  },
  dropZone: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderStyle: 'dashed',
    borderRadius: radius.xl,
    paddingVertical: spacing.xl * 1.6,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
  },
  pickTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    fontFamily: fonts.semiBold,
    textAlign: 'center',
  },
  pickMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    textAlign: 'center',
  },
  pickAgain: {
    fontSize: 12,
    color: colors.primary,
    fontFamily: fonts.medium,
    marginTop: spacing.xs,
  },
  footerSpace: {
    height: spacing.xl,
  },
  footer: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 16,
  },
  nextButtonDisabled: {
    backgroundColor: colors.surfaceHighlight,
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: fonts.bold,
  },
});
