import { useState, useEffect, useRef } from 'react';

/**
 * Gerencia notificações de venda (prova social) que aparecem como toasts
 * no timeline do vídeo.
 *
 * @param {object} webinar - Dados do webinário (sales_notifications).
 * @param {number} videoTime - Tempo atual do vídeo em segundos.
 * @returns {{ visibleSaleToasts: Array }}
 */
export function useSalesToasts(webinar, videoTime) {
  const [visibleSaleToasts, setVisibleSaleToasts] = useState([]);
  const firedSalesRef = useRef(new Set());

  useEffect(() => {
    const sales = webinar?.sales_notifications || [];
    sales.forEach((sale) => {
      if (videoTime >= sale.show_at_seconds && !firedSalesRef.current.has(sale.id)) {
        firedSalesRef.current.add(sale.id);
        setVisibleSaleToasts((prev) => [...prev, sale]);
        setTimeout(() => {
          setVisibleSaleToasts((prev) => prev.filter((s) => s.id !== sale.id));
        }, 6000);
      }
    });
  }, [videoTime, webinar]);

  return { visibleSaleToasts };
}