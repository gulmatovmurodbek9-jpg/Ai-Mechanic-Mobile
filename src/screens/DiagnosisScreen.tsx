import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { createDiagnosis } from '../api/client';
import { Language, LocalAsset, VehicleProfile } from '../types';
import { useTheme } from '../theme/ThemeContext';

const { width } = Dimensions.get('window');

export function DiagnosisScreen({
  onCreated,
  onBack,
  language,
  vehicles,
}: {
  onCreated: (data?: any) => void;
  onBack?: () => void;
  language: Language;
  vehicles: VehicleProfile[];
}) {
  const { colors: theme } = useTheme();
  const [mode, setMode] = useState<'image' | 'video' | 'audio'>('image');
  const [zoom, setZoom] = useState<'0.5x' | '1x' | '2x'>('1x');
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [permission, requestPermission] = useCameraPermissions();
  const [micPerm, requestMicPerm] = useMicrophonePermissions();
  const cameraRef = useRef<CameraView>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [audioRecording, setAudioRecording] = useState<Audio.Recording | null>(null);
  const [recordDuration, setRecordDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Post-capture state
  const [asset, setAsset] = useState<LocalAsset | null>(null);
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  
  // Scanner animation
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [scanAnim]);

  useEffect(() => {
    if (isRecording) {
      setRecordDuration(0);
      timerRef.current = setInterval(() => {
        setRecordDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const translateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100], // Moves scan line up and down within the box
  });

  const handleCapture = async () => {
    if (mode === 'audio') {
      if (audioRecording) {
        // Stop audio
        setIsRecording(false);
        try {
          await audioRecording.stopAndUnloadAsync();
          const uri = audioRecording.getURI();
          if (uri) setAsset({ uri, mimeType: 'audio/m4a', name: 'audio_capture.m4a' });
        } catch (e: any) {
          Alert.alert('Audio Error', e.message || String(e));
        }
        setAudioRecording(null);
      } else {
        // Start audio
        try {
          const avPerm = await Audio.requestPermissionsAsync();
          if (!avPerm.granted) {
            Alert.alert('Permission Denied', 'Microphone permission is required for audio/video.');
            return;
          }
          await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
          const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
          setAudioRecording(recording);
          setIsRecording(true);
        } catch (e: any) {
          Alert.alert('Audio Start Error', e.message || String(e));
        }
      }
      return;
    }

    if (mode === 'video') {
      if (!cameraRef.current) return;
      if (isRecording) {
        cameraRef.current.stopRecording();
        setIsRecording(false);
      } else {
        try {
          const avPerm = await Audio.requestPermissionsAsync();
          if (!avPerm.granted) {
            Alert.alert('Permission Denied', 'Microphone permission is required to record video sound.');
            return;
          }
          setIsRecording(true);
          const video = await cameraRef.current.recordAsync();
          if (video) {
            setAsset({ uri: video.uri, mimeType: 'video/mp4', name: 'camera_capture.mp4' });
          }
        } catch (e: any) {
          setIsRecording(false);
          Alert.alert('Video Start Error', e.message || 'Failed to start video recording. Your device might not support this mode.');
        }
      }
      return;
    }

    // Photo
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
        if (photo) {
          setAsset({ uri: photo.uri, mimeType: 'image/jpeg', name: 'camera_capture.jpg' });
        }
      } catch {}
    }
  };

  const handlePickGallery = async () => {
    if (mode === 'audio') {
      console.log('[AudioPicker] opening DocumentPicker...');
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: 'audio/*',
          copyToCacheDirectory: true,
          multiple: false,
        });
        console.log('[AudioPicker] result:', JSON.stringify(result));
        if (!result.canceled && result.assets && result.assets.length > 0) {
          const picked = result.assets[0];
          console.log('[AudioPicker] setting asset:', picked.uri);
          setAsset({
            uri: picked.uri,
            mimeType: picked.mimeType || 'audio/m4a',
            name: picked.name || 'audio_file.m4a',
          });
        } else {
          console.log('[AudioPicker] user canceled or no assets');
        }
      } catch (err: any) {
        console.error('[AudioPicker] error:', err?.message || err);
        Alert.alert('Picker Error', err?.message || 'Could not open file picker');
      }
      return;
    }

    const mediaTypes =
      mode === 'video'
        ? ImagePicker.MediaTypeOptions.Videos
        : ImagePicker.MediaTypeOptions.Images;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      quality: 0.8,
    });

    if (!result.canceled) {
      const picked = result.assets[0];
      setAsset({
        uri: picked.uri,
        mimeType: picked.type === 'video' ? 'video/mp4' : 'image/jpeg',
        name: picked.fileName || `gallery_${mode}.jpg`,
      });
    }
  };

  const handleAnalyze = async () => {
    if (!asset) return;
    setAnalyzing(true);
    try {
      // By passing generic values, we force the AI to analyze the image/video to detect the real car make and model.
      const response = await createDiagnosis({
        fileType: mode,
        asset,
        carMake: 'Unknown',
        carModel: 'Vehicle',
        carYear: new Date().getFullYear(),
        description: description.trim() || undefined,
        language,
        city: city.trim() || undefined,
      });
      // Attach the local asset URI so the UI renders it before AWS S3 is fully set up
      const enhancedResponse = { ...response, localUri: asset.uri };
      onCreated(enhancedResponse);
    } catch (err) {
      console.log('Analysis Error', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleCameraFacing = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.permissionContainer, { backgroundColor: theme.bg }]}>
        <Feather name="camera-off" size={48} color={theme.textMuted} />
        <Text style={[styles.permissionText, { color: theme.text }]}>We need your permission to use the camera</Text>
        <TouchableOpacity style={[styles.permissionBtn, { backgroundColor: theme.primary }]} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Enable Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Preview Phase ──
  if (asset) {
    const isAudioOnly = asset.mimeType?.startsWith('audio');
    
    return (
      <View style={styles.container}>
        {isAudioOnly ? (
          <View style={styles.audioPreviewWrap}>
             <Feather name="mic" size={64} color="#3B82F6" />
             <Text style={styles.audioPreviewText}>Audio Recording Ready</Text>
          </View>
        ) : (
          <Image style={StyleSheet.absoluteFillObject} source={{ uri: asset.uri }} />
        )}
        
        {/* Dark overlay at bottom so text is readable */}
        <KeyboardAvoidingView 
          style={styles.previewOverlay} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          
          <View style={styles.previewHeader}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setAsset(null)}>
              <Feather name="x" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.previewBottom}>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Add context or describe the issue... (Optional)"
              placeholderTextColor="#9CA3AF"
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <TextInput
              style={[styles.descriptionInput, { marginTop: 12, height: 50 }]}
              placeholder="Your City / Location (for mechanic & shop search)"
              placeholderTextColor="#9CA3AF"
              value={city}
              onChangeText={setCity}
            />

            <TouchableOpacity 
              style={[styles.analyzeBtn, analyzing && styles.analyzeBtnDisabled]} 
              onPress={handleAnalyze} 
              disabled={analyzing}
            >
              {analyzing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="cpu" size={20} color="#FFFFFF" />
                  <Text style={styles.analyzeBtnText}>Analyze Now</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ── Camera Phase ──
  const expoZoom = zoom === '0.5x' ? 0.001 : zoom === '1x' ? 0 : 0.05;

  return (
    <View style={styles.container}>
      {mode === 'audio' ? (
        <View style={StyleSheet.absoluteFillObject}>
          {/* Black background for audio mode */}
          <View style={{ flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' }}>
             {isRecording ? (
               <Feather name="mic" size={80} color="#DC2626" />
             ) : (
               <Feather name="mic-off" size={80} color="#334155" />
             )}
          </View>
        </View>
      ) : (
        <CameraView 
          style={StyleSheet.absoluteFillObject} 
          facing={facing} 
          ref={cameraRef} 
          mode={mode === 'video' ? 'video' : 'picture'}
          zoom={expoZoom}
          enableTorch={flash === 'on'}
        />
      )}

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentBtn, mode === 'image' && styles.segmentActive]}
            onPress={() => setMode('image')}
          >
            <Text style={[styles.segmentText, mode === 'image' && styles.segmentTextActive]}>
              Photo
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, mode === 'video' && styles.segmentActive]}
            onPress={() => setMode('video')}
          >
            <Text style={[styles.segmentText, mode === 'video' && styles.segmentTextActive]}>
              Video
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, mode === 'audio' && styles.segmentActive]}
            onPress={() => setMode('audio')}
          >
            <Text style={[styles.segmentText, mode === 'audio' && styles.segmentTextActive]}>
              Audio
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.iconBtn} onPress={() => setFlash(f => f === 'on' ? 'off' : 'on')}>
          <Feather name={flash === 'on' ? "zap" : "zap-off"} size={24} color={flash === 'on' ? "#FBBF24" : "#FFFFFF"} />
        </TouchableOpacity>
      </View>

      {/* ── Center Timer Output ── */}
      {isRecording && (
        <View style={styles.timerWrap}>
           <View style={styles.timerDot} />
           <Text style={styles.timerText}>{formatTime(recordDuration)}</Text>
        </View>
      )}

      {/* ── Viewfinder Area ── */}
      <View style={styles.viewfinderWrap}>
        {mode !== 'audio' && (
          <View style={styles.viewfinderBox}>
            {/* 4 Corners */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            {/* Animated Scan line */}
            <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />
          </View>
        )}
      </View>

      {/* ── Lower Overlay Controls ── */}
      <View style={styles.overlayBottom}>
        
        {/* Info Pill */}
        <View style={styles.infoPill}>
          <Feather name={mode === 'audio' ? "mic" : "info"} size={16} color="#C4D1FA" />
          <Text style={styles.infoText}>
            {mode === 'audio' 
              ? "Hold device near the noise source." 
              : "Point camera at the engine or part."}
          </Text>
        </View>

        {/* Zoom Controls */}
        {mode !== 'audio' && (
          <View style={styles.zoomRow}>
            {(['0.5x', '1x', '2x'] as const).map((z) => (
              <TouchableOpacity
                key={z}
                style={[styles.zoomBtn, zoom === z ? styles.zoomBtnActive : styles.zoomBtnInactive]}
                onPress={() => setZoom(z)}
              >
                <Text style={[styles.zoomText, zoom === z ? styles.zoomTextActive : styles.zoomTextInactive]}>{z}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Camera Controls row */}
        <View style={styles.cameraRow}>
          {/* Gallery / Files Thumbnail */}
          <TouchableOpacity
            style={[styles.galleryBtn, mode === 'audio' && styles.galleryBtnAudio]}
            onPress={handlePickGallery}
            activeOpacity={0.85}
          >
            <Feather
              name={mode === 'audio' ? 'music' : 'image'}
              size={22}
              color="#FFFFFF"
            />
            <Text style={styles.galleryLabel}>
              {mode === 'audio' ? 'Files' : 'Gallery'}
            </Text>
          </TouchableOpacity>

          {/* Shutter Button */}
          <TouchableOpacity style={[styles.shutterRing, isRecording && { borderColor: '#FCA5A5' }]} onPress={handleCapture} activeOpacity={0.8}>
            <View style={[styles.shutterInner, mode === 'video' && { backgroundColor: '#DC2626', borderRadius: isRecording ? 10 : 35 }, mode === 'audio' && { backgroundColor: '#DC2626', borderRadius: isRecording ? 10 : 35 }]} />
          </TouchableOpacity>

          {/* Flip Camera */}
          {mode !== 'audio' ? (
            <TouchableOpacity style={styles.flipBtn} onPress={toggleCameraFacing}>
              <Feather name="refresh-ccw" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 50, height: 50 }} /> // Spacer to keep shutter centered
          )}
        </View>

        {/* Footer Text */}
        <View style={styles.footerRow}>
          <Feather name="zap" size={14} color="#9CA3AF" />
          <Text style={styles.footerText}>AI DIAGNOSTICS READY</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    flex: 1,
    overflow: 'hidden',
  },
  permissionContainer: {
    alignItems: 'center',
    backgroundColor: '#F5F6FA',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  permissionText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 24,
    marginTop: 16,
    textAlign: 'center',
  },
  permissionBtn: {
    backgroundColor: '#2256D8',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  permissionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  
  /* Header */
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    zIndex: 10,
  },
  iconBtn: {
    padding: 8,
  },
  segmentedControl: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 30,
    flexDirection: 'row',
    padding: 4,
  },
  segmentBtn: {
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  segmentActive: {
    backgroundColor: '#FFFFFF',
  },
  segmentText: {
    color: '#D1D5DB',
    fontSize: 14,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: '#2256D8',
  },

  /* Viewfinder */
  viewfinderWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  viewfinderBox: {
    height: width * 0.65,
    justifyContent: 'center',
    width: width * 0.65,
    position: 'relative',
  },
  scanLine: {
    backgroundColor: '#3B82F6',
    height: 2,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    width: '100%',
    elevation: 8,
  },
  corner: {
    borderColor: '#3B82F6',
    height: 30,
    position: 'absolute',
    width: 30,
  },
  topLeft: {
    borderLeftWidth: 3,
    borderTopLeftRadius: 12,
    borderTopWidth: 3,
    left: 0,
    top: 0,
  },
  topRight: {
    borderRightWidth: 3,
    borderTopRightRadius: 12,
    borderTopWidth: 3,
    right: 0,
    top: 0,
  },
  bottomLeft: {
    borderBottomLeftRadius: 12,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    bottom: 0,
    left: 0,
  },
  bottomRight: {
    borderBottomRightRadius: 12,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    bottom: 0,
    right: 0,
  },

  /* Overlay Bottom */
  overlayBottom: {
    alignItems: 'center',
    paddingBottom: 40,
    zIndex: 10,
  },
  
  /* Info Pill */
  infoPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  infoText: {
    color: '#F3F4F6',
    fontSize: 13,
    fontWeight: '500',
  },

  /* Zoom Row */
  zoomRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 30,
  },
  zoomBtn: {
    alignItems: 'center',
    borderRadius: 20,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  zoomBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  zoomBtnInactive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  zoomText: {
    fontSize: 13,
    fontWeight: '700',
  },
  zoomTextActive: {
    color: '#2256D8',
  },
  zoomTextInactive: {
    color: 'rgba(255,255,255,0.7)',
  },

  /* Camera Row */
  cameraRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '100%',
    marginBottom: 40,
  },
  galleryBtn: {
    borderColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    minHeight: 50,
    minWidth: 60,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  galleryBtnAudio: {
    backgroundColor: 'rgba(34, 86, 216, 0.25)',
    borderColor: '#93C5FD',
  },
  galleryLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  galleryThumb: {
    height: '100%',
    width: '100%',
  },
  shutterRing: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 45,
    borderWidth: 6,
    height: 90,
    justifyContent: 'center',
    width: 90,
  },
  shutterInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 35,
    height: 70,
    width: 70,
  },
  flipBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },

  /* Footer */
  footerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  footerText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },

  /* Preview Styles */
  previewOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.4)', // Dark tint for readability
  },
  previewHeader: {
    paddingHorizontal: 20,
    paddingTop: 50, // accommodate status bar
    alignItems: 'flex-start',
  },
  previewBottom: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  descriptionInput: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    color: '#FFFFFF',
    fontSize: 16,
    minHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 16,
    textAlignVertical: 'top',
  },
  analyzeBtn: {
    alignItems: 'center',
    backgroundColor: '#2256D8',
    borderRadius: 24,
    flexDirection: 'row',
    height: 56,
    justifyContent: 'center',
    gap: 10,
  },
  analyzeBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  analyzeBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  audioPreviewWrap: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioPreviewText: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#3B82F6',
    marginTop: 16,
  },
  timerWrap: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(220, 38, 38, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 50,
  },
  timerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  timerText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    letterSpacing: 1,
  }
});
