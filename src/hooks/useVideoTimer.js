import { useState, useEffect, useRef } from 'react';

/**
 * Controla o timer de progresso do vídeo (1 tick/segundo).
 *
 * @returns {{ videoTime: number, videoIntervalRef: React.MutableRefObject<number|null> }}
 */
export function useVideoTimer() {
  const [videoTime, setVideoTime] = useState(0);
  const videoIntervalRef = useRef(null);

  useEffect(() => {
    videoIntervalRef.current = setInterval(() => {
      setVideoTime((prev) => prev + 1);
    }, 1000);

    return () => {
      if (videoIntervalRef.current) {
        clearInterval(videoIntervalRef.current);
      }
    };
  }, []);

  return { videoTime, videoIntervalRef };
}