export const resolveAdminEmail = (username, adminEmails, aliases = []) => {
  const login = username.trim().toLowerCase();
  const emails = adminEmails.map(email => email.trim().toLowerCase());
  if (emails.includes(login)) return login;
  if (aliases.some(alias => alias.trim().toLowerCase() === login)) return emails[0] || '';
  return '';
};
