/*
  CONFIGURAÇÃO DOS BICHINHOS
  1. Copie este arquivo e renomeie a cópia para config.js
  2. Preencha com os dados do SEU projeto Supabase (veja o README)
  Sem o config.js o app funciona mesmo assim, só que sem login, recados e notificações.

  Aqui só entram chaves PÚBLICAS. Nunca coloque a service_role/secret key,
  a VAPID_PRIVATE_KEY ou o CRON_SECRET neste arquivo.
*/
window.LARTH_CONFIG = {
  // Supabase → Project Settings → Data API → Project URL
  SUPABASE_URL: "",

  // Supabase → Project Settings → API Keys → chave "publishable" (ou "anon public")
  SUPABASE_KEY: "",

  // Chave PÚBLICA gerada em tools/gerar-chaves.html
  VAPID_PUBLIC_KEY: "",

  // (opcional) link de uma playlist do Spotify para os Fones e a Caixinha de som
  PLAYLIST_URL: ""
};
