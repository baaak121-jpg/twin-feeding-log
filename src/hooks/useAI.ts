import { useState, useRef, useCallback } from 'react';
import { IAP } from '@apps-in-toss/web-framework';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';

export interface ParsedLog {
  baby: '1' | '2' | 'both';
  hour: number | null;
  minute: number | null;
  relativeMinutes: number | null;
  relativeHours: number | null;
  unit: 'ml' | 'min' | 'nap' | null;
  volume: number | null;
  poop: boolean;
}

function pad2(n: number) { return String(n).padStart(2, '0'); }

function resolveTime(parsed: ParsedLog): string {
  const now = new Date();
  let h = now.getHours();
  let m = now.getMinutes();

  if (parsed.relativeMinutes != null) {
    const total = h * 60 + m - parsed.relativeMinutes;
    h = Math.floor(((total % 1440) + 1440) % 1440 / 60);
    m = ((total % 1440) + 1440) % 1440 % 60;
  } else if (parsed.relativeHours != null) {
    h = (h - parsed.relativeHours + 24) % 24;
  } else if (parsed.hour != null) {
    h = parsed.hour;
    m = parsed.minute ?? 0;
  }

  m = Math.round(m / 5) * 5;
  if (m === 60) { m = 0; h = (h + 1) % 24; }
  return `${pad2(h)}:${pad2(m)}`;
}

export function useAI() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsed, setParsed] = useState<ParsedLog | null>(null);
  const [resolvedTime, setResolvedTime] = useState('');
  const [hint, setHint] = useState('버튼을 탭하여 녹음 시작 → 다시 탭하여 종료');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { user, family, decrementAiCredits, setAiCredits } = useAppStore();

  const startRecording = useCallback(async () => {
    if (!user || user.aiCredits <= 0) return false;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => { chunksRef.current.push(e.data); };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    setHint('녹음 중... (다시 탭하여 종료)');
    return true;
  }, [user]);

  const stopAndProcess = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    return new Promise<void>((resolve) => {
      recorder.onstop = async () => {
        setIsRecording(false);
        setIsProcessing(true);
        setHint('AI가 분석 중...');

        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        recorder.stream.getTracks().forEach((t) => t.stop());

        try {
          const { family: fam } = useAppStore.getState();
          const firstName = fam?.firstName ?? '첫째';
          const secondName = fam?.secondName ?? '둘째';

          // Whisper 음성 인식
          const formData = new FormData();
          formData.append('file', audioBlob, 'audio.webm');
          formData.append('model', 'whisper-1');
          formData.append('language', 'ko');

          const whisperResp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}` },
            body: formData,
          });
          const { text: transcript } = await whisperResp.json();

          // GPT-4o-mini 파싱
          const now = new Date();
          const prompt = `다음 음성 텍스트에서 수유 기록 정보를 추출해주세요.
현재 시각: ${now.getHours()}시 ${now.getMinutes()}분
아기 이름: "${firstName}" (첫째), "${secondName}" (둘째)
음성 텍스트: "${transcript}"

JSON으로만 응답:
{"baby":"1"|"2"|"both","hour":숫자|null,"minute":숫자|null,"relativeMinutes":숫자|null,"relativeHours":숫자|null,"unit":"ml"|"min"|"nap"|null,"volume":숫자|null,"poop":true|false}

규칙: 분유/ml→unit="ml", 모유/수유→unit="min", 낮잠→unit="nap", 똥/응가→poop=true, "N분 전"→relativeMinutes=N, 절대시간→hour/minute 직접 입력`;

          const gptResp = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}` },
            body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.2, max_tokens: 200 }),
          });
          const gptData = await gptResp.json();
          const content = gptData.choices[0].message.content;
          const match = content.match(/\{[\s\S]*\}/);
          if (match) {
            const result: ParsedLog = JSON.parse(match[0]);
            setParsed(result);
            setResolvedTime(resolveTime(result));
            setHint('인식 결과를 확인하세요');
            decrementAiCredits();
            // Supabase에도 크레딧 업데이트
            if (user) {
              const newCredits = Math.max(0, user.aiCredits - 1);
              await supabase.from('users').update({ ai_credits: newCredits }).eq('id', user.id);
            }
          }
        } catch (e) {
          setHint('인식 실패. 다시 시도해주세요.');
          console.error(e);
        } finally {
          setIsProcessing(false);
        }
        resolve();
      };
      recorder.stop();
    });
  }, [user, decrementAiCredits]);

  const purchaseCredits = useCallback((onSuccess: () => void) => {
    if (!IAP) { alert('인앱결제를 사용할 수 없는 환경입니다.'); return; }

    IAP.createOneTimePurchaseOrder({
      options: {
        sku: 'ai_credits_10',
        processProductGrant: async ({ orderId }) => {
          try {
            // 서버에서 결제 검증 후 크레딧 지급
            const edgeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/grant-ai-credits`;
            const resp = await fetch(edgeUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
              body: JSON.stringify({ orderId }),
            });
            if (!resp.ok) return false;
            const { ai_credits } = await resp.json();
            setAiCredits(ai_credits);
            onSuccess();
            return true;
          } catch {
            return false;
          }
        },
      },
      onEvent: () => {},
      onError: () => {},
    });
  }, [setAiCredits]);

  const reset = useCallback(() => {
    setParsed(null);
    setResolvedTime('');
    setHint('버튼을 탭하여 녹음 시작 → 다시 탭하여 종료');
  }, []);

  return {
    isRecording, isProcessing, parsed, resolvedTime, hint,
    startRecording, stopAndProcess, purchaseCredits, reset,
    setParsed, setResolvedTime,
  };
}
