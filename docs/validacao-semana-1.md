# Validação técnica — semana 1

Data: 05/09/2026. Ambiente: Windows, Microsoft Edge e servidor local do projeto.

## Resultado

12 testes de navegador aprovados. Lint da aplicação, checagem TypeScript e
build aprovados. O Graphify foi atualizado após as alterações de código.

| Área | Evidência |
| --- | --- |
| Navegação | Cinco páginas, item ativo, atualização e histórico voltar/avançar |
| Perfis | Entrada de Gestor e Inspetor, identificação e saída |
| Guards | Todas as páginas privadas redirecionam sem sessão válida |
| Erros | Rota inexistente e recuperação de falhas de leitura, gravação e remoção da sessão |
| Carregamento | Estado anunciado antes da seleção de perfil, com relógio controlado no teste |
| Teclado | Enter/Escape no menu, retorno do foco, foco no conteúdo e atalho para pular o menu |
| Responsividade | Ausência de rolagem horizontal em 390 e 1366 px nas seis páginas |
| Acessibilidade | Axe sem violações nas regras selecionadas (`wcag2a`, `wcag2aa`, `wcag21aa`) nas seis páginas e duas larguras |

## Inspeção visual

Capturas de Login, Home e Demandas foram inspecionadas em celular e desktop:
sem sobreposição, texto cortado ou desalinhamento impeditivo. A borda ocre
ao redor do conteúdo indica foco de teclado.

| Tela | Celular | Desktop |
| --- | --- | --- |
| Login | [390 px](evidencias/semana-1/login-390.png) | [1366 px](evidencias/semana-1/login-1366.png) |
| Home | [390 px](evidencias/semana-1/home-390.png) | [1366 px](evidencias/semana-1/home-1366.png) |
| Demandas | [390 px](evidencias/semana-1/demandas-390.png) | [1366 px](evidencias/semana-1/demandas-1366.png) |

Os testes de acessibilidade geram novas capturas em `frontend/test-results`.
As imagens desta pasta de documentação registram a entrega revisada.

## Reproduzir

Dentro de `frontend`:

```powershell
npm ci
npm run lint
npm run typecheck
npm run build
npm test
```

O Playwright inicia e encerra o servidor automaticamente e usa o Edge instalado.
No ambiente restrito do Codex, o encerramento de processos no Windows pode
exigir permissão adicional. A execução final terminou normalmente.

## Limites e pendências para o uso institucional

- A análise automática não substitui testes com leitores de tela, pessoas
  com deficiência ou a aceitação da equipe VISAT.
- A sessão é fictícia e local à aba. Não há API Python, banco ou operações reais.
- O npm informou 11 alertas de dependências na instalação (1 baixo, 2 moderados
  e 8 altos). A exposição de cada alerta ainda precisa ser analisada; esta
  revisão de navegação não é uma auditoria de segurança nem libera uso real.
- O link hospedado ainda corresponde à versão inicial. Este relatório valida
  o código local atualizado, sem afirmar nova publicação.
