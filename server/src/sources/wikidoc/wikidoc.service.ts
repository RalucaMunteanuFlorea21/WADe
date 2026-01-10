import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import * as cheerio from 'cheerio';

export interface WikidocPage {
  url: string;
  overview: string | null;
  prevention: string[]; // keep it as a list; easy to render in UI
}

@Injectable()
export class WikidocService {
  constructor(private readonly config: ConfigService) {}

  async getConditionPage(conditionName?: string | null): Promise<WikidocPage> {
    const base = this.config.get<string>('WIKIDOC_BASE') ?? 'https://www.wikidoc.org/index.php/';
    const safeName =
      (conditionName ?? '').trim().replace(/\s+/g, '_');

    // If we don’t have a name yet, return “empty” (backend will handle it)
    if (!safeName) {
      return { url: base, overview: null, prevention: [] };
    }

    const url = `${base}${encodeURIComponent(safeName)}`;

    const htmlRes = await axios.get(url, {
      headers: { 'User-Agent': 'HealthScope/1.0 (student project)' },
      timeout: 15000,
    });

    const $ = cheerio.load(htmlRes.data);

    const overview = this.extractSectionText($, ['Overview', 'overview']);
    const preventionItems = this.extractSectionList($, ['Prevention', 'prevention']);

    return {
      url,
      overview: overview || null,
      prevention: preventionItems,
    };
  }

  // Finds a section heading (span#Overview or heading text) and collects paragraph text until next heading
  private extractSectionText($: cheerio.CheerioAPI, ids: string[]): string {
    const anchor = this.findSectionAnchor($, ids);
    if (!anchor) return '';

    const texts: string[] = [];
    let node = anchor.parent();

    // Walk forward until another major heading appears
    while (node.length) {
      node = node.next();
      if (!node.length) break;

      const tag = (node.get(0) as any)?.tagName?.toLowerCase?.();
      if (tag === 'h2' || tag === 'h3') break;

      if (tag === 'p') {
        const t = node.text().replace(/\s+/g, ' ').trim();
        if (t) texts.push(t);
      }
    }

    return texts.join('\n\n').trim();
  }

  // Same, but prefers bullet lists (<li>) for sections like Prevention
  private extractSectionList($: cheerio.CheerioAPI, ids: string[]): string[] {
    const anchor = this.findSectionAnchor($, ids);
    if (!anchor) return [];

    let node = anchor.parent();
    while (node.length) {
      node = node.next();
      if (!node.length) break;

      const tag = (node.get(0) as any)?.tagName?.toLowerCase?.();
      if (tag === 'h2' || tag === 'h3') break;

      if (tag === 'ul' || tag === 'ol') {
        const items: string[] = [];
        node.find('li').each((_, li) => {
          const t = $(li).text().replace(/\s+/g, ' ').trim();
          if (t) items.push(t);
        });
        return items;
      }
    }
    return [];
  }

  private findSectionAnchor($: cheerio.CheerioAPI, ids: string[]): cheerio.Cheerio<any> | null {
    for (const id of ids) {
      const byId = $(`span#${id}`);
      if (byId.length) return byId;
    }
    // fallback: try matching heading text
    for (const id of ids) {
      const heading = $('h2, h3').filter((_, el) => $(el).text().trim().toLowerCase() === id.toLowerCase());
      if (heading.length) return heading.first();
    }
    return null;
  }
}
