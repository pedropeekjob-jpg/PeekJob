import { webOrigin } from '../../src/common/config';

describe('Endereço da web (para os links dos emails)', () => {
  it('usa WEB_ORIGIN (o primeiro, sem barra final)', () => {
    expect(webOrigin({ WEB_ORIGIN: 'https://peekjob.pt/,https://www.peekjob.pt' })).toBe('https://peekjob.pt');
  });
  it('no Render, sem WEB_ORIGIN, usa o endereço público do serviço', () => {
    expect(webOrigin({ RENDER_EXTERNAL_URL: 'https://peekjob.onrender.com' })).toBe('https://peekjob.onrender.com');
  });
  it('localmente usa o Vite', () => {
    expect(webOrigin({})).toBe('http://localhost:5173');
  });
});
