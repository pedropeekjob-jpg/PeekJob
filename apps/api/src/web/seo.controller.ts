import { Controller, Get, Header, Inject } from '@nestjs/common';
import { PRIVATE_WEB_PREFIXES, SITEMAP_STATIC } from '@peekjob/shared';
import { Pool } from 'pg';
import { webOrigin } from '../common/config';
import { PG_POOL } from '../db/db.module';

const xml = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);

/** Para o Google Search Console: robots.txt e sitemap.xml com as organizações ativas */
@Controller()
export class SeoController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Get('robots.txt')
  @Header('content-type', 'text/plain; charset=utf-8')
  @Header('cache-control', 'public, max-age=3600')
  robots() {
    const lines = ['User-agent: *', 'Allow: /', ...PRIVATE_WEB_PREFIXES.map((p) => `Disallow: ${p}`), 'Disallow: /org/*/denunciar/', '', `Sitemap: ${webOrigin()}/sitemap.xml`, ''];
    return lines.join('\n');
  }

  @Get('sitemap.xml')
  @Header('content-type', 'application/xml; charset=utf-8')
  @Header('cache-control', 'public, max-age=3600')
  async sitemap() {
    const origin = webOrigin();
    const { rows } = await this.pool.query<{ id: string; lastmod: Date }>(
      `SELECT o.id, GREATEST(COALESCE(o.activated_at, o.created_at), COALESCE(MAX(r.created_at), o.created_at)) AS lastmod
         FROM organizations o LEFT JOIN reviews r ON r.org_id = o.id AND r.status = 'published'
        WHERE o.status = 'active'
        GROUP BY o.id ORDER BY lastmod DESC LIMIT 45000`,
    );
    const urls = [
      ...SITEMAP_STATIC.map((p) => `<url><loc>${xml(origin + p)}</loc></url>`),
      ...rows.map((r) => `<url><loc>${xml(`${origin}/org/${r.id}`)}</loc><lastmod>${new Date(r.lastmod).toISOString().slice(0, 10)}</lastmod></url>`),
    ];
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  }
}
