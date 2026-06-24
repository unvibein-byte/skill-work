import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const p = path.join(__dirname, '../src/screens/tabs/SettingTab.jsx');
let s = fs.readFileSync(p, 'utf8');

const from = s.indexOf("            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>");
const end = s.indexOf(
  "            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', borderRadius:12, background:'rgba(127,86,217,0.08)', marginBottom:16 }}>",
  from
);

if (from < 0 || end < 0) {
  console.error('markers not found', { from, end });
  process.exit(1);
}

const block = `            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
              <__OPEN__ style={{ padding:'12px 14px', borderRadius:12, background:'var(--green-light)', border:'1px solid var(--green-border)' }}>
                <__OPEN__ style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:4 }}>Wallet (available)</__CLOSE__>
                <__OPEN__ style={{ fontSize:20, fontWeight:900, color:'var(--green)', fontFamily:'var(--font-display)' }}>₹{walletBalance.toFixed(2)}</__CLOSE__>
              </__CLOSE__>
              <__OPEN__ style={{ padding:'12px 14px', borderRadius:12, background:'rgba(67,97,238,0.08)', border:'1px solid rgba(67,97,238,0.2)' }}>
                <__OPEN__ style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:4 }}>Total earned</__CLOSE__>
                <__OPEN__ style={{ fontSize:20, fontWeight:900, color:'#4361ee', fontFamily:'var(--font-display)' }}>₹{totalEarned.toFixed(2)}</__CLOSE__>
              </__CLOSE__>
            </__CLOSE__>

`.replace(/<__OPEN__/g, '<div').replace(/<\/__CLOSE__>/g, '</div>');

s = s.slice(0, from) + block + s.slice(end);
s = s.replace(
  'Manage your wallet balance and control whether premium upgrades are allowed.',
  'Wallet updates automatically from tasks and withdrawals. Premium toggle is below.'
);

fs.writeFileSync(p, s);
console.log('Patched SettingTab wallet UI');
