// Content script for AnimeSphere extension
// Encapsulates styles using Shadow DOM to avoid host page CSS leaks

function injectFloatingButton() {
  // Check if button is already injected
  if (document.getElementById('animesphere-ext-root')) return;

  const container = document.createElement('div');
  container.id = 'animesphere-ext-root';
  container.style.position = 'fixed';
  container.style.bottom = '24px';
  container.style.right = '24px';
  container.style.zIndex = '999999';
  container.style.fontFamily = 'system-ui, -apple-system, sans-serif';

  const shadow = container.attachShadow({ mode: 'open' });

  // Premium CSS styles with neon gradient themes and animations
  const style = document.createElement('style');
  style.textContent = `
    .btn-container {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .floating-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      background: rgba(8, 8, 16, 0.85);
      color: #ffffff;
      border: 1px solid rgba(0, 240, 255, 0.35);
      border-radius: 9999px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3), 0 0 15px rgba(0, 240, 255, 0.15);
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      user-select: none;
      outline: none;
    }
    .floating-btn:hover {
      transform: translateY(-2px) scale(1.03);
      border-color: rgba(255, 0, 127, 0.6);
      box-shadow: 0 6px 25px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 0, 127, 0.3);
    }
    .floating-btn:active {
      transform: translateY(1px) scale(0.98);
    }
    .icon {
      width: 16px;
      height: 16px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2.5;
      stroke-linecap: round;
      stroke-linejoin: round;
      animation: spin 6s linear infinite;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      background-color: #00F0FF;
      border-radius: 50%;
      box-shadow: 0 0 8px #00F0FF;
      animation: pulse 1.8s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.9); opacity: 0.6; }
      50% { transform: scale(1.25); opacity: 1; box-shadow: 0 0 12px #FF007F; background-color: #FF007F; }
      100% { transform: scale(0.9); opacity: 0.6; }
    }
  `;

  const button = document.createElement('button');
  button.className = 'floating-btn';
  button.innerHTML = `
    <svg class="icon" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      <path d="M2 12h20"></path>
    </svg>
    <span>Смотреть в AnimeSphere</span>
    <span class="pulse-dot"></span>
  `;

  button.addEventListener('click', () => {
    const currentUrl = window.location.href;
    // Redirect active tab to deep-link custom protocol
    window.location.href = `animesphere://play?url=${encodeURIComponent(currentUrl)}`;
  });

  shadow.appendChild(style);
  shadow.appendChild(button);
  document.body.appendChild(container);
}

// Resilient loading check
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  injectFloatingButton();
} else {
  document.addEventListener('DOMContentLoaded', injectFloatingButton);
}
