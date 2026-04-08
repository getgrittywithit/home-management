// MED-TOGGLE-2: Pause Focalin + Clonidine for Amos and Wyatt
// Run: node scripts/pause-meds.mjs
// Requires: NEXT_PUBLIC_BASE_URL or defaults to http://localhost:3000

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

async function pauseMeds() {
  console.log('Pausing medications for Amos and Wyatt...')
  const res = await fetch(`${BASE}/api/med-toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'bulk_pause',
      items: [
        { kid_name: 'amos', med_key: 'am', med_label: 'Focalin (morning dose)', reason: 'Insurance denial, awaiting re-approval' },
        { kid_name: 'amos', med_key: 'pm', med_label: 'Clonidine (evening dose)', reason: 'Insurance denial, awaiting re-approval' },
        { kid_name: 'wyatt', med_key: 'am', med_label: 'Focalin (morning dose)', reason: 'Insurance denial, awaiting re-approval' },
        { kid_name: 'wyatt', med_key: 'pm', med_label: 'Clonidine (evening dose)', reason: 'Insurance denial, awaiting re-approval' },
      ],
    }),
  })
  const json = await res.json()
  console.log('Result:', json)
  if (json.success) {
    console.log('✅ All 4 medications paused:')
    console.log('  - Amos: Focalin ⏸️, Clonidine ⏸️')
    console.log('  - Wyatt: Focalin ⏸️, Clonidine ⏸️')
    console.log('To resume, POST to /api/med-toggle with action: "resume"')
  }
}

pauseMeds().catch(e => console.error('Failed:', e))
