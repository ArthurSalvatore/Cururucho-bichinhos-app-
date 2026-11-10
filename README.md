# 🐾 Bichinhos

Um pet virtual em pixel art feito para dar de presente. A pessoa coloca o nome, escolhe um entre seis bichinhos e passa a cuidar dele todo dia: alimentar, brincar, fazer carinho e cutucar. Em troca, ele conversa, faz perguntas sobre memórias que vocês têm juntos, guarda um diário e ganha coisas novas conforme os dias passam.

É um app web instalável (PWA) num arquivo HTML só, sem framework e sem build. Login, sincronização e notificações usam o Supabase, mas são opcionais.

![Casas dos seis bichinhos](docs/casas.png)

## Os bichinhos

| | Personalidade | Item exclusivo | Presente dos 15 dias | Minijogo |
|---|---|---|---|---|
| 🦜 **Canobio** | cacatua branca e dourada, fala gíria, ama rolê | Skate | Capacete de moto | Batida 🎵 (ritmo) |
| 🐈‍⬛ **Skeleton** | gato preto com cara de caveira, gamer, sem filtro | Drink | Quadro "MOV LÍDER" | Caça-bug 🐛 |
| 🦎 **Mandra** | salamandra marombeira, muda de tamanho conforme a energia | Pesos | Barra de academia | Série 🏋️ (timing) |
| 🫏 **Toby** | burrinho tristinho que precisa de carinho | Bola de futebol | Pelúcia dele mesmo | Pênalti ⚽ |
| 🦉 **Larth** | coruja de amigurumi, com saudade, quer passear | Relógio | Varinha mágica | Passeio 🦉 (pulo) |
| 🐇 **Onub** | coelho gordinho, com sono e com fome, tira cochilos de 10 min | Notebook | Guitarra | Doces 🧁 |

Cada pet tem casa, cores do menu, nomes dos botões, nomes das barras e jeito de falar próprios. Dá pra comprar o item de outro pet, e aí ele reage do jeito dele: *"Vish, isso não é meu não, mas obrigado pelo presente."*

![Escolha do pet](docs/escolha.png)

## O que tem

- **Cuidado diário** com quatro barras e uma ação de cada tipo por dia, pra ninguém ficar "farmando".
- **Loja punitiva:** você paga com as barras do pet, e o que for gasto fica bloqueado por 72 horas.
- **Minijogos de 20 segundos**, um por personalidade.
- **Marcos:** com 15 dias, cada pet ganha um item especial. Com 30 dias, abre o jardim com a cara dele e uma loja "Pra fora" (balanço, rede, churrasqueira, piscina, canteiro e fogueira).
- **Perguntas de memória** feitas no meio da conversa ("ele quer saber: lembra como a gente se conheceu?"), que ficam salvas no diário.
- **Diário, álbum de momentos, selos e guarda-roupa** com 3 variações de cor por pet.
- **Agenda:** aniversário, datas com contagem regressiva e aviso no dia. Natal, ano novo e aniversário mudam a decoração da casa.
- **Tempo real:** clima e hora de onde a pessoa está (Open-Meteo) mudam a janela e o jardim.
- **Tela cheia** e casa de ponta a ponta no celular.
- **Painel de admin** (`admin.html`) para mandar recado, cartinha ou presente para uma pessoa ou para todas, e ler os diários.

![Minijogos](docs/minijogos.png)
![Jardins dos 30 dias](docs/jardins.png)

## Estrutura

```
index.html                  o app inteiro (HTML + CSS + JS, pixel art desenhada em canvas)
admin.html                  painel de quem deu o presente
sw.js                       service worker (offline + notificações)
manifest.webmanifest        dados para instalar como app
config.example.js           modelo de configuração (copie para config.js)
icons/                      ícones do app
tools/gerar-chaves.html     gera as chaves das notificações no seu navegador
supabase/schema.sql         tabelas, regras de segurança (RLS) e admin
supabase/cron.sql           lembrete diário de saudade (20h)
supabase/cron-eventos.sql   avisos da agenda e aniversários (9h)
supabase/functions/push/    Edge Function que envia as notificações (Web Push)
```

Todos os sprites são matrizes de texto desenhadas pixel a pixel no `<canvas>`. Não tem nenhuma imagem de personagem no projeto.

## Rodar localmente

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

Sem o `config.js`, o app funciona só neste aparelho (salva no `localStorage`), sem login, recados e notificações.

## Colocar no ar com login e notificações

1. **Supabase:** crie um projeto em supabase.com.
2. **Banco:** no **SQL Editor**, rode o `supabase/schema.sql`, trocando antes `seu-email@exemplo.com` pelo e-mail de quem vai ser admin.
3. **Login:** em **Authentication → Sign In / Providers → Email**, desligue **Confirm email**.
4. **Chaves:** abra `tools/gerar-chaves.html` e gere `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `CRON_SECRET`.
5. **Função:** em **Edge Functions**, crie a função `push` com o código de `supabase/functions/push/index.ts`. Desligue **Verify JWT** e cadastre os Secrets `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:seu-email`) e `CRON_SECRET`.
6. **Avisos automáticos:** rode `supabase/cron.sql` e `supabase/cron-eventos.sql`, trocando `SEU-PROJETO` pelo código do projeto e `SEU-CRON-SECRET` pelo segredo.
7. **Configuração:** copie `config.example.js` para `config.js` e preencha a URL do projeto, a chave **publishable** e a `VAPID_PUBLIC_KEY`.
8. **Publicar:** suba a pasta em qualquer hospedagem estática (Netlify, Vercel, GitHub Pages) e coloque o link em **Authentication → URL Configuration → Site URL**.

> 🔒 O `config.js` está no `.gitignore`. Nele só entram chaves **públicas**. A `service_role`/secret key, a `VAPID_PRIVATE_KEY` e o `CRON_SECRET` ficam só nos Secrets do Supabase.

Para testar datas especiais sem esperar: `index.html#tema-natal`, `#tema-anonovo` ou `#tema-aniversario`.

## Privacidade

Quem deu o presente (admin) consegue ler as respostas de memória pelo painel. O app avisa isso na tela de entrada e nos termos de uso.

## Créditos

Ideia, personagens e direção criativa: **Arth**. Código e pixel art feitos em parceria com o Claude (Anthropic).

Fontes: Pixelify Sans e VT323 (Google Fonts). Clima: Open-Meteo. Cidade: BigDataCloud.
