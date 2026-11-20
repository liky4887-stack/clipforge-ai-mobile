const fs = require('fs');
const file = 'app/ai-settings.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add imports
code = code.replace(
  "import { useRouter } from 'expo-router';", 
  "import { useState } from 'react';\nimport { useRouter } from 'expo-router';\nimport { api } from '@/services/api';"
);

// 2. Add isLoading state
code = code.replace(
  "export default function AiSettingsScreen() {\n  const router = useRouter();", 
  "export default function AiSettingsScreen() {\n  const router = useRouter();\n  const [isLoading, setIsLoading] = useState(false);"
);

// 3. Extract videoUrl from the store (Zustand)
code = code.replace(
  "const {\n    projectTitle,", 
  "const {\n    videoUrl,\n    sourceUrl,\n    projectTitle,"
);

// 4. Replace the onPress handler
const oldOnPress = `onPress={() => router.push('/processing')}`;
const newOnPress = `onPress={async () => {
          setIsLoading(true);
          try {
            const finalUrl = videoUrl || sourceUrl || '';
            const response = await api.createProject({
              videoUrl: finalUrl,
              brandTemplateId: null,
              curationPref: {
                clipDurations: [[30, 60]],
                customPrompt: customPrompt,
                genre: genre,
                model: 'clipforge-v2',
                skipCurate: false,
                skipSlicing: skipSlicing,
                topicKeywords: [],
                enableAutoHook: enableAutoHook,
                range: null,
                activeLang: null,
                narratives: null
              },
              importPref: { sourceLang: 'en' },
              renderPref: {
                layoutAspectRatio: aspectRatio,
                enableWatermark: enableWatermark,
                enableCaption: enableCaption,
                enableEmoji: enableEmoji
              },
              uploadedVideoAttr: { title: projectTitle || 'YouTube Import', durationMs: 600000 }
            });
            router.push({
              pathname: '/processing',
              params: { projectId: response.id }
            });
          } catch (e) {
            alert("Failed to start project");
            console.error(e);
          } finally {
            setIsLoading(false);
          }
        }}
        disabled={isLoading}`;

code = code.replace(oldOnPress, newOnPress);

// 5. Update button text to show loading state
code = code.replace(
  "<Text style={styles.generateButtonText}>Generate Clips</Text>", 
  "<Text style={styles.generateButtonText}>{isLoading ? 'Starting...' : 'Generate Clips'}</Text>"
);

fs.writeFileSync(file, code);
console.log("✅ Successfully patched app/ai-settings.tsx with API call and Project ID!");
