import fs from 'fs';

const p = 'd:/website/skill-work/src/screens/tabs/SettingTab.jsx';
let s = fs.readFileSync(p, 'utf8');

const start = s.indexOf("            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>");
const end = s.indexOf(
  "            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', borderRadius:12, background:'rgba(127,86,217,0.08)', marginBottom:16 }}>",
  start
);

if (start === -1 || end === -1) {
  console.error('markers not found', { start, end });
  process.exit(1);
}

const block = [
  "            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>",
  "              <motion.div style={{ padding:'12px 14px', borderRadius:12, background:'var(--green-light)', border:'1px solid var(--green-border)' }}>",
  "                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:4 }}>Wallet (available)</div>",
  "                <div style={{ fontSize:20, fontWeight:900, color:'var(--green)', fontFamily:'var(--font-display)' }}>₹{walletBalance.toFixed(2)}</div>",
  "              </motion.div>",
  "              <div style={{ padding:'12px 14px', borderRadius:12, background:'rgba(67,97,238,0.08)', border:'1px solid rgba(67,97,238,0.2)' }}>",
  "                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:4 }}>Total earned</div>",
  "                <div style={{ fontSize:20, fontWeight:900, color:'#4361ee', fontFamily:'var(--font-display)' }}>₹{totalEarned.toFixed(2)}</div>",
  "              </motion.div>",
  "            </motion.div>",
  '',
].join('\n').replace(/<\/?motion\.motion.div>/g, '').replace(/motion\.div/g, 'motion.div');

// Final block with only div tags
const clean = `            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
              <div style={{ padding:'12px 14px', borderRadius:12, background:'var(--green-light)', border:'1px solid var(--green-border)' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:4 }}>Wallet (available)</div>
                <div style={{ fontSize:20, fontWeight:900, color:'var(--green)', fontFamily:'var(--font-display)' }}>₹{walletBalance.toFixed(2)}</div>
              </motion.div>
              <div style={{ padding:'12px 14px', borderRadius:12, background:'rgba(67,97,238,0.08)', border:'1px solid rgba(67,97,238,0.2)' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:4 }}>Total earned</div>
                <div style={{ fontSize:20, fontWeight:900, color:'#4361ee', fontFamily:'var(--font-display)' }}>₹{totalEarned.toFixed(2)}</div>
              </motion.div>
            </motion.div>

`;

const finalBlock = clean
  .split('\n')
  .map((line) => line.replace(/<\/?motion\.div>/g, (m) => (m.includes('/') ? '</div>' : '<motion.div')).replace(/<motion\.motion.div/g, '<motion.div'))
  .join('\n');

// Manual correct block
const ok = `            <motion.div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
              <div style={{ padding:'12px 14px', borderRadius:12, background:'var(--green-light)', border:'1px solid var(--green-border)' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:4 }}>Wallet (available)</div>
                <div style={{ fontSize:20, fontWeight:900, color:'var(--green)', fontFamily:'var(--font-display)' }}>₹{walletBalance.toFixed(2)}</div>
              </motion.div>
              <div style={{ padding:'12px 14px', borderRadius:12, background:'rgba(67,97,238,0.08)', border:'1px solid rgba(67,97,238,0.2)' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:4 }}>Total earned</div>
                <div style={{ fontSize:20, fontWeight:900, color:'#4361ee', fontFamily:'var(--font-display)' }}>₹{totalEarned.toFixed(2)}</div>
              </motion.div>
            </motion.div>

`;

let out = s.slice(0, start) + ok.replace(/motion\.div/g, 'DIVTAG').replace(/<\/DIVTAG>/g, '</div>').replace(/<DIVTAG/g, '<div') + s.slice(end);
out = out.replace(
  'Manage your wallet balance and control whether premium upgrades are allowed.',
  'Wallet updates automatically from tasks and withdrawals. Premium toggle is below.'
);
fs.writeFileSync(p, out);
console.log('done');
