import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import * as cheerio from 'cheerio';
import { dump, logger } from '../../utils/log';

export interface WikidocPage {
  url: string;
  overview: string | null;
  symptoms: string[];
  riskFactors: string[];
  prevention: string[]; // keep it as a list; easy to render in UI
}

@Injectable()
export class WikidocService {
  constructor(private readonly config: ConfigService) {}

  async getConditionPage(conditionName?: string | null): Promise<WikidocPage> {
    const base = this.config.get<string>('WIKIDOC_BASE') ?? 'https://www.wikidoc.org/index.php/';
    const baseName = (conditionName ?? '').trim();

    if (!baseName) return { url: base, overview: null, symptoms: [], riskFactors: [], prevention: [] };

    const candidates = new Set<string>();
    candidates.add(baseName.replace(/\s+/g, '_'));
    candidates.add(baseName.replace(/\s+/g, '%20'));
    candidates.add(baseName.toLowerCase().replace(/\s+/g, '_'));
    candidates.add(baseName.split(' ').map(s => s[0]?.toUpperCase() + s.slice(1)).join('_'));
    // Add generic fallbacks: last word, first word
    const words = baseName.split(/\s+/).filter(Boolean);
    if (words.length > 1) {
      candidates.add(words[words.length - 1]);
      candidates.add(words[0]);
    }

    for (const cand of Array.from(candidates)) {
      const url = `${base}${cand}`;
      try {
        const htmlRes = await axios.get(url, {
          headers: { 'User-Agent': 'HealthScope/1.0 (student project)' },
          timeout: 15000,
        });
        logger('[WikiDoc] fetched', url, 'status', htmlRes.status);
        const $ = cheerio.load(htmlRes.data);
        const overview = this.extractSectionText($, ['Overview', 'overview', 'Definition']);
        const symptoms = this.extractSectionList($, ['Symptoms', 'symptoms', 'Clinical Manifestations', 'Presentation']);
        const riskFactors = this.extractSectionList($, ['Risk Factors', 'risk factors', 'Etiology', 'Causes']);
        const prevention = this.extractSectionList($, ['Prevention', 'prevention', 'Prophylaxis']);
        
        if ((overview && overview.trim().length) || symptoms.length || riskFactors.length || prevention.length) {
          logger('[WikiDoc] extracted overview length', (overview || '').length, 'symptoms', symptoms.length, 'riskFactors', riskFactors.length, 'prevention', prevention.length);
          return { url, overview: overview || null, symptoms, riskFactors, prevention };
        }
      } catch (e) {
        logger('[WikiDoc] candidate failed', url, e);
        // try next candidate
      }
    }

    // Fallback: no page found
    return { url: base, overview: null, symptoms: [], riskFactors: [], prevention: [] };
  }

  // Finds a section heading and collects paragraph text until next heading
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
      if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4') break;

      if (tag === 'p') {
        const t = node.text().replace(/\s+/g, ' ').trim();
        if (t) texts.push(t);
      }
    }

    return texts.join('\n\n').trim();
  }

  // Extracts list items from various structures (ul/ol, or lines of text)
  private extractSectionList($: cheerio.CheerioAPI, ids: string[]): string[] {
    const anchor = this.findSectionAnchor($, ids);
    if (!anchor) return [];

    const items: string[] = [];
    let node = anchor.parent();
    let foundList = false;

    // Walk forward until another major heading appears
    while (node.length) {
      node = node.next();
      if (!node.length) break;

      const tag = (node.get(0) as any)?.tagName?.toLowerCase?.();
      if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4') break;

      // First priority: structured lists (ul/ol)
      if (tag === 'ul' || tag === 'ol') {
        foundList = true;
        node.find('li').each((_, li) => {
          const t = $(li).text().replace(/\s+/g, ' ').trim();
          if (t && !items.includes(t)) items.push(t);
        });
      }

      // Fallback: extract bullet points from paragraphs
      if (!foundList && tag === 'p') {
        const text = node.text().replace(/\s+/g, ' ').trim();
        // Look for bullet-like patterns or medical terms
        if (text.length > 10 && text.length < 500) {
          // Check if it looks like a list item (starts with bullet, dash, or number)
          if (/^[\s•\-\*\d\.]+/.test(text) || text.includes(':')) {
            const cleaned = text.replace(/^[\s•\-\*\d\.]+\s*/, '').trim();
            if (cleaned && !items.includes(cleaned)) {
              items.push(cleaned);
            }
          } else if (items.length === 0 && !text.toLowerCase().includes('see also')) {
            // If no structured list found yet, accept short descriptive paragraphs
            if (!items.includes(text)) items.push(text);
          }
        }
      }
    }

    return items;
  }

  private findSectionAnchor($: cheerio.CheerioAPI, ids: string[]): cheerio.Cheerio<any> | null {
    // Try all heading levels (h1-h6)
    for (const id of ids) {
      // First try span with id
      const byId = $(`span#${id}`);
      if (byId.length) return byId;

      // Try all heading levels with exact or partial match
      const heading = $('h1, h2, h3, h4, h5, h6').filter((_, el) => {
        const text = $(el).text().trim().toLowerCase();
        const idLower = id.toLowerCase();
        return text === idLower || text.includes(idLower) || idLower.includes(text.split(' ')[0]);
      });
      if (heading.length) {
        logger('[WikiDoc] found section', id, 'in heading');
        return heading.first();
      }
    }

    // Try matching within bold or strong tags (sometimes used for section headers)
    for (const id of ids) {
      const strong = $('strong, b').filter((_, el) => {
        const text = $(el).text().trim().toLowerCase();
        const idLower = id.toLowerCase();
        return text === idLower || text.includes(idLower);
      });
      if (strong.length) {
        logger('[WikiDoc] found section', id, 'in strong tag');
        return strong.first();
      }
    }

    return null;
  }
}
