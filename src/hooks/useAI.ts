import { useState, useRef, useCallback } from 'react';
import { IAP } from '@apps-in-toss/web-framework';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';

export interface ParsedEntry {
  baby: '1' | '2' | 'both';
  hour: number | null;
  minute: number | null;
  relativeMinutes: number | null;
  relativeHours: number | null;
  unit: 'ml' | 'min' | null;
  volume: number | null;
  poop: boolean;
  // 확정된 HH:MM (UI에서 수정 가능)
  resolvedTime?: string;
}

function pad2(n: number) { return String(n).padStart(2, '0'); }

function resolveTime(parsed: ParsedEntry): string {
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
  const [entries, setEntries] = useState<ParsedEntry[] | null>(null);
  const [transcript, setTranscript] = useState('');
  const [hint, setHint] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { user, decrementAiCredits, setAiCredits } = useAppStore();

  const startRecording = useCallback(async () => {
    if (!user || user.aiCredits <= 0) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { chunksRef.current.push(e.data); };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setError(null);
      setHint('녹음 중');
      return true;
    } catch (e) {
      console.error(e);
      setError('마이크 권한이 없습니다.');
      return false;
    }
  }, [user]);

  // 텍스트 → GPT 파싱 공통 로직
  const parseText = useCallback(async (text: string) => {
    const { family: fam } = useAppStore.getState();
    const firstName = fam?.firstName ?? '첫째';
    const secondName = fam?.secondName ?? '둘째';
    const now = new Date();

    const prompt = `다음 음성 텍스트에서 수유/배변 기록 정보를 추출해주세요. 여러 개의 기록이 있을 수 있습니다.
현재 시각: ${now.getHours()}시 ${now.getMinutes()}분
아기 이름: "${firstName}" (첫째=1), "${secondName}" (둘째=2), 둘 다=both
음성 텍스트: "${text}"

JSON 배열 형식으로만 응답 (entries 키 안에 배열):
{"entries":[
  {"baby":"1"|"2"|"both","hour":숫자|null,"minute":숫자|null,"relativeMinutes":숫자|null,"relativeHours":숫자|null,"unit":"ml"|"min"|null,"volume":숫자|null,"poop":true|false}
]}

규칙:
- 분유/분유수유/ml → unit="ml"
- 모유/모유수유/수유 → unit="min"
- 똥/응가/배변 → poop=true, unit=null, volume=null
- "N분 전" → relativeMinutes=N
- "N시간 전" → relativeHours=N
- "9시 반" 같은 절대시간 → hour=9, minute=30
- 첫째만/둘째만 따로 양이 다르면 별도 entry로 분리 (예: "첫째는 120, 둘째는 110" → entry 2개)
- 같은 양/같은 시간이면 baby="both" 하나로 통합
- 한 문장에 여러 기록이면 각각 entry로 분리 (예: "첫째 분유 먹이고 둘째 응가" → entry 2개)`;

    const gptResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 400,
        response_format: { type: 'json_object' },
      }),
    });
    const gptData = await gptResp.json();
    const content = gptData.choices[0].message.content;
    const parsed = JSON.parse(content);
    const rawEntries: ParsedEntry[] = Array.isArray(parsed.entries) ? parsed.entries : [];
    return rawEntries.map((e) => ({ ...e, resolvedTime: resolveTime(e) }));
  }, []);

  // 텍스트 직접 입력으로 파싱 (마이크 없이 테스트용)
  const processText = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setIsProcessing(true);
    setTranscript(text);
    setError(null);
    try {
      const resolved = await parseText(text);
      if (resolved.length === 0) {
        setError('기록을 추출하지 못했어요. 다시 시도해주세요.');
        return;
      }
      setEntries(resolved);
      setHint('인식 결과를 확인하세요');
      // 텍스트 직접 입력은 크레딧 차감 없음 (dev only)
    } catch (e) {
      console.error(e);
      setError('파싱 실패. 다시 시도해주세요.');
    } finally {
      setIsProcessing(false);
    }
  }, [parseText]);

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
          const whisperData = await whisperResp.json();
          const text: string = whisperData.text ?? '';
          setTranscript(text);

          if (!text.trim()) {
            setError('음성이 인식되지 않았어요. 다시 시도해주세요.');
            return;
          }

          const resolved = await parseText(text);
          if (resolved.length === 0) {
            setError('기록을 추출하지 못했어요. 다시 시도해주세요.');
            return;
          }
          setEntries(resolved);
          setHint('인식 결과를 확인하세요');
          decrementAiCredits();
          if (user) {
            const newCredits = Math.max(0, user.aiCredits - 1);
            await supabase.from('users').update({ ai_credits: newCredits }).eq('id', user.id);
          }
        } catch (e) {
          console.error(e);
          setError('인식 실패. 다시 시도해주세요.');
        } finally {
          setIsProcessing(false);
        }
        resolve();
      };
      recorder.stop();
    });
  }, [user, decrementAiCredits, parseText]);

  const purchaseCredits = useCallback((onSuccess: () => void) => {
    if (!IAP) { alert('인앱결제를 사용할 수 없는 환경입니다.'); return; }

    IAP.createOneTimePurchaseOrder({
      options: {
        sku: 'ai_credits_10',
        processProductGrant: async ({ orderId }) => {
          try {
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

  const updateEntry = useCallback((idx: number, patch: Partial<ParsedEntry>) => {
    setEntries((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }, []);

  const removeEntry = useCallback((idx: number) => {
    setEntries((prev) => {
      if (!prev) return prev;
      const next = prev.filter((_, i) => i !== idx);
      return next.length > 0 ? next : null;
    });
  }, []);

  const reset = useCallback(() => {
    setEntries(null);
    setTranscript('');
    setError(null);
    setHint('');
  }, []);

  return {
    isRecording, isProcessing, entries, transcript, hint, error,
    startRecording, stopAndProcess, processText, purchaseCredits, reset,
    updateEntry, removeEntry,
  };
}
