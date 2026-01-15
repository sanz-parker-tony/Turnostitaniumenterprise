/**
 * GetAccessToken - Helper temporal para obtener access_token
 * Solo para testing del backend KIOSK
 */

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function GetAccessToken() {
  const [token, setToken] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);

  const handleGetToken = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error al obtener sesión:', error);
        setToken('ERROR: ' + error.message);
        return;
      }

      if (!session) {
        setToken('ERROR: No hay sesión activa. Por favor inicia sesión primero.');
        return;
      }

      const accessToken = session.access_token;
      setToken(accessToken);
      console.log('✅ ACCESS_TOKEN:', accessToken);
      
      // Auto-copiar al portapapeles (silencioso si falla)
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(accessToken);
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
        }
      } catch (clipboardError) {
        // Silencioso: el clipboard puede estar bloqueado por política de permisos
        console.log('ℹ️ Clipboard no disponible. Usa el botón \"Copiar Token\" manualmente.');
      }
    } catch (err) {
      console.error('Error inesperado:', err);
      setToken('ERROR: ' + String(err));
    }
  };

  const handleCopy = async () => {
    if (token && !token.startsWith('ERROR')) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(token);
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
        } else {
          // Fallback: crear textarea temporal
          const textarea = document.createElement('textarea');
          textarea.value = token;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
        }
      } catch (err) {
        console.error('Error al copiar:', err);
        // Mensaje visual al usuario
        alert('Error al copiar. Por favor copia manualmente el token.');
      }
    }
  };

  // Atajo de teclado: Ctrl + Shift + T
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        setVisible(prev => !prev);
      }
    });
  }

  if (!visible) {
    return (
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 9999
      }}>
        <button
          onClick={() => setVisible(true)}
          style={{
            background: '#0074d9',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,116,217,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          🔑 Get Token
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'white',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
      maxWidth: '500px',
      zIndex: 9999,
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#2d3748' }}>
          🔑 Access Token
        </h3>
        <button
          onClick={() => setVisible(false)}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0',
            color: '#a0aec0'
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <button
          onClick={handleGetToken}
          style={{
            background: '#2ecc71',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            width: '100%'
          }}
        >
          📡 Obtener Token
        </button>
      </div>

      {token && (
        <>
          <div style={{
            background: token.startsWith('ERROR') ? '#fff5f5' : '#f7fafc',
            border: `1px solid ${token.startsWith('ERROR') ? '#fc8181' : '#cbd5e0'}`,
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '10px',
            fontSize: '12px',
            fontFamily: 'Monaco, monospace',
            wordBreak: 'break-all',
            maxHeight: '150px',
            overflowY: 'auto',
            color: token.startsWith('ERROR') ? '#c53030' : '#2d3748'
          }}>
            {token}
          </div>

          {!token.startsWith('ERROR') && (
            <button
              onClick={handleCopy}
              style={{
                background: copied ? '#2ecc71' : '#718096',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                width: '100%',
                transition: 'all 0.3s'
              }}
            >
              {copied ? '✅ Copiado!' : '📋 Copiar Token'}
            </button>
          )}
        </>
      )}

      <div style={{
        marginTop: '15px',
        padding: '10px',
        background: '#ebf8ff',
        borderLeft: '4px solid #0074d9',
        borderRadius: '4px',
        fontSize: '12px',
        color: '#2c5282'
      }}>
        <strong>💡 Instrucciones:</strong>
        <ol style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          <li>Click en "Obtener Token"</li>
          <li>Se copiará automáticamente</li>
          <li>Pegar en /kiosk-test.html campo ACCESS_TOKEN</li>
          <li>Listo para probar endpoints con auth</li>
        </ol>
      </div>

      <div style={{
        marginTop: '10px',
        fontSize: '11px',
        color: '#a0aec0',
        textAlign: 'center'
      }}>
        Atajo: Ctrl + Shift + T para mostrar/ocultar
      </div>
    </div>
  );
}