const destination = "/ecyce/";
const delay = 2770;
const cookieLifetime = 60 * 60;

const countdown = document.querySelector<HTMLElement>("#countdown");
const progressBar = document.querySelector<HTMLElement>("#progress-bar");
const cookieStatus = document.querySelector<HTMLElement>("#cookie-status");

document.cookie = `ecyce_portal_pass=277; Max-Age=${cookieLifetime}; Path=/; SameSite=Lax`;
document.cookie = `ecyce_portal_source=vibing; Max-Age=${cookieLifetime}; Path=/; SameSite=Lax`;

if (cookieStatus) cookieStatus.textContent = "통행 기록 완료 · PASS 277 · SOURCE VIBING";

const startedAt = performance.now();

function updateCountdown(now: number): void {
  const elapsed = now - startedAt;
  const remaining = Math.max(0, delay - elapsed);
  const progress = Math.max(0, 1 - elapsed / delay);

  if (countdown) countdown.textContent = `${(remaining / 1000).toFixed(2)}초`;
  if (progressBar) progressBar.style.transform = `scaleX(${progress})`;

  if (remaining > 0) {
    window.requestAnimationFrame(updateCountdown);
  }
}

window.requestAnimationFrame(updateCountdown);
window.setTimeout(() => window.location.replace(destination), delay);
