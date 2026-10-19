// Dépense et leads Meta par jour, tous comptes confondus.
const env = process.env;
const LEAD_ACTIONS = (env.META_LEAD_ACTION || 'lead').split(',').map(s => s.trim()).filter(Boolean);
const VERSION = env.META_API_VERSION || 'v23.0';

async function insights(id, since, until, daily) {
  const params = { fields: 'spend,actions', level: 'account', limit: '100',
    time_range: JSON.stringify({ since, until }), access_token: env.META_ACCESS_TOKEN };
  if (daily) params.time_increment = '1';
  let url = `https://graph.facebook.com/${VERSION}/${id}/insights?` + new URLSearchParams(params);
  const rows = [];
  while (url) {
    const j = await (await fetch(url)).json();
    if (j.error) throw new Error(j.error.message);
    rows.push(...(j.data || []));
    url = j.paging?.next || null;
  }
  return rows;
}

export async function getMeta(since, until, warnings) {
  if (!env.META_ACCESS_TOKEN) throw new Error('META_ACCESS_TOKEN manquant');
  const ids = (env.META_AD_ACCOUNT_IDS || '').split(',').map(s => s.trim()).filter(Boolean)
    .map(id => id.startsWith('act_') ? id : 'act_' + id);
  if (!ids.length) throw new Error('META_AD_ACCOUNT_IDS manquant');
  const byDay = {}, seen = {};
  let failed = 0;
  const accounts = await Promise.all(ids.map(async id => {
    let rows;
    try {
      rows = await insights(id, since, until, true);
    } catch (e1) {
      // Meta renvoie parfois une erreur sur un compte sans diffusion : on vérifie sans découpage par jour.
      try {
        const total = await insights(id, since, until, false);
        if (!total.length || !Number(total[0].spend)) return { id, spend: 0, leads: 0, inactive: true };
        rows = await insights(id, since, until, true);
      } catch (e2) {
        failed++;
        warnings.push(`Compte Meta ${id} ignoré (${e2.message}) : sa dépense n'est pas comptée.`);
        return { id, spend: 0, leads: 0, failed: true };
      }
    }
    let spend = 0, leads = 0;
    for (const row of rows) {
      const s = Number(row.spend) || 0;
      for (const a of row.actions || []) seen[a.action_type] = (seen[a.action_type] || 0) + Number(a.value || 0);
      const l = Number(LEAD_ACTIONS.map(t => (row.actions || []).find(a => a.action_type === t)).find(Boolean)?.value) || 0;
      spend += s; leads += l;
      const d = (byDay[row.date_start] ??= { date: row.date_start, spend: 0, leads: 0 });
      d.spend += s; d.leads += l;
    }
    return { id, spend, leads, inactive: spend === 0 };
  }));
  if (failed === ids.length) throw new Error(warnings.at(-1) || 'Aucun compte Meta n\'a répondu');
  const daily = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({ ...d, cpl: d.leads ? d.spend / d.leads : null }));
  const spend = accounts.reduce((a, x) => a + x.spend, 0);
  const leads = accounts.reduce((a, x) => a + x.leads, 0);
  if (spend > 0 && !leads) warnings.push(`Aucune conversion « ${LEAD_ACTIONS.join(' / ')} » chez Meta. Événements disponibles : ${Object.entries(seen).map(([k, v]) => `${k} (${v})`).join(', ') || 'aucun'}`);
  return { spend, leads, cplMeta: leads ? spend / leads : null, accounts, daily };
}
