import { useState, useEffect } from 'react';

/**
 * Ativa a enquete correta com base no tempo do vídeo.
 *
 * @param {object} webinar - Dados do webinário (polls).
 * @param {number} videoTime - Tempo atual do vídeo em segundos.
 * @param {boolean} pollSubmitted - Se o participante já votou.
 * @returns {{ activePoll: object|null, setActivePoll: Function }}
 */
export function usePollActivation(webinar, videoTime, pollSubmitted) {
  const [activePoll, setActivePoll] = useState(null);

  useEffect(() => {
    if (!webinar?.polls || pollSubmitted) return;

    const active = webinar.polls.find(
      (poll) => poll.show_at_seconds <= videoTime && poll.active
    );

    if (active && !activePoll) {
      setActivePoll(active);
    }
  }, [videoTime, webinar, activePoll, pollSubmitted]);

  return { activePoll, setActivePoll };
}