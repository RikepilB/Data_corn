// SI-assisted (Claude Code); reviewed by <name>
import { describe, expect, it } from 'vitest';
import { loadReport } from './reports';
import { TOOLS, runTool } from './tools';
import { shippedReports } from './testKit';

const loaded = await loadReport(shippedReports, 'hamilton-ne', 'none');
if (!loaded.ok) throw new Error('shipped report did not load');
const report = loaded.loaded;
const run = (name: string, args: unknown = {}, units: 'imperial' | 'metric' = 'imperial', locale: 'en' | 'es' = 'en') =>
  JSON.parse(runTool(name, JSON.stringify(args), report, { locale, units }));

describe('chat tools', () => {
  it('answers every declared tool without an error', () => {
    for (const tool of TOOLS) {
      const args = tool.name === 'get_indicator' ? { id: 'flowering_water' } : tool.name === 'get_method' ? { topic: 'overview' } : {};
      expect(run(tool.name, args).error, tool.name).toBeUndefined();
    }
  });

  it('gives the summary in the person’s language', () => {
    expect(run('get_summary').overall_level).toBe('High');
    expect(run('get_summary', {}, 'imperial', 'es').overall_level).toBe('Alto');
  });

  it('gives depths in the person’s units, as the engine computed them', () => {
    const first = report.report.runs[0]!;
    expect(run('get_seasons', {}, 'metric').seasons[0].water_short_around_silking).toBe(`${Math.round(first.flowering_deficit_mm)} mm`);
    expect(run('get_seasons', {}, 'imperial').seasons[0].water_short_around_silking).toMatch(/ in$/);
  });

  it('lists every irrigation computed in advance', () => {
    expect(run('compare_irrigation').options).toHaveLength(4);
  });

  it('turns bad input into an error result, never an exception', () => {
    expect(JSON.parse(runTool('get_indicator', '{', report, { locale: 'en', units: 'metric' }))).toEqual({ error: 'bad_arguments' });
    expect(run('get_indicator', { id: 'nope' })).toEqual({ error: 'not_in_report' });
    expect(run('get_method', { topic: 'nope' }).error).toBe('unknown_topic');
    expect(run('rm_rf')).toEqual({ error: 'unknown_tool' });
  });
});
