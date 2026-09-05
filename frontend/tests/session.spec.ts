import { test, expect } from '@playwright/test';

test('todas as páginas privadas exigem sessão e rejeitam perfil inválido', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('centraliza.demo.session', 'administrador'));
  for (const route of ['/', '/agenda', '/avisos', '/demandas', '/chats']) {
    await page.goto(route);
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('button', { name: 'Entrar como Gestor' })).toBeVisible();
    await expect(page.getByRole('navigation')).toHaveCount(0);
  }
});

test('falha ao salvar a sessão permite recuperar e entrar', async ({ page }) => {
  await page.addInitScript(() => {
    // Reutiliza o receptor original com call para simular uma falha do navegador.
    // oxlint-disable-next-line typescript/unbound-method
    const original = Storage.prototype.setItem;
    let first = true;
    Storage.prototype.setItem = function(key, value) {
      if (key === 'centraliza.demo.session' && first) {
        first = false;
        throw new Error('Falha de escrita simulada');
      }
      original.call(this, key, value);
    };
  });
  await page.goto('/login');
  await page.getByRole('button', { name: 'Entrar como Gestor' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await page.getByRole('button', { name: 'Entrar como Gestor' }).click();
  await expect(page.getByRole('heading', { name: 'Olá, Gestor.' })).toBeVisible();
});

test('falha ao sair preserva a sessão até a saída bem-sucedida', async ({ page }) => {
  await page.addInitScript(() => {
    // oxlint-disable-next-line typescript/unbound-method
    const original = Storage.prototype.removeItem;
    let first = true;
    Storage.prototype.removeItem = function(key) {
      if (key === 'centraliza.demo.session' && first) {
        first = false;
        throw new Error('Falha de saída simulada');
      }
      original.call(this, key);
    };
  });
  await page.goto('/login');
  await page.getByRole('button', { name: 'Entrar como Inspetor' }).click();
  await page.getByRole('button', { name: 'Sair da demonstração' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByRole('heading', { name: 'Olá, Inspetor.' })).toBeVisible();
  await page.getByRole('button', { name: 'Sair da demonstração' }).click();
  await expect(page).toHaveURL('/login');
});

test('carregamento é anunciado antes da escolha de perfil', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-05T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-09-05T12:00:01Z'));
  await page.goto('/login');
  await expect(page.getByRole('status')).toHaveText('Preparando seu espaço de trabalho…');
  // Retoma também os timers criados pela hidratação após a primeira renderização.
  await page.clock.resume();
  await expect(page.getByRole('button', { name: 'Entrar como Gestor' })).toBeVisible();
  await expect(page.getByRole('status')).toHaveCount(0);
});

test('atalho de conteúdo funciona por teclado com foco visível', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Entrar como Gestor' }).click();
  await expect(page.locator('#conteudo')).toBeFocused();
  // Percorre a navegação anterior ao conteúdo até chegar ao atalho inicial.
  for (let step = 0; step < 9; step++) {
    await page.keyboard.press('Shift+Tab');
    if (await page.getByRole('link', { name: 'Pular para o conteúdo' }).evaluate(node => node === document.activeElement)) break;
  }
  const skip = page.getByRole('link', { name: 'Pular para o conteúdo' });
  await expect(skip).toBeFocused();
  await expect(skip).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Enter');
  await expect(page.locator('#conteudo')).toBeFocused();
});
