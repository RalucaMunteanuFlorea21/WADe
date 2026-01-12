import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import * as cheerio from 'cheerio';
import { logger } from '../../utils/log';

export interface WikidocPage {
  url: string | null;
  overview: string | null;
  symptoms: string[];
  riskFactors: string[];
  prevention: string[];
}

@Injectable()
export class WikidocService {
  constructor(private readonly config: ConfigService) {}

  private get base(): string {
    return (
      this.config.get<string>('WIKIDOC_BASE') ??
      'https://www.wikidoc.org/index.php/'
    );
  }

  private get api(): string {
    return 'https://www.wikidoc.org/api.php';
  }

  async getConditionPage(conditionName?: string | null): Promise<WikidocPage> {
    const q = (conditionName ?? '').trim();
    logger('[WikiDoc] getConditionPage called', { conditionName: q });

    if (!q) return this.empty(null);

    // 1) Resolve a real page title (avoid subpages/templates/categories)
    const resolvedTitle = await this.resolveBestTitle(q);
    if (!resolvedTitle) {
      logger('[WikiDoc] resolveBestTitle failed', { q });
      return this.empty(null);
    }

    const pageUrl = this.toPageUrl(resolvedTitle);
    logger('[WikiDoc] resolved title', { q, title: resolvedTitle, pageUrl });

    // 2) Fetch main page
    const mainHtml = await this.fetchHtml(pageUrl);
    if (!mainHtml) return this.empty(null);

    const $main = cheerio.load(mainHtml);

    // 3) Extract from main page first
    let overview = this.extractSectionText($main, [
      'Overview',
      'overview',
      'Background',
      'background',
      'Introduction',
      'introduction',
      'Definition',
      'definition',
      'Summary',
      'summary',
    ]);

    let symptoms = this.extractSectionList($main, [
      'Symptoms',
      'symptoms',
      'Clinical Manifestations',
      'Presentation',
    ]);

    let riskFactors = this.extractSectionList($main, [
      'Risk Factors',
      'risk factors',
      'Etiology',
      'Causes',
    ]);

    let prevention = this.extractSectionList($main, [
      'Prevention',
      'prevention',
      'Prophylaxis',
    ]);

    // 4) Follow subpages if needed (WikiDoc often uses *_overview etc.)
    if (!overview?.trim()) {
      const overviewUrl = this.findSubpageUrl($main, pageUrl, [
        '_overview',
        'overview',
      ]);
      logger('[WikiDoc] overview missing on main page', {
        pageUrl,
        overviewUrl,
      });

      if (overviewUrl) {
        const ovHtml = await this.fetchHtml(overviewUrl);
        if (ovHtml) {
          const $ov = cheerio.load(ovHtml);
          overview =
            this.extractLeadParagraphs($ov) ||
            this.extractSectionText($ov, [
              'Overview',
              'overview',
              'Background',
              'background',
              'Definition',
              'definition',
            ]) ||
            '';
        }
      }
    }

    if (!symptoms.length) {
      const symptomsUrl = this.findSubpageUrl($main, pageUrl, [
        '_symptoms',
        'symptoms',
        'clinical_manifestations',
        'presentation',
      ]);
      logger('[WikiDoc] symptoms missing on main page', {
        pageUrl,
        symptomsUrl,
      });

      if (symptomsUrl) {
        const sHtml = await this.fetchHtml(symptomsUrl);
        if (sHtml) {
          const $s = cheerio.load(sHtml);
          symptoms =
            this.extractAnyBulletList($s) ||
            this.extractSectionList($s, [
              'Symptoms',
              'symptoms',
              'Clinical Manifestations',
              'Presentation',
            ]) ||
            [];
        }
      }
    }

    if (!riskFactors.length) {
      const riskUrl = this.findSubpageUrl($main, pageUrl, [
        'risk',
        'risk_factors',
        '_risk_factors',
        'etiology',
        'causes',
      ]);
      logger('[WikiDoc] riskFactors missing on main page', {
        pageUrl,
        riskUrl,
      });

      if (riskUrl) {
        const rHtml = await this.fetchHtml(riskUrl);
        if (rHtml) {
          const $r = cheerio.load(rHtml);
          riskFactors =
            this.extractAnyBulletList($r) ||
            this.extractSectionList($r, [
              'Risk Factors',
              'risk factors',
              'Etiology',
              'Causes',
            ]) ||
            [];
        }
      }
    }

    if (!prevention.length) {
      const preventionUrl = this.findSubpageUrl($main, pageUrl, [
        '_prevention',
        'prevention',
        'prophylaxis',
      ]);
      logger('[WikiDoc] prevention missing on main page', {
        pageUrl,
        preventionUrl,
      });

      if (preventionUrl) {
        const pHtml = await this.fetchHtml(preventionUrl);
        if (pHtml) {
          const $p = cheerio.load(pHtml);
          prevention =
            this.extractAnyBulletList($p) ||
            this.extractSectionList($p, [
              'Prevention',
              'prevention',
              'Prophylaxis',
            ]) ||
            [];
        }
      }
    }

    const out: WikidocPage = {
      url: pageUrl,
      overview: overview?.trim() ? overview.trim() : null,
      symptoms: this.cleanList(symptoms),
      riskFactors: this.cleanList(riskFactors),
      prevention: this.cleanList(prevention),
    };

    logger('[WikiDoc] final', {
      pageUrl,
      overviewLen: (out.overview ?? '').length,
      symptoms: out.symptoms.length,
      riskFactors: out.riskFactors.length,
      prevention: out.prevention.length,
    });

    return out;
  }

  // ------------------ core helpers ------------------

  private empty(url: string | null): WikidocPage {
    return {
      url,
      overview: null,
      symptoms: [],
      riskFactors: [],
      prevention: [],
    };
  }

  private toPageUrl(title: string): string {
    // MediaWiki pages use underscores
    const t = title.trim().replace(/ /g, '_');
    return this.base + encodeURIComponent(t);
  }

  private async fetchHtml(url: string): Promise<string | null> {
    try {
      const res = await axios.get(url, {
        headers: { 'User-Agent': 'HealthScope/1.0 (student project)' },
        timeout: 15000,
      });
      return typeof res.data === 'string' ? res.data : null;
    } catch (e: any) {
      logger('[WikiDoc] fetchHtml failed', {
        url,
        error: String(e?.message ?? e),
      });
      return null;
    }
  }

  /**
   * MediaWiki search resolver with scoring:
   * - prefers exact / contains query
   * - avoids subpages like *_overview, *_diagnosis, etc.
   * - avoids Template:/Category:
   */
  private async resolveBestTitle(query: string): Promise<string | null> {
    const q = (query ?? '').trim();
    if (!q) return null;

    const UA = {
      'User-Agent': 'HealthScope/1.0 (student project)',
      Accept: 'application/json',
    };

    const normalizeTitle = (s: string) => s.trim().replace(/\s+/g, ' ');
    const toTitleCase = (s: string) =>
      s
        .toLowerCase()
        .split(' ')
        .filter(Boolean)
        .map((w) => w[0]?.toUpperCase() + w.slice(1))
        .join(' ');

    const isBadTitle = (t: string) => {
      const tl = t.toLowerCase();
      if (
        tl.startsWith('template:') ||
        tl.startsWith('category:') ||
        tl.startsWith('file:')
      )
        return true;
      // avoid subpages
      return /(_|\s)(overview|diagnosis|treatment|screening|prognosis|epidemiology|pathophysiology|classification|history|complications)$/i.test(
        tl,
      );
    };

    // 1) Try MediaWiki search
    try {
      const res = await axios.get(this.api, {
        params: {
          action: 'query',
          list: 'search',
          srsearch: q,
          srlimit: 10,
          format: 'json',
        },
        headers: UA,
        timeout: 15000,
      });

      const hits: Array<{ title: string }> = res.data?.query?.search ?? [];
      const good = hits
        .map((h) => normalizeTitle(h.title))
        .filter((t) => t && !isBadTitle(t));

      if (good.length) {
        // prefer exact match if present
        const exact = good.find((t) => t.toLowerCase() === q.toLowerCase());
        const best = exact ?? good[0];
        logger('[WikiDoc] resolveBestTitle(search) picked', {
          query: q,
          best,
          top: good.slice(0, 5),
        });
        return best;
      }
    } catch (e: any) {
      logger('[WikiDoc] resolveBestTitle(search) error', {
        query: q,
        error: String(e?.message ?? e),
      });
    }

    // 2) Try opensearch (often works when list=search returns empty)
    try {
      const res = await axios.get(this.api, {
        params: {
          action: 'opensearch',
          search: q,
          limit: 10,
          namespace: 0,
          format: 'json',
        },
        headers: UA,
        timeout: 15000,
      });

      // opensearch format: [query, [titles], [descriptions], [urls]]
      const titles: string[] = Array.isArray(res.data?.[1]) ? res.data[1] : [];
      const good = titles
        .map(normalizeTitle)
        .filter((t) => t && !isBadTitle(t));

      if (good.length) {
        const exact = good.find((t) => t.toLowerCase() === q.toLowerCase());
        const best = exact ?? good[0];
        logger('[WikiDoc] resolveBestTitle(opensearch) picked', {
          query: q,
          best,
          top: good.slice(0, 5),
        });
        return best;
      }
    } catch (e: any) {
      logger('[WikiDoc] resolveBestTitle(opensearch) error', {
        query: q,
        error: String(e?.message ?? e),
      });
    }

    // 3) Direct “does this title exist?” check (fixes hypertension-like cases)
    for (const candidate of [q, toTitleCase(q)]) {
      try {
        const res = await axios.get(this.api, {
          params: { action: 'query', titles: candidate, format: 'json' },
          headers: UA,
          timeout: 15000,
        });

        const pages = res.data?.query?.pages ?? {};
        const firstKey = Object.keys(pages)[0];
        const page = firstKey ? pages[firstKey] : null;

        if (page && !page.missing) {
          logger('[WikiDoc] resolveBestTitle(direct) picked', {
            query: q,
            best: candidate,
          });
          return candidate;
        }
      } catch (e: any) {
        // ignore and try next
      }
    }

    logger('[WikiDoc] resolveBestTitle failed', { q });
    return null;
  }

  // ------------------ extraction helpers ------------------

  /**
   * Finds a section anchor by span id or heading text (case-insensitive).
   */
  private findSectionAnchor(
    $: cheerio.CheerioAPI,
    ids: string[],
  ): cheerio.Cheerio<any> | null {
    for (const id of ids) {
      const byId = $(`span#${id.replace(/\s+/g, '_')}`);
      if (byId.length) return byId;
    }
    for (const id of ids) {
      const heading = $('h1,h2,h3,h4').filter((_, el) => {
        const text = $(el).text().trim().toLowerCase();
        const want = id.toLowerCase();
        return text === want || text.includes(want);
      });
      if (heading.length) return heading.first();
    }
    return null;
  }

  /**
   * Robust section text: anchors to closest heading then pulls paragraphs
   * from sibling blocks until next heading.
   */
  private extractSectionText($: cheerio.CheerioAPI, ids: string[]): string {
    const anchor = this.findSectionAnchor($, ids);
    if (!anchor || !anchor.length) return '';

    const heading = anchor.is('h1,h2,h3,h4')
      ? anchor
      : anchor.closest('h1,h2,h3,h4');
    if (!heading.length) return '';

    const texts: string[] = [];
    let node = heading.next();

    while (node.length) {
      const tag = (node.get(0) as any)?.tagName?.toLowerCase?.();
      if (['h1', 'h2', 'h3', 'h4'].includes(tag)) break;

      // nested paragraphs
      node.find('p').each((_, el) => {
        const t = $(el).text().replace(/\s+/g, ' ').trim();
        if (t) texts.push(t);
      });

      // fallback: meaningful block text (avoid tiny junk)
      if (!node.find('p').length) {
        const t = node.text().replace(/\s+/g, ' ').trim();
        if (t && t.length > 80) texts.push(t);
      }

      node = node.next();
    }

    return texts.join('\n\n').trim();
  }

  /**
   * Robust list extraction: after closest heading, find first ul/ol (even nested).
   */
  private extractSectionList($: cheerio.CheerioAPI, ids: string[]): string[] {
    const anchor = this.findSectionAnchor($, ids);
    if (!anchor || !anchor.length) return [];

    const heading = anchor.is('h1,h2,h3,h4')
      ? anchor
      : anchor.closest('h1,h2,h3,h4');
    if (!heading.length) return [];

    let node = heading.next();
    while (node.length) {
      const tag = (node.get(0) as any)?.tagName?.toLowerCase?.();
      if (['h1', 'h2', 'h3', 'h4'].includes(tag)) break;

      const list = node.find('ul,ol').first();
      if (list.length) {
        const items: string[] = [];
        list.find('li').each((_, li) => {
          const t = $(li).text().replace(/\s+/g, ' ').trim();
          if (t) items.push(t);
        });
        return items;
      }

      node = node.next();
    }

    return [];
  }

  /**
   * Overview subpages are often mostly narrative. Grab first ~3 substantial paragraphs.
   */
  private extractLeadParagraphs($: cheerio.CheerioAPI): string | null {
    const container = $('#mw-content-text').length
      ? $('#mw-content-text')
      : $('.mw-parser-output').length
        ? $('.mw-parser-output')
        : $('body');

    const paras: string[] = [];
    container.find('p').each((_, p) => {
      const t = $(p).text().replace(/\s+/g, ' ').trim();
      if (t && t.length > 60) paras.push(t);
      if (paras.length >= 3) return false;
      return;
    });

    const out = paras.join('\n\n').trim();
    return out ? out : null;
  }

  /**
   * For subpages that are lists-first, just take the first meaningful list.
   */
  private extractAnyBulletList($: cheerio.CheerioAPI): string[] | null {
    const root = $('#mw-content-text').length
      ? $('#mw-content-text')
      : $('.mw-parser-output').length
        ? $('.mw-parser-output')
        : $('body');

    const list = root.find('ul,ol').first();
    if (!list.length) return null;

    const items: string[] = [];
    list.find('li').each((_, li) => {
      const t = $(li).text().replace(/\s+/g, ' ').trim();
      if (t) items.push(t);
    });

    return items.length ? items : null;
  }

  /**
   * Find a subpage URL by scanning links for tokens like "_overview" etc.
   */
  private findSubpageUrl(
    $: cheerio.CheerioAPI,
    pageUrl: string,
    tokens: string[],
  ): string | null {
    const a = $('a[href]')
      .filter((_, el) => {
        const href = ($(el).attr('href') || '').toLowerCase();
        const text = ($(el).text() || '').toLowerCase();
        return tokens.some(
          (t) => href.includes(t.toLowerCase()) || text === t.toLowerCase(),
        );
      })
      .first();

    const href = a.attr('href');
    if (!href) return null;

    // Normalize relative URLs
    if (href.startsWith('http')) return href;
    if (href.startsWith('/')) return `https://www.wikidoc.org${href}`;
    if (href.startsWith('index.php/')) return `https://www.wikidoc.org/${href}`;

    try {
      return new URL(href, pageUrl).toString();
    } catch {
      return null;
    }
  }

  private cleanList(arr: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of arr || []) {
      const s = (raw ?? '').replace(/\s+/g, ' ').trim();
      if (!s) continue;
      const key = s.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(s);
      if (out.length >= 30) break;
    }
    return out;
  }
}
