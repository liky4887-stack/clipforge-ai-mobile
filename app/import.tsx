import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { Screen } from '@/components/ui';
import { useDraftStore } from '@/store/useAppStore';
import { colors, fonts, radius, spacing } from '@/lib/theme';
import { isValidYouTubeUrl } from '@/lib/utils';

export default function ImportScreen() {
  const router = useRouter();
  const { youtubeUrl, setYoutubeUrl, resetDraft } = useDraftStore();

  const youtubeValid = isValidYouTubeUrl(youtubeUrl);
  const canProceed = youtubeValid;

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
