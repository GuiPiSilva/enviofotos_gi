import { scrypt } from 'scrypt-js';
const form = document.getElementById('form');
const password = document.getElementById('password');
const confirmation = document.getElementById('confirmation');
const message = document.getElementById('message');
const result = document.getElementById('result');
const hash = document.getElementById('hash');
const button = document.getElementById('generate');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  message.textContent = '';
  result.hidden = true;
  if (password.value !== confirmation.value) {
    message.textContent = 'As senhas não coincidem.';
    return;
  }
  if (password.value.length < 12) {
    message.textContent = 'Escolha pelo menos 12 caracteres.';
    return;
  }
  button.disabled = true;
  button.textContent = 'GERANDO...';
  try {
    const bytes = await scrypt(
      new TextEncoder().encode(password.value),
      new TextEncoder().encode('gi-gallery-v1'),
      16384, 8, 1, 64
    );
    hash.value = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
    result.hidden = false;
    password.value = '';
    confirmation.value = '';
  } catch {
    message.textContent = 'Não foi possível gerar o código. Tente outro navegador.';
  } finally {
    button.disabled = false;
    button.textContent = 'GERAR CÓDIGO DE ACESSO ↗';
  }
});
document.getElementById('copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(hash.value);
    message.style.color = '#277154';
    message.textContent = 'Código copiado! Agora cole na Vercel.';
  } catch {
    hash.select();
    message.textContent = 'Selecione e copie o código exibido.';
  }
});
