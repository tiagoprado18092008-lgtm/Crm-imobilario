const base = (body: string) => `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body{margin:0;padding:0;background:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif;}
  .wrap{max-width:560px;margin:40px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);}
  .header{background:#0f2553;padding:32px 40px;text-align:center;}
  .header img{height:40px;}
  .header h1{color:#d4a843;margin:12px 0 0;font-size:22px;letter-spacing:.5px;}
  .body{padding:36px 40px;color:#222;}
  .body p{line-height:1.7;margin:0 0 16px;}
  .btn{display:inline-block;margin:20px 0;padding:14px 32px;background:#d4a843;color:#0f2553;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px;}
  .footer{background:#f4f6fb;text-align:center;padding:20px;font-size:12px;color:#888;}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>CasaFlow</h1>
  </div>
  <div class="body">${body}</div>
  <div class="footer">CasaFlow — Plataforma de Gestão Imobiliária<br/>Este email foi enviado automaticamente. Por favor não responda a esta mensagem.</div>
</div>
</body>
</html>`;

export function inviteOwnerTemplate(opts: {
  agencyName: string;
  inviteUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `Convite para gerir a agência "${opts.agencyName}" no CasaFlow`,
    html: base(`
      <p>Olá,</p>
      <p>Foi convidado(a) para ser <strong>proprietário(a) da agência "${opts.agencyName}"</strong> na plataforma CasaFlow.</p>
      <p>Clique no botão abaixo para aceitar o convite e criar a sua conta:</p>
      <p style="text-align:center"><a class="btn" href="${opts.inviteUrl}">Aceitar Convite</a></p>
      <p>Este link é válido por <strong>7 dias</strong>. Se não estava à espera deste convite, pode ignorar este email.</p>
    `),
  };
}

export function inviteConsultantTemplate(opts: {
  agencyName: string;
  inviterName: string;
  inviteUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `${opts.inviterName} convidou-o(a) para a equipa ${opts.agencyName} no CasaFlow`,
    html: base(`
      <p>Olá,</p>
      <p><strong>${opts.inviterName}</strong> convidou-o(a) para se juntar à equipa <strong>${opts.agencyName}</strong> como consultor(a) no CasaFlow.</p>
      <p>Clique no botão abaixo para aceitar o convite e criar a sua conta:</p>
      <p style="text-align:center"><a class="btn" href="${opts.inviteUrl}">Aceitar Convite</a></p>
      <p>Este link é válido por <strong>7 dias</strong>. Se não estava à espera deste convite, pode ignorar este email.</p>
    `),
  };
}

export function accountActivatedTemplate(opts: {
  name: string;
  loginUrl: string;
}): { subject: string; html: string } {
  return {
    subject: 'A sua conta CasaFlow está activa',
    html: base(`
      <p>Olá, <strong>${opts.name}</strong>!</p>
      <p>A sua conta foi criada e activada com sucesso. Pode agora iniciar sessão na plataforma CasaFlow.</p>
      <p style="text-align:center"><a class="btn" href="${opts.loginUrl}">Iniciar Sessão</a></p>
    `),
  };
}
