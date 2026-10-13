import { baseHeaders, htmlCsp } from '../../src/security/headers';

describe('cabeçalhos de segurança por ambiente', () => {
  it('produção: HSTS de um ano e upgrade-insecure-requests', () => {
    expect(baseHeaders('production')['strict-transport-security']).toBe('max-age=31536000; includeSubDomains');
    expect(htmlCsp('production')).toContain('upgrade-insecure-requests');
  });
  it('UAT e local: sem HSTS (o domínio de testes pode mudar)', () => {
    expect(baseHeaders('uat')['strict-transport-security']).toBeUndefined();
    expect(baseHeaders('development')['strict-transport-security']).toBeUndefined();
    expect(htmlCsp('development')).not.toContain('upgrade-insecure-requests');
  });
});
