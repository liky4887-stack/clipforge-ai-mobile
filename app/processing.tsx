import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { Check, Loader2, TriangleAlert, X } from 'lucide-react-native';
import { Screen } from '@/components/ui';
import { api } from '@/services/api';
import { useDraftStore, useDataStore } from '@/store/useAppStore';
import { colors, fonts, radius, spacing } from '@/lib/theme';
import type { ProcessingError, ProgressResponse } from '@/types/api';

const POLL_INTERVAL_MS = 3000;
const SIZE = 200;
const STROKE = 10;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const DEFAULT_STAGES: ProgressResponse['stages'] = [
  { key: 'transcribing', label: 'Transcribing', status: 'pending' },
  { key: 'analyzing', label: 'AI Analysis', status: 'pending' },
  { key: 'rendering', label: 'Rendering', status: 'pending' },
];

function isProgressResponse(data: unknown): data is ProgressResponse {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return typeof d.status === 'string' && typeof d.progress === 'number' && Array.isArray(d.stages);
}

export default function ProcessingScreen() {
  const router = useRouter();
  const draft = useDraftStore();
  const resetClips = useDataStore((s) => s.resetClips);

  const [progressData, setProgressData] = useState<ProgressResponse>({
    projectId: '',
    status: 'processing',
    progress: 0,
    stages: DEFAULT_STAGES,
  });
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  const startedRef = useRef(false);
  const navigatingRef = useRef(false);

  const startPipeline = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setError(null);
    try {
      const isYoutube = draft.sourceType === 'youtube';
      const videoUrl = isYoutube ? draft.youtubeUrl : (draft.videoAsset?.uri ?? '');
      const title =
        draft.projectTitle.trim() ||
        (isYoutube ? 'YouTube Import' : draft.videoAsset?.title || 'My Video');
      const durationMs = isYoutube ? 600000 : (draft.videoAsset?.durationMs ?? 0);

      const preflight = await api.preflightSourceVideo({
        sourceUrl: videoUrl,
        sourceType: isYoutube ? 'youtube' : 'local',
        title,
        durationMs,
      });

      let finalVideoUrl = videoUrl;
      if (!isYoutube) {
        const link = await api.createUploadLink({
          videoId: preflight.videoId,
          fileName: title.replace(/\s+/g, '-').toLowerCase() || 'video.mp4',
          contentType: 'video/mp4',
        });
        finalVideoUrl = link.videoUrl || link.uploadUrl;
      }

      const project = await api.createProject({
        videoUrl: finalVideoUrl,
        brandTemplateId: null,
        curationPref: {
          clipDurations: draft.clipDurations.map((d) => [0, d]),
          customPrompt: draft.customPrompt,
          genre: draft.genre,
          model: 'clipforge-v2',
          skipCurate: false,
          skipSlicing: draft.skipSlicing,
          topicKeywords: [],
          enableAutoHook: draft.enableAutoHook,
          range: null,
          activeLang: null,
          narratives: null,
        },
        importPref: { sourceLang: 'en' },
        renderPref: {
          layoutAspectRatio: draft.aspectRatio,
          enableWatermark: draft.enableWatermark,
          enableCaption: draft.enableCaption,
          enableEmoji: draft.enableEmoji,
        },
        uploadedVideoAttr: { title, durationMs },
      });

      setProjectId(project.id);
    } catch (err) {
      const e = err as ProcessingError;
      setError(e.message || 'Failed to start processing. Please try again.');
    }
  }, [draft]);

  useEffect(() => {
    startPipeline();
  }, [startPipeline]);

  useEffect(() => {
    if (!projectId || error) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const data = await api.getProgress(projectId);
        if (cancelled) return;
        if (isProgressResponse(data)) {
          setProgressData({
            ...data,
            stages: data.stages.length > 0 ? data.stages : DEFAULT_STAGES,
          });
          if (data.status === 'completed' && !navigatingRef.current) {
            navigatingRef.current = true;
            resetClips();
            router.replace({ pathname: '/results', params: { projectId } });
          } else if (data.status === 'failed') {
            setError(data.currentStage || 'Processing failed. Please try again.');
          }
        }
      } catch (err) {
        if (!cancelled) {
          const e = err as ProcessingError;
          setError(e.message || 'Lost connection while processing.');
        }
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [projectId, error, resetClips, router]);

  const progress = Math.min(1, Math.max(0, progressData.progress));
  const done = error !== null;

  const stageIcon = (status: string) => {
    if (status === 'completed') {
      return (
        <View style={[styles.stageIcon, styles.stageIconDone]}>
          <Check size={14} color={colors.success} strokeWidth={3} />
        </View>
      );
    }
    if (status === 'active') {
      return (
        <View style={[styles.stageIcon, styles.stageIconActive]}>
          <Loader2 size={14} color={colors.primary} strokeWidth={2.5} />
        </View>
      );
    }
    return <View style={[styles.stageIcon, styles.stageIconPending]} />;
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Processing</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.progressWrap}>
          <Svg width={SIZE} height={SIZE}>
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke={colors.surfaceHighlight}
              strokeWidth={STROKE}
              fill="none"
            />
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke={done ? colors.error : colors.primary}
              strokeWidth={STROKE}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - (done ? 1 : progress))}
              rotation="-90"
              origin={`${SIZE / 2}, ${SIZE / 2}`}
            />
          </Svg>
          <View style={styles.progressCenter}>
            {done ? (
              <TriangleAlert size={32} color={colors.error} strokeWidth={2} />
            ) : (
              <>
                <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
                <Text style={styles.progressLabel}>Processing</Text>
              </>
            )}
          </View>
        </View>

        {done ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <Pressable
              style={({ pressed }) => [styles.retryButton, pressed && { opacity: 0.8 }]}
              onPress={() => {
                startedRef.current = false;
                navigatingRef.current = false;
                setError(null);
                setProgressData({ projectId: '', status: 'processing', progress: 0, stages: DEFAULT_STAGES });
                startPipeline();
              }}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.backHomeButton, pressed && { opacity: 0.8 }]}
              onPress={() => {
                draft.resetDraft();
                router.dismissAll();
                router.back();
              }}
            >
              <X size={16} color={colors.textSecondary} strokeWidth={2.5} />
              <Text style={styles.backHomeText}>Back to Projects</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.stageList}>
            {progressData.stages.map((stage) => (
              <View key={stage.key} style={styles.stageRow}>
                {stageIcon(stage.status)}
                <Text
                  style={[
                    styles.stageLabel,
                    stage.status === 'completed' && { color: colors.textSecondary },
                    stage.status === 'active' && { color: colors.text },
                  ]}
                >
                  {stage.label}
                </Text>
                {stage.status === 'active' ? (
                  <View style={styles.activeDot} />
                ) : null}
              </View>
            ))}
          </View>
        )}
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
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    fontFamily: fonts.semiBold,
    flex: 1,
    textAlign: 'center',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.xl,
  },
  progressWrap: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCenter: {
    position: 'absolute',
    alignItems: 'center',
    gap: 4,
  },
  progressPercent: {
    fontSize: 44,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fonts.bold,
    lineHeight: 50,
  },
  progressLabel: {
    fontSize: 13,
    color: colors.textMuted,
    fontFamily: fonts.medium,
  },
  stageList: {
    width: '100%',
    gap: spacing.md,
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  stageIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageIconDone: {
    backgroundColor: colors.successSoft,
  },
  stageIconActive: {
    backgroundColor: colors.primarySoft,
  },
  stageIconPending: {
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
  },
  stageLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
    fontFamily: fonts.semiBold,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  errorBox: {
    width: '100%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fonts.bold,
  },
  errorMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    textAlign: 'center',
    lineHeight: 19,
  },
  retryButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.xl,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: fonts.bold,
  },
  backHomeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  backHomeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: fonts.semiBold,
  },
});
