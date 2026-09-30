// Conexao WebSocket com reconexao automatica (backoff exponencial).
export function connectWs({ onEvent, onStatus }) {
  let ws = null;
  let closed = false;
  let attempt = 0;
  let timer = null;

  const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;

  function open() {
    if (closed) return;
    onStatus?.('connecting');
    ws = new WebSocket(url);
    ws.onopen = () => {
      attempt = 0;
      onStatus?.('open');
    };
    ws.onmessage = (e) => {
      try {
        onEvent?.(JSON.parse(e.data));
      } catch {
        /* ignore */
      }
    };
    ws.onclose = () => {
      onStatus?.('closed');
      if (closed) return;
      attempt += 1;
      const delay = Math.min(15000, 500 * 2 ** attempt);
      timer = setTimeout(open, delay);
    };
    ws.onerror = () => ws.close();
  }

  open();

  return () => {
    closed = true;
    clearTimeout(timer);
    ws?.close();
  };
}
